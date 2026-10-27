import * as permissionService from '../../../src/services/permission.service.js';
import * as permissionRepository from '../../../src/repositories/permission.repository.js';
import { buildPermission, ID, OTHER_ID } from '../helpers/factories.js';

jest.mock('../../../src/repositories/permission.repository.js');

const repo = jest.mocked(permissionRepository);

describe('permission.service', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('createPermission', () => {
    it('returns the permission created by the repository', async () => {
      const permission = buildPermission();
      repo.createPermission.mockResolvedValue(permission);

      await expect(permissionService.createPermission('create_project')).resolves.toEqual(permission);
      expect(repo.createPermission).toHaveBeenCalledTimes(1);
      expect(repo.createPermission).toHaveBeenCalledWith('create_project');
    });

    it('wraps an Error thrown by the repository', async () => {
      repo.createPermission.mockRejectedValue(new Error('Unique constraint failed'));

      await expect(permissionService.createPermission('create_project')).rejects.toThrow(
        'Failed to create permission: Error: Unique constraint failed',
      );
    });

    it('wraps a non-Error rejection from the repository', async () => {
      repo.createPermission.mockRejectedValue('connection lost');

      await expect(permissionService.createPermission('create_project')).rejects.toThrow(
        'Failed to create permission: connection lost',
      );
    });
  });

  describe('updatePermission', () => {
    it('returns the updated permission', async () => {
      const permission = buildPermission({ permission_name: 'delete_project' });
      repo.updatePermission.mockResolvedValue(permission);

      await expect(permissionService.updatePermission(ID, 'delete_project')).resolves.toEqual(permission);
      expect(repo.updatePermission).toHaveBeenCalledWith(ID, 'delete_project');
    });

    it('forwards an undefined name when none is given', async () => {
      repo.updatePermission.mockResolvedValue(buildPermission());

      await permissionService.updatePermission(ID);

      expect(repo.updatePermission).toHaveBeenCalledWith(ID, undefined);
    });

    it('throws a not-found error when the repository returns null', async () => {
      repo.updatePermission.mockResolvedValue(null);

      await expect(permissionService.updatePermission(OTHER_ID, 'delete_project')).rejects.toThrow(
        `Failed to update permission: Error: Permission with id ${OTHER_ID} not found`,
      );
    });

    it('wraps repository errors', async () => {
      repo.updatePermission.mockRejectedValue(new Error('Record to update not found'));

      await expect(permissionService.updatePermission(ID, 'delete_project')).rejects.toThrow(
        'Failed to update permission: Error: Record to update not found',
      );
    });
  });

  describe('deletePermission', () => {
    it('returns the deleted permission', async () => {
      const permission = buildPermission();
      repo.deletePermission.mockResolvedValue(permission);

      await expect(permissionService.deletePermission(ID)).resolves.toEqual(permission);
      expect(repo.deletePermission).toHaveBeenCalledWith(ID);
    });

    it('throws a not-found error when the repository returns null', async () => {
      repo.deletePermission.mockResolvedValue(null);

      await expect(permissionService.deletePermission(ID)).rejects.toThrow(
        `Failed to delete permission: Error: Permission with id ${ID} not found`,
      );
    });

    it('wraps repository errors', async () => {
      repo.deletePermission.mockRejectedValue(new Error('Foreign key constraint failed'));

      await expect(permissionService.deletePermission(ID)).rejects.toThrow(
        'Failed to delete permission: Error: Foreign key constraint failed',
      );
    });
  });

  describe('getAllPermissions', () => {
    it('returns every permission', async () => {
      const permissions = [buildPermission(), buildPermission({ id: OTHER_ID, permission_name: 'read_project' })];
      repo.getAllPermissions.mockResolvedValue(permissions);

      await expect(permissionService.getAllPermissions()).resolves.toEqual(permissions);
      expect(repo.getAllPermissions).toHaveBeenCalledWith();
    });

    it('returns an empty list when there are no permissions', async () => {
      repo.getAllPermissions.mockResolvedValue([]);

      await expect(permissionService.getAllPermissions()).resolves.toEqual([]);
    });

    it('wraps repository errors', async () => {
      repo.getAllPermissions.mockRejectedValue(new Error('timeout'));

      await expect(permissionService.getAllPermissions()).rejects.toThrow('Failed to fetch permissions: Error: timeout');
    });
  });

  describe('getPermissionById', () => {
    it('returns the matching permission', async () => {
      const permission = buildPermission();
      repo.getPermissionById.mockResolvedValue(permission);

      await expect(permissionService.getPermissionById(ID)).resolves.toEqual(permission);
      expect(repo.getPermissionById).toHaveBeenCalledWith(ID);
    });

    it('throws a not-found error when the repository returns null', async () => {
      repo.getPermissionById.mockResolvedValue(null);

      await expect(permissionService.getPermissionById(ID)).rejects.toThrow(
        `Failed to fetch permission: Error: Permission with id ${ID} not found`,
      );
    });

    it('wraps repository errors', async () => {
      repo.getPermissionById.mockRejectedValue(new Error('timeout'));

      await expect(permissionService.getPermissionById(ID)).rejects.toThrow('Failed to fetch permission: Error: timeout');
    });
  });
});
