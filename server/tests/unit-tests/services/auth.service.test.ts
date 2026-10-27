import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as authService from '../../../src/services/auth.service.js';
import * as authRepository from '../../../src/repositories/auth.repository.js';
import * as userRepository from '../../../src/repositories/user.repository.js';
import { buildUser, ID } from '../helpers/factories.js';

jest.mock('../../../src/repositories/auth.repository.js');
jest.mock('../../../src/repositories/user.repository.js');
jest.mock('bcrypt', () => ({
  __esModule: true,
  default: { genSalt: jest.fn(), hash: jest.fn(), compare: jest.fn() },
}));
jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: { sign: jest.fn(), verify: jest.fn() },
}));

const authRepo = jest.mocked(authRepository);
const userRepo = jest.mocked(userRepository);
const genSalt = bcrypt.genSalt as unknown as jest.Mock;
const hash = bcrypt.hash as unknown as jest.Mock;
const compare = bcrypt.compare as unknown as jest.Mock;
const sign = jwt.sign as unknown as jest.Mock;

const SECRET = 'unit-test-secret';
const SALT = '$2b$10$generatedsalt';
const HASHED = '$2b$10$hashedpasswordvalue';

describe('auth.service', () => {
  const originalSecret = process.env.SECRET;

  beforeEach(() => {
    process.env.SECRET = SECRET;
  });

  afterEach(() => {
    jest.resetAllMocks();
    process.env.SECRET = originalSecret;
  });

  describe('signUp', () => {
    it('hashes the password with a 10-round salt and returns the new user', async () => {
      const user = buildUser({ password: HASHED });
      userRepo.getUserByEmail.mockResolvedValue(null);
      userRepo.getUserByUsername.mockResolvedValue(null);
      genSalt.mockResolvedValue(SALT);
      hash.mockResolvedValue(HASHED);
      authRepo.signUp.mockResolvedValue(user);

      await expect(authService.signUp('jdoe@example.com', 'secret123', 'jdoe')).resolves.toEqual({ user });
      expect(genSalt).toHaveBeenCalledWith(10);
      expect(hash).toHaveBeenCalledWith('secret123', SALT);
      expect(authRepo.signUp).toHaveBeenCalledWith('jdoe@example.com', HASHED, 'jdoe');
    });

    it('looks up both email and username before creating the account', async () => {
      userRepo.getUserByEmail.mockResolvedValue(null);
      userRepo.getUserByUsername.mockResolvedValue(null);
      authRepo.signUp.mockResolvedValue(buildUser());

      await authService.signUp('jdoe@example.com', 'secret123', 'jdoe');

      expect(userRepo.getUserByEmail).toHaveBeenCalledWith('jdoe@example.com');
      expect(userRepo.getUserByUsername).toHaveBeenCalledWith('jdoe');
    });

    it('rejects an existing email without hashing or saving', async () => {
      userRepo.getUserByEmail.mockResolvedValue(buildUser());
      userRepo.getUserByUsername.mockResolvedValue(null);

      await expect(authService.signUp('jdoe@example.com', 'secret123', 'jdoe')).rejects.toThrow(
        'Failed to create user: Error: Email already exists',
      );
      expect(hash).not.toHaveBeenCalled();
      expect(authRepo.signUp).not.toHaveBeenCalled();
    });

    it('rejects an existing username without hashing or saving', async () => {
      userRepo.getUserByEmail.mockResolvedValue(null);
      userRepo.getUserByUsername.mockResolvedValue(buildUser());

      await expect(authService.signUp('jdoe@example.com', 'secret123', 'jdoe')).rejects.toThrow(
        'Failed to create user: Error: Username already exists',
      );
      expect(authRepo.signUp).not.toHaveBeenCalled();
    });

    it('reports the email conflict first when both email and username exist', async () => {
      userRepo.getUserByEmail.mockResolvedValue(buildUser());
      userRepo.getUserByUsername.mockResolvedValue(buildUser());

      await expect(authService.signUp('jdoe@example.com', 'secret123', 'jdoe')).rejects.toThrow('Email already exists');
    });

    it('wraps repository errors', async () => {
      userRepo.getUserByEmail.mockResolvedValue(null);
      userRepo.getUserByUsername.mockResolvedValue(null);
      authRepo.signUp.mockRejectedValue(new Error('Unique constraint failed'));

      await expect(authService.signUp('jdoe@example.com', 'secret123', 'jdoe')).rejects.toThrow(
        'Failed to create user: Error: Unique constraint failed',
      );
    });
  });

  describe('logIn', () => {
    it('returns the user and a 3-day token signed with the user id', async () => {
      const user = buildUser({ password: HASHED });
      userRepo.getUserByEmail.mockResolvedValue(user);
      compare.mockResolvedValue(true);
      sign.mockReturnValue('signed.jwt.token');

      await expect(authService.logIn('jdoe@example.com', 'secret123')).resolves.toEqual({
        user,
        token: 'signed.jwt.token',
      });
      expect(compare).toHaveBeenCalledWith('secret123', HASHED);
      expect(sign).toHaveBeenCalledWith({ id: ID }, SECRET, { expiresIn: '3d' });
    });

    it('rejects an unknown email without comparing passwords', async () => {
      userRepo.getUserByEmail.mockResolvedValue(null);

      await expect(authService.logIn('ghost@example.com', 'secret123')).rejects.toThrow(
        "Failed to sign in: Email doesn't exist",
      );
      expect(compare).not.toHaveBeenCalled();
      expect(sign).not.toHaveBeenCalled();
    });

    it('rejects a wrong password without issuing a token', async () => {
      userRepo.getUserByEmail.mockResolvedValue(buildUser());
      compare.mockResolvedValue(false);

      await expect(authService.logIn('jdoe@example.com', 'wrong')).rejects.toThrow('Failed to sign in: Wrong Password');
      expect(sign).not.toHaveBeenCalled();
    });

    it('wraps a token signing failure', async () => {
      userRepo.getUserByEmail.mockResolvedValue(buildUser());
      compare.mockResolvedValue(true);
      sign.mockImplementation(() => {
        throw new Error('secretOrPrivateKey must have a value');
      });

      await expect(authService.logIn('jdoe@example.com', 'secret123')).rejects.toThrow(
        'Failed to sign in: secretOrPrivateKey must have a value',
      );
    });

    it('wraps repository errors', async () => {
      userRepo.getUserByEmail.mockRejectedValue(new Error('timeout'));

      await expect(authService.logIn('jdoe@example.com', 'secret123')).rejects.toThrow('Failed to sign in: timeout');
    });
  });

  describe('getAuthenticatedUser', () => {
    it('returns the user for the given id', async () => {
      const user = buildUser();
      authRepo.getUserById.mockResolvedValue(user);

      await expect(authService.getAuthenticatedUser(ID)).resolves.toEqual(user);
      expect(authRepo.getUserById).toHaveBeenCalledWith(ID);
    });

    it('throws a generic error when the user does not exist', async () => {
      authRepo.getUserById.mockResolvedValue(null);

      await expect(authService.getAuthenticatedUser(ID)).rejects.toThrow('Failed to get user information');
    });

    it('hides repository error details behind the generic message', async () => {
      authRepo.getUserById.mockRejectedValue(new Error('connection refused at 10.0.0.5'));

      await expect(authService.getAuthenticatedUser(ID)).rejects.toThrow(/^Failed to get user information$/);
    });
  });

  describe('logOut', () => {
    it('returns a confirmation message', async () => {
      await expect(authService.logOut()).resolves.toEqual({ message: 'Logged out fully' });
    });
  });
});
