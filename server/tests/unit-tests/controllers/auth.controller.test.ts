import * as authController from '../../../src/controllers/auth.controller.js';
import * as authService from '../../../src/services/auth.service.js';
import { buildUser, ID } from '../helpers/factories.js';
import { expectResponse, mockRequest, mockResponse } from '../helpers/express.js';

jest.mock('../../../src/services/auth.service.js');

const service = jest.mocked(authService);

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

describe('auth.controller', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('signUp', () => {
    it('responds 201 with the created user', async () => {
      const result = { user: buildUser() };
      service.signUp.mockResolvedValue(result);
      const res = mockResponse();

      await authController.signUp(
        mockRequest({ body: { email: 'jdoe@example.com', password: 'secret123', username: 'jdoe' } }),
        res,
      );

      expect(service.signUp).toHaveBeenCalledWith('jdoe@example.com', 'secret123', 'jdoe');
      expectResponse(res, 201, result);
    });

    it('responds 400 with the service error message', async () => {
      service.signUp.mockRejectedValue(new Error('Failed to create user: Error: Email already exists'));
      const res = mockResponse();

      await authController.signUp(
        mockRequest({ body: { email: 'jdoe@example.com', password: 'secret123', username: 'jdoe' } }),
        res,
      );

      expectResponse(res, 400, { message: 'Failed to create user: Error: Email already exists' });
    });
  });

  describe('logIn', () => {
    it('sets an httpOnly jwt cookie for three days and responds 200 with user and token', async () => {
      const user = buildUser();
      service.logIn.mockResolvedValue({ user, token: 'signed.jwt.token' });
      const res = mockResponse();

      await authController.logIn(mockRequest({ body: { email: 'jdoe@example.com', password: 'secret123' } }), res);

      expect(service.logIn).toHaveBeenCalledWith('jdoe@example.com', 'secret123');
      expect(res.cookie).toHaveBeenCalledWith('jwt', 'signed.jwt.token', { httpOnly: true, maxAge: THREE_DAYS_MS });
      expectResponse(res, 200, { user, token: 'signed.jwt.token' });
    });

    it('ignores a username sent with the credentials', async () => {
      service.logIn.mockResolvedValue({ user: buildUser(), token: 't' });
      const res = mockResponse();

      await authController.logIn(
        mockRequest({ body: { email: 'jdoe@example.com', password: 'secret123', username: 'jdoe' } }),
        res,
      );

      expect(service.logIn).toHaveBeenCalledWith('jdoe@example.com', 'secret123');
    });

    it('responds 400 without setting a cookie when login fails', async () => {
      service.logIn.mockRejectedValue(new Error('Failed to sign in: Wrong Password'));
      const res = mockResponse();

      await authController.logIn(mockRequest({ body: { email: 'jdoe@example.com', password: 'wrong' } }), res);

      expect(res.cookie).not.toHaveBeenCalled();
      expectResponse(res, 400, { message: 'Failed to sign in: Wrong Password' });
    });
  });

  describe('getAuthenticatedUser', () => {
    it('responds 200 with the user identified by the token payload', async () => {
      const user = buildUser();
      service.getAuthenticatedUser.mockResolvedValue(user);
      const res = mockResponse();

      await authController.getAuthenticatedUser(mockRequest({ user: { id: ID } }), res);

      expect(service.getAuthenticatedUser).toHaveBeenCalledWith(ID);
      expectResponse(res, 200, { user });
    });

    it('responds 500 when the service throws', async () => {
      service.getAuthenticatedUser.mockRejectedValue(new Error('Failed to get user information'));
      const res = mockResponse();

      await authController.getAuthenticatedUser(mockRequest({ user: { id: ID } }), res);

      expectResponse(res, 500, { message: 'Failed to get user information' });
    });

    it('responds 500 when the request has no authenticated user', async () => {
      const res = mockResponse();

      await authController.getAuthenticatedUser(mockRequest(), res);

      expect(service.getAuthenticatedUser).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('logOut', () => {
    it('clears the jwt cookie and responds 200', async () => {
      service.logOut.mockResolvedValue({ message: 'Logged out fully' });
      const res = mockResponse();

      await authController.logOut(mockRequest(), res);

      expect(res.clearCookie).toHaveBeenCalledWith('jwt', { httpOnly: true, sameSite: 'strict', secure: true });
      expectResponse(res, 200, { message: 'Logged out successfully' });
    });

    it('responds 500 without clearing the cookie when the service throws', async () => {
      service.logOut.mockRejectedValue(new Error('Failed to log out'));
      const res = mockResponse();

      await authController.logOut(mockRequest(), res);

      expect(res.clearCookie).not.toHaveBeenCalled();
      expectResponse(res, 500, { message: 'Failed to log out' });
    });
  });
});
