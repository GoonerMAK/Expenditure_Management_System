import * as permissionController from '../../../src/controllers/permission.controller.js';
import * as permissionService from '../../../src/services/permission.service.js';
import { buildPermission, ID, OTHER_ID } from '../helpers/factories.js';
import { expectResponse, mockRequest, mockResponse } from '../helpers/express.js';

jest.mock('../../../src/services/permission.service.js');

const service = jest.mocked(permissionService);

describe('permission.controller', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('createPermission', () => {
    it('responds 201 with the created permission', async () => {
      const permission = buildPermission();
      service.createPermission.mockResolvedValue(permission);
      const res = mockResponse();

      await permissionController.createPermission(mockRequest({ body: { permission_name: 'create_project' } }), res);

      expect(service.createPermission).toHaveBeenCalledWith('create_project');
      expectResponse(res, 201, permission);
    });

    it('does not forward role_id from the body', async () => {
      service.createPermission.mockResolvedValue(buildPermission());
      const res = mockResponse();

      await permissionController.createPermission(
        mockRequest({ body: { permission_name: 'create_project', role_id: OTHER_ID } }),
        res,
      );

      expect(service.createPermission).toHaveBeenCalledWith('create_project');
    });

    it('responds 500 with the service error message', async () => {
      service.createPermission.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await permissionController.createPermission(mockRequest({ body: { permission_name: 'create_project' } }), res);

      expectResponse(res, 500, { error: 'boom' });
    });
  });

  describe('updatePermission', () => {
    it('responds 200 with the updated permission', async () => {
      const permission = buildPermission({ permission_name: 'delete_project' });
      service.updatePermission.mockResolvedValue(permission);
      const res = mockResponse();

      await permissionController.updatePermission(
        mockRequest({ params: { id: ID }, body: { permission_name: 'delete_project' } }),
        res,
      );

      expect(service.updatePermission).toHaveBeenCalledWith(ID, 'delete_project');
      expectResponse(res, 200, permission);
    });

    it('responds 404 when the service returns nothing', async () => {
      service.updatePermission.mockResolvedValue(null);
      const res = mockResponse();

      await permissionController.updatePermission(
        mockRequest({ params: { id: ID }, body: { permission_name: 'delete_project' } }),
        res,
      );

      expectResponse(res, 404, { error: `Permission with id ${ID} not found` });
    });

    it('responds 500 when the service throws', async () => {
      service.updatePermission.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await permissionController.updatePermission(
        mockRequest({ params: { id: ID }, body: { permission_name: 'delete_project' } }),
        res,
      );

      expectResponse(res, 500, { error: 'boom' });
    });
  });

  describe('deletePermission', () => {
    it('responds 200 with the deleted permission', async () => {
      const permission = buildPermission();
      service.deletePermission.mockResolvedValue(permission);
      const res = mockResponse();

      await permissionController.deletePermission(mockRequest({ params: { id: ID } }), res);

      expect(service.deletePermission).toHaveBeenCalledWith(ID);
      expectResponse(res, 200, permission);
    });

    it('responds 404 when the service returns nothing', async () => {
      service.deletePermission.mockResolvedValue(null);
      const res = mockResponse();

      await permissionController.deletePermission(mockRequest({ params: { id: ID } }), res);

      expectResponse(res, 404, { error: `Permission with id ${ID} not found` });
    });

    it('responds 500 when the service throws', async () => {
      service.deletePermission.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await permissionController.deletePermission(mockRequest({ params: { id: ID } }), res);

      expectResponse(res, 500, { error: 'boom' });
    });
  });

  describe('getAllPermissions', () => {
    it('responds 200 with every permission', async () => {
      const permissions = [buildPermission()];
      service.getAllPermissions.mockResolvedValue(permissions);
      const res = mockResponse();

      await permissionController.getAllPermissions(mockRequest(), res);

      expectResponse(res, 200, permissions);
    });

    it('responds 500 when the service throws', async () => {
      service.getAllPermissions.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await permissionController.getAllPermissions(mockRequest(), res);

      expectResponse(res, 500, { error: 'boom' });
    });
  });

  describe('getPermissionById', () => {
    it('responds 200 with the permission', async () => {
      const permission = buildPermission();
      service.getPermissionById.mockResolvedValue(permission);
      const res = mockResponse();

      await permissionController.getPermissionById(mockRequest({ params: { id: ID } }), res);

      expect(service.getPermissionById).toHaveBeenCalledWith(ID);
      expectResponse(res, 200, permission);
    });

    it('responds 404 when the service returns nothing', async () => {
      service.getPermissionById.mockResolvedValue(null);
      const res = mockResponse();

      await permissionController.getPermissionById(mockRequest({ params: { id: ID } }), res);

      expectResponse(res, 404, { error: `Permission with id ${ID} not found` });
    });

    it('responds 500 when the service throws', async () => {
      service.getPermissionById.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await permissionController.getPermissionById(mockRequest({ params: { id: ID } }), res);

      expectResponse(res, 500, { error: 'boom' });
    });
  });
});
