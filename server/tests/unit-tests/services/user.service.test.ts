import bcrypt from 'bcrypt';
import * as userService from '../../../src/services/user.service.js';
import * as userRepository from '../../../src/repositories/user.repository.js';
import { buildUser, ID, OTHER_ID } from '../helpers/factories.js';

jest.mock('../../../src/repositories/user.repository.js');
jest.mock('bcrypt', () => ({
  __esModule: true,
  default: {
    genSalt: jest.fn().mockResolvedValue('$2b$10$generatedsalt'),
    hash: jest.fn(),
    compare: jest.fn(),
  },
}));

const repo = jest.mocked(userRepository);
const hash = bcrypt.hash as unknown as jest.Mock;

const HASHED = '$2b$10$hashedpasswordvalue';

describe('user.service', () => {
  beforeEach(() => {
    hash.mockResolvedValue(HASHED);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('createUser', () => {
    const create = () =>
      userService.createUser('jdoe', 'secret123', 'jdoe@example.com', 'John Doe', OTHER_ID, 'Contributor', '30', 'Male', 'Bangladeshi');

    it('hashes the password and stores the user', async () => {
      const user = buildUser();
      repo.getUserByUsername.mockResolvedValue(null);
      repo.getUserByEmail.mockResolvedValue(null);
      repo.createUser.mockResolvedValue(user);

      await expect(create()).resolves.toEqual(user);
      expect(hash).toHaveBeenCalledWith('secret123', expect.anything());
      expect(repo.createUser).toHaveBeenCalledWith(
        'jdoe',
        HASHED,
        'jdoe@example.com',
        'John Doe',
        OTHER_ID,
        'Contributor',
        '30',
        'Male',
        'Bangladeshi',
      );
    });

    it('never stores the plain-text password', async () => {
      repo.getUserByUsername.mockResolvedValue(null);
      repo.getUserByEmail.mockResolvedValue(null);
      repo.createUser.mockResolvedValue(buildUser());

      await create();

      expect(repo.createUser.mock.calls[0]).not.toContain('secret123');
    });

    it('passes omitted optional profile fields through as undefined', async () => {
      repo.getUserByUsername.mockResolvedValue(null);
      repo.getUserByEmail.mockResolvedValue(null);
      repo.createUser.mockResolvedValue(buildUser());

      await userService.createUser('jdoe', 'secret123', 'jdoe@example.com', 'John Doe', OTHER_ID, 'Contributor');

      expect(repo.createUser).toHaveBeenCalledWith(
        'jdoe',
        HASHED,
        'jdoe@example.com',
        'John Doe',
        OTHER_ID,
        'Contributor',
        undefined,
        undefined,
        undefined,
      );
    });

    it.failing('hashes with a resolved salt rather than a pending promise', async () => {
      repo.getUserByUsername.mockResolvedValue(null);
      repo.getUserByEmail.mockResolvedValue(null);
      repo.createUser.mockResolvedValue(buildUser());

      await create();

      expect(['string', 'number']).toContain(typeof hash.mock.calls[0][1]);
    });

    it('rejects a duplicate username without creating the user', async () => {
      repo.getUserByUsername.mockResolvedValue(buildUser());
      repo.getUserByEmail.mockResolvedValue(null);

      await expect(create()).rejects.toThrow('Failed to create user: Error: Username already exists');
      expect(hash).not.toHaveBeenCalled();
      expect(repo.createUser).not.toHaveBeenCalled();
    });

    it('rejects a duplicate email without creating the user', async () => {
      repo.getUserByUsername.mockResolvedValue(null);
      repo.getUserByEmail.mockResolvedValue(buildUser());

      await expect(create()).rejects.toThrow('Failed to create user: Error: Email already exists');
      expect(repo.createUser).not.toHaveBeenCalled();
    });

    it('reports the username conflict first when both username and email exist', async () => {
      repo.getUserByUsername.mockResolvedValue(buildUser());
      repo.getUserByEmail.mockResolvedValue(buildUser());

      await expect(create()).rejects.toThrow('Username already exists');
    });

    it('wraps a hashing failure', async () => {
      repo.getUserByUsername.mockResolvedValue(null);
      repo.getUserByEmail.mockResolvedValue(null);
      hash.mockRejectedValue(new Error('Invalid salt'));

      await expect(create()).rejects.toThrow('Failed to create user: Error: Invalid salt');
      expect(repo.createUser).not.toHaveBeenCalled();
    });

    it('wraps repository errors', async () => {
      repo.getUserByUsername.mockResolvedValue(null);
      repo.getUserByEmail.mockResolvedValue(null);
      repo.createUser.mockRejectedValue(new Error('Foreign key constraint failed'));

      await expect(create()).rejects.toThrow('Failed to create user: Error: Foreign key constraint failed');
    });
  });

  describe('updateUser', () => {
    it('sends only the fields that were provided', async () => {
      repo.updateUser.mockResolvedValue(buildUser({ name: 'Jane Doe' }));

      await userService.updateUser(ID, undefined, undefined, undefined, 'Jane Doe');

      expect(repo.updateUser).toHaveBeenCalledWith(ID, { name: 'Jane Doe' });
      expect(hash).not.toHaveBeenCalled();
    });

    it('sends an empty change set when nothing was provided', async () => {
      repo.updateUser.mockResolvedValue(buildUser());

      await userService.updateUser(ID);

      expect(repo.updateUser).toHaveBeenCalledWith(ID, {});
    });

    it('hashes a new password before saving it', async () => {
      repo.updateUser.mockResolvedValue(buildUser());

      await userService.updateUser(ID, undefined, 'newSecret');

      expect(hash).toHaveBeenCalledWith('newSecret', expect.anything());
      expect(repo.updateUser).toHaveBeenCalledWith(ID, { password: HASHED });
    });

    it('sends every field when all are provided', async () => {
      const updated = buildUser();
      repo.updateUser.mockResolvedValue(updated);

      const result = await userService.updateUser(
        ID,
        'jdoe2',
        'newSecret',
        'jdoe2@example.com',
        'Jane Doe',
        OTHER_ID,
        'Administrator',
        '31',
        'Female',
        'Canadian',
      );

      expect(result).toEqual(updated);
      expect(repo.updateUser).toHaveBeenCalledWith(ID, {
        username: 'jdoe2',
        password: HASHED,
        email: 'jdoe2@example.com',
        name: 'Jane Doe',
        role_id: OTHER_ID,
        role_name: 'Administrator',
        age: '31',
        gender: 'Female',
        nationality: 'Canadian',
      });
    });

    it('keeps empty-string values because only undefined is skipped', async () => {
      repo.updateUser.mockResolvedValue(buildUser());

      await userService.updateUser(ID, undefined, undefined, undefined, undefined, undefined, undefined, '', undefined, '');

      expect(repo.updateUser).toHaveBeenCalledWith(ID, { age: '', nationality: '' });
    });

    it('throws a not-found error when the repository returns null', async () => {
      repo.updateUser.mockResolvedValue(null);

      await expect(userService.updateUser(ID, 'jdoe2')).rejects.toThrow(
        `Failed to update user: User with id ${ID} not found`,
      );
    });

    it('wraps repository errors using the error message', async () => {
      repo.updateUser.mockRejectedValue(new Error('Unique constraint failed on email'));

      await expect(userService.updateUser(ID, undefined, undefined, 'taken@example.com')).rejects.toThrow(
        'Failed to update user: Unique constraint failed on email',
      );
    });
  });

  describe('deleteUser', () => {
    it('returns the deleted user', async () => {
      const user = buildUser();
      repo.deleteUser.mockResolvedValue(user);

      await expect(userService.deleteUser(ID)).resolves.toEqual(user);
      expect(repo.deleteUser).toHaveBeenCalledWith(ID);
    });

    it('throws a not-found error when the repository returns null', async () => {
      repo.deleteUser.mockResolvedValue(null);

      await expect(userService.deleteUser(ID)).rejects.toThrow(`Failed to delete user: Error: User with id ${ID} not found`);
    });

    it('wraps repository errors', async () => {
      repo.deleteUser.mockRejectedValue(new Error('timeout'));

      await expect(userService.deleteUser(ID)).rejects.toThrow('Failed to delete user: Error: timeout');
    });
  });

  describe('getAllUsers', () => {
    it('returns every user', async () => {
      const users = [buildUser(), buildUser({ id: OTHER_ID, username: 'asmith' })];
      repo.getAllUsers.mockResolvedValue(users);

      await expect(userService.getAllUsers()).resolves.toEqual(users);
    });

    it('returns an empty list when there are no users', async () => {
      repo.getAllUsers.mockResolvedValue([]);

      await expect(userService.getAllUsers()).resolves.toEqual([]);
    });

    it('wraps repository errors', async () => {
      repo.getAllUsers.mockRejectedValue(new Error('timeout'));

      await expect(userService.getAllUsers()).rejects.toThrow('Failed to fetch users: Error: timeout');
    });
  });

  describe('getUserById', () => {
    it('returns the matching user', async () => {
      const user = buildUser();
      repo.getUserById.mockResolvedValue(user);

      await expect(userService.getUserById(ID)).resolves.toEqual(user);
      expect(repo.getUserById).toHaveBeenCalledWith(ID);
    });

    it('throws a not-found error when the repository returns null', async () => {
      repo.getUserById.mockResolvedValue(null);

      await expect(userService.getUserById(ID)).rejects.toThrow(`Failed to fetch user: Error: User with id ${ID} not found`);
    });

    it('wraps repository errors', async () => {
      repo.getUserById.mockRejectedValue(new Error('timeout'));

      await expect(userService.getUserById(ID)).rejects.toThrow('Failed to fetch user: Error: timeout');
    });
  });

  describe('getAllUsernames', () => {
    it('returns id and username pairs', async () => {
      const usernames = [
        { id: ID, username: 'jdoe' },
        { id: OTHER_ID, username: null },
      ];
      repo.getAllUsernames.mockResolvedValue(usernames);

      await expect(userService.getAllUsernames()).resolves.toEqual(usernames);
    });

    it('wraps repository errors using the error message', async () => {
      repo.getAllUsernames.mockRejectedValue(new Error('timeout'));

      await expect(userService.getAllUsernames()).rejects.toThrow('Failed to fetch usernames: timeout');
    });
  });

  describe('getUsersWithoutRoles', () => {
    it('returns users that have no role', async () => {
      const users = [buildUser({ role_id: null, role_name: null })];
      repo.getUsersWithoutRoles.mockResolvedValue(users);

      await expect(userService.getUsersWithoutRoles()).resolves.toEqual(users);
    });

    it('returns an empty list when every user has a role', async () => {
      repo.getUsersWithoutRoles.mockResolvedValue([]);

      await expect(userService.getUsersWithoutRoles()).resolves.toEqual([]);
    });

    it('wraps repository errors using the error message', async () => {
      repo.getUsersWithoutRoles.mockRejectedValue(new Error('timeout'));

      await expect(userService.getUsersWithoutRoles()).rejects.toThrow('Failed to fetch users without roles: timeout');
    });
  });
});
