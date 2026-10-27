import * as userController from '../../../src/controllers/user.controller.js';
import * as userService from '../../../src/services/user.service.js';
import { buildUser, ID, OTHER_ID } from '../helpers/factories.js';
import { expectResponse, mockRequest, mockResponse } from '../helpers/express.js';

jest.mock('../../../src/services/user.service.js');

const service = jest.mocked(userService);

const createBody = {
  username: 'jdoe',
  password: 'secret123',
  email: 'jdoe@example.com',
  name: 'John Doe',
  role_id: OTHER_ID,
  role_name: 'Contributor',
  age: '30',
  gender: 'Male',
  nationality: 'Bangladeshi',
};

describe('user.controller', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('createUser', () => {
    it('responds 201 and forwards the body fields in order', async () => {
      const user = buildUser();
      service.createUser.mockResolvedValue(user);
      const res = mockResponse();

      await userController.createUser(mockRequest({ body: createBody }), res);

      expect(service.createUser).toHaveBeenCalledWith(
        'jdoe',
        'secret123',
        'jdoe@example.com',
        'John Doe',
        OTHER_ID,
        'Contributor',
        '30',
        'Male',
        'Bangladeshi',
      );
      expectResponse(res, 201, user);
    });

    it('responds 500 with the service error message', async () => {
      service.createUser.mockRejectedValue(new Error('Failed to create user: Error: Username already exists'));
      const res = mockResponse();

      await userController.createUser(mockRequest({ body: createBody }), res);

      expectResponse(res, 500, { error: 'Failed to create user: Error: Username already exists' });
    });
  });

  describe('updateUser', () => {
    it('responds 200 and reads the fields from body.data', async () => {
      const user = buildUser({ role_name: 'Administrator' });
      service.updateUser.mockResolvedValue(user);
      const res = mockResponse();

      await userController.updateUser(
        mockRequest({ params: { id: ID }, body: { data: { role_id: OTHER_ID, role_name: 'Administrator' } } }),
        res,
      );

      expect(service.updateUser).toHaveBeenCalledWith(
        ID,
        undefined,
        undefined,
        undefined,
        undefined,
        OTHER_ID,
        'Administrator',
        undefined,
        undefined,
        undefined,
      );
      expectResponse(res, 200, user);
    });

    it('ignores fields placed at the top level of the body', async () => {
      service.updateUser.mockResolvedValue(buildUser());
      const res = mockResponse();

      await userController.updateUser(
        mockRequest({ params: { id: ID }, body: { name: 'Top Level', data: {} } }),
        res,
      );

      expect(service.updateUser).toHaveBeenCalledWith(
        ID,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );
    });

    it('responds 404 when the service returns nothing', async () => {
      service.updateUser.mockResolvedValue(null);
      const res = mockResponse();

      await userController.updateUser(mockRequest({ params: { id: ID }, body: { data: { name: 'Jane' } } }), res);

      expectResponse(res, 404, { error: `User with id ${ID} not found` });
    });

    it('responds 500 when the service throws', async () => {
      service.updateUser.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await userController.updateUser(mockRequest({ params: { id: ID }, body: { data: { name: 'Jane' } } }), res);

      expectResponse(res, 500, { error: 'boom' });
    });

    it('rejects when body.data is missing because destructuring happens outside the try block', async () => {
      const res = mockResponse();

      await expect(userController.updateUser(mockRequest({ params: { id: ID }, body: {} }), res)).rejects.toThrow(TypeError);
      expect(service.updateUser).not.toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('deleteUser', () => {
    it('responds 200 with the deleted user', async () => {
      const user = buildUser();
      service.deleteUser.mockResolvedValue(user);
      const res = mockResponse();

      await userController.deleteUser(mockRequest({ params: { id: ID } }), res);

      expect(service.deleteUser).toHaveBeenCalledWith(ID);
      expectResponse(res, 200, user);
    });

    it('responds 404 when the service returns nothing', async () => {
      service.deleteUser.mockResolvedValue(null);
      const res = mockResponse();

      await userController.deleteUser(mockRequest({ params: { id: ID } }), res);

      expectResponse(res, 404, { error: `User with id ${ID} not found` });
    });

    it('responds 500 when the service throws', async () => {
      service.deleteUser.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await userController.deleteUser(mockRequest({ params: { id: ID } }), res);

      expectResponse(res, 500, { error: 'boom' });
    });
  });

  describe('getAllUsers', () => {
    it('responds 200 with every user', async () => {
      const users = [buildUser()];
      service.getAllUsers.mockResolvedValue(users);
      const res = mockResponse();

      await userController.getAllUsers(mockRequest(), res);

      expectResponse(res, 200, users);
    });

    it('responds 500 when the service throws', async () => {
      service.getAllUsers.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await userController.getAllUsers(mockRequest(), res);

      expectResponse(res, 500, { error: 'boom' });
    });
  });

  describe('getUserById', () => {
    it('responds 200 with the user', async () => {
      const user = buildUser();
      service.getUserById.mockResolvedValue(user);
      const res = mockResponse();

      await userController.getUserById(mockRequest({ params: { id: ID } }), res);

      expect(service.getUserById).toHaveBeenCalledWith(ID);
      expectResponse(res, 200, user);
    });

    it('responds 404 when the service returns nothing', async () => {
      service.getUserById.mockResolvedValue(null);
      const res = mockResponse();

      await userController.getUserById(mockRequest({ params: { id: ID } }), res);

      expectResponse(res, 404, { error: `User with id ${ID} not found` });
    });

    it('responds 500 when the service throws', async () => {
      service.getUserById.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await userController.getUserById(mockRequest({ params: { id: ID } }), res);

      expectResponse(res, 500, { error: 'boom' });
    });
  });

  describe('getAllUsernames', () => {
    let consoleError: jest.SpyInstance;

    beforeEach(() => {
      consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
      consoleError.mockRestore();
    });

    it('responds 200 with the usernames', async () => {
      const usernames = [{ id: ID, username: 'jdoe' }];
      service.getAllUsernames.mockResolvedValue(usernames);
      const res = mockResponse();

      await userController.getAllUsernames(mockRequest(), res);

      expectResponse(res, 200, usernames);
    });

    it('responds 500 with a fixed message and logs the real error', async () => {
      const error = new Error('db password leaked in message');
      service.getAllUsernames.mockRejectedValue(error);
      const res = mockResponse();

      await userController.getAllUsernames(mockRequest(), res);

      expectResponse(res, 500, { error: 'Failed to fetch usernames' });
      expect(consoleError).toHaveBeenCalledWith('Error fetching usernames:', error);
    });
  });

  describe('getUsersWithoutRoles', () => {
    let consoleError: jest.SpyInstance;

    beforeEach(() => {
      consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
      consoleError.mockRestore();
    });

    it('responds 200 with the users that have no role', async () => {
      const users = [buildUser({ role_id: null, role_name: null })];
      service.getUsersWithoutRoles.mockResolvedValue(users);
      const res = mockResponse();

      await userController.getUsersWithoutRoles(mockRequest(), res);

      expectResponse(res, 200, users);
    });

    it('responds 500 with a fixed message and logs the real error', async () => {
      const error = new Error('timeout');
      service.getUsersWithoutRoles.mockRejectedValue(error);
      const res = mockResponse();

      await userController.getUsersWithoutRoles(mockRequest(), res);

      expectResponse(res, 500, { error: 'Failed to fetch users without roles' });
      expect(consoleError).toHaveBeenCalledWith('Error fetching users without roles:', error);
    });
  });
});
