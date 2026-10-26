import * as roleController from '../../../src/controllers/role.controller.js';
import * as roleService from '../../../src/services/role.service.js';
import { buildRole, ID, OTHER_ID } from '../helpers/factories.js';
import { expectResponse, mockRequest, mockResponse } from '../helpers/express.js';

jest.mock('../../../src/services/role.service.js');

const service = jest.mocked(roleService);

describe('role.controller', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('createRole', () => {
    it('responds 201 with the created role', async () => {
      const role = buildRole();
      service.createRole.mockResolvedValue(role);
      const res = mockResponse();

      await roleController.createRole(mockRequest({ body: { role_name: 'Contributor' } }), res);

      expect(service.createRole).toHaveBeenCalledWith('Contributor');
      expectResponse(res, 201, role);
    });

    it('responds 500 with the service error message', async () => {
      service.createRole.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await roleController.createRole(mockRequest({ body: { role_name: 'Contributor' } }), res);

      expectResponse(res, 500, { error: 'boom' });
    });
  });

  describe('updateRole', () => {
    it('responds 200 with the updated role', async () => {
      const role = buildRole({ role_name: 'Administrator' });
      service.updateRole.mockResolvedValue(role);
      const res = mockResponse();

      await roleController.updateRole(mockRequest({ params: { id: ID }, body: { role_name: 'Administrator' } }), res);

      expect(service.updateRole).toHaveBeenCalledWith(ID, 'Administrator');
      expectResponse(res, 200, role);
    });

    it('responds 404 when the service returns nothing', async () => {
      service.updateRole.mockResolvedValue(null);
      const res = mockResponse();

      await roleController.updateRole(mockRequest({ params: { id: ID }, body: { role_name: 'Administrator' } }), res);

      expectResponse(res, 404, { error: `Role with id ${ID} not found` });
    });

    it('responds 500 when the service throws', async () => {
      service.updateRole.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await roleController.updateRole(mockRequest({ params: { id: ID }, body: { role_name: 'Administrator' } }), res);

      expectResponse(res, 500, { error: 'boom' });
    });
  });

  describe('deleteRole', () => {
    it('responds 200 with the deleted role', async () => {
      const role = buildRole();
      service.deleteRole.mockResolvedValue(role);
      const res = mockResponse();

      await roleController.deleteRole(mockRequest({ params: { id: ID } }), res);

      expect(service.deleteRole).toHaveBeenCalledWith(ID);
      expectResponse(res, 200, role);
    });

    it('responds 404 when the service returns nothing', async () => {
      service.deleteRole.mockResolvedValue(null);
      const res = mockResponse();

      await roleController.deleteRole(mockRequest({ params: { id: ID } }), res);

      expectResponse(res, 404, { error: `Role with id ${ID} not found` });
    });

    it('responds 500 when the service throws', async () => {
      service.deleteRole.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await roleController.deleteRole(mockRequest({ params: { id: ID } }), res);

      expectResponse(res, 500, { error: 'boom' });
    });
  });

  describe('getAllRoles', () => {
    it('responds 200 with every role', async () => {
      const roles = [buildRole(), buildRole({ id: OTHER_ID, role_name: 'Administrator' })];
      service.getAllRoles.mockResolvedValue(roles);
      const res = mockResponse();

      await roleController.getAllRoles(mockRequest(), res);

      expectResponse(res, 200, roles);
    });

    it('responds 500 when the service throws', async () => {
      service.getAllRoles.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await roleController.getAllRoles(mockRequest(), res);

      expectResponse(res, 500, { error: 'boom' });
    });
  });

  describe('getRoleById', () => {
    it('responds 200 with the role', async () => {
      const role = buildRole();
      service.getRoleById.mockResolvedValue(role);
      const res = mockResponse();

      await roleController.getRoleById(mockRequest({ params: { id: ID } }), res);

      expect(service.getRoleById).toHaveBeenCalledWith(ID);
      expectResponse(res, 200, role);
    });

    it('responds 404 when the service returns nothing', async () => {
      service.getRoleById.mockResolvedValue(null);
      const res = mockResponse();

      await roleController.getRoleById(mockRequest({ params: { id: ID } }), res);

      expectResponse(res, 404, { error: `Role with id ${ID} not found` });
    });

    it('responds 500 when the service throws', async () => {
      service.getRoleById.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await roleController.getRoleById(mockRequest({ params: { id: ID } }), res);

      expectResponse(res, 500, { error: 'boom' });
    });
  });

  describe('getUsersByRole', () => {
    it('responds 200 with the role/username tuples', async () => {
      const tuples = [['Administrator', 'alice'], ['Read-only']];
      service.getUsersByRole.mockResolvedValue(tuples);
      const res = mockResponse();

      await roleController.getUsersByRole(mockRequest(), res);

      expectResponse(res, 200, tuples);
    });

    it('responds 500 when the service throws', async () => {
      service.getUsersByRole.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await roleController.getUsersByRole(mockRequest(), res);

      expectResponse(res, 500, { error: 'boom' });
    });
  });

  describe('getUnassignedRolesByUserId', () => {
    it('responds 200 with the unassigned roles for the user in the path', async () => {
      const roles = [{ id: OTHER_ID, role_name: 'Administrator' }];
      service.getUnassignedRolesByUserId.mockResolvedValue(roles);
      const res = mockResponse();

      await roleController.getUnassignedRolesByUserId(mockRequest({ params: { id: ID } }), res);

      expect(service.getUnassignedRolesByUserId).toHaveBeenCalledWith(ID);
      expectResponse(res, 200, roles);
    });

    it('responds 200 with an empty list rather than 404', async () => {
      service.getUnassignedRolesByUserId.mockResolvedValue([]);
      const res = mockResponse();

      await roleController.getUnassignedRolesByUserId(mockRequest({ params: { id: ID } }), res);

      expectResponse(res, 200, []);
    });

    it('responds 500 when the service throws', async () => {
      service.getUnassignedRolesByUserId.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await roleController.getUnassignedRolesByUserId(mockRequest({ params: { id: ID } }), res);

      expectResponse(res, 500, { error: 'boom' });
    });
  });

  describe('getAssignedRolesByUserId', () => {
    it('responds 200 with the assigned role for the user in the path', async () => {
      const role = { id: OTHER_ID, role_name: 'Contributor' };
      service.getAssignedRolesByUserId.mockResolvedValue(role);
      const res = mockResponse();

      await roleController.getAssignedRolesByUserId(mockRequest({ params: { id: ID } }), res);

      expect(service.getAssignedRolesByUserId).toHaveBeenCalledWith(ID);
      expectResponse(res, 200, role);
    });

    it('responds 500 when the service throws', async () => {
      service.getAssignedRolesByUserId.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await roleController.getAssignedRolesByUserId(mockRequest({ params: { id: ID } }), res);

      expectResponse(res, 500, { error: 'boom' });
    });
  });
});
