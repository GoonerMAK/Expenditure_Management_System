import * as roleService from '../../../src/services/role.service.js';
import * as roleRepository from '../../../src/repositories/role.repository.js';
import { buildRole, buildUser, ID, OTHER_ID } from '../helpers/factories.js';

jest.mock('../../../src/repositories/role.repository.js');

const repo = jest.mocked(roleRepository);

describe('role.service', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('createRole', () => {
    it('returns the role created by the repository', async () => {
      const role = buildRole();
      repo.createRole.mockResolvedValue(role);

      await expect(roleService.createRole('Contributor')).resolves.toEqual(role);
      expect(repo.createRole).toHaveBeenCalledTimes(1);
      expect(repo.createRole).toHaveBeenCalledWith('Contributor');
    });

    it('wraps repository errors', async () => {
      repo.createRole.mockRejectedValue(new Error('Unique constraint failed'));

      await expect(roleService.createRole('Contributor')).rejects.toThrow(
        'Failed to create role: Error: Unique constraint failed',
      );
    });
  });

  describe('updateRole', () => {
    it('returns the updated role', async () => {
      const role = buildRole({ role_name: 'Administrator' });
      repo.updateRole.mockResolvedValue(role);

      await expect(roleService.updateRole(ID, 'Administrator')).resolves.toEqual(role);
      expect(repo.updateRole).toHaveBeenCalledWith(ID, 'Administrator');
    });

    it('forwards an undefined name when none is given', async () => {
      repo.updateRole.mockResolvedValue(buildRole());

      await roleService.updateRole(ID);

      expect(repo.updateRole).toHaveBeenCalledWith(ID, undefined);
    });

    it('throws a not-found error when the repository returns null', async () => {
      repo.updateRole.mockResolvedValue(null);

      await expect(roleService.updateRole(OTHER_ID, 'Administrator')).rejects.toThrow(
        `Failed to update role: Error: Role with id ${OTHER_ID} not found`,
      );
    });

    it('wraps repository errors', async () => {
      repo.updateRole.mockRejectedValue(new Error('Record to update not found'));

      await expect(roleService.updateRole(ID, 'Administrator')).rejects.toThrow(
        'Failed to update role: Error: Record to update not found',
      );
    });
  });

  describe('deleteRole', () => {
    it('returns the deleted role', async () => {
      const role = buildRole();
      repo.deleteRole.mockResolvedValue(role);

      await expect(roleService.deleteRole(ID)).resolves.toEqual(role);
      expect(repo.deleteRole).toHaveBeenCalledWith(ID);
    });

    it('throws a not-found error when the repository returns null', async () => {
      repo.deleteRole.mockResolvedValue(null);

      await expect(roleService.deleteRole(ID)).rejects.toThrow(`Failed to delete role: Error: Role with id ${ID} not found`);
    });

    it('wraps repository errors', async () => {
      repo.deleteRole.mockRejectedValue(new Error('Foreign key constraint failed'));

      await expect(roleService.deleteRole(ID)).rejects.toThrow('Failed to delete role: Error: Foreign key constraint failed');
    });
  });

  describe('getAllRoles', () => {
    it('returns every role', async () => {
      const roles = [buildRole(), buildRole({ id: OTHER_ID, role_name: 'Administrator' })];
      repo.getAllRoles.mockResolvedValue(roles);

      await expect(roleService.getAllRoles()).resolves.toEqual(roles);
    });

    it('returns an empty list when there are no roles', async () => {
      repo.getAllRoles.mockResolvedValue([]);

      await expect(roleService.getAllRoles()).resolves.toEqual([]);
    });

    it('wraps repository errors', async () => {
      repo.getAllRoles.mockRejectedValue(new Error('timeout'));

      await expect(roleService.getAllRoles()).rejects.toThrow('Failed to fetch roles: Error: timeout');
    });
  });

  describe('getRoleById', () => {
    it('returns the matching role', async () => {
      const role = buildRole();
      repo.getRoleById.mockResolvedValue(role);

      await expect(roleService.getRoleById(ID)).resolves.toEqual(role);
      expect(repo.getRoleById).toHaveBeenCalledWith(ID);
    });

    it('throws a not-found error when the repository returns null', async () => {
      repo.getRoleById.mockResolvedValue(null);

      await expect(roleService.getRoleById(ID)).rejects.toThrow(`Failed to fetch role: Error: Role with id ${ID} not found`);
    });

    it('wraps repository errors', async () => {
      repo.getRoleById.mockRejectedValue(new Error('timeout'));

      await expect(roleService.getRoleById(ID)).rejects.toThrow('Failed to fetch role: Error: timeout');
    });
  });

  describe('getUsersByRole', () => {
    it('flattens each role into [role_name, ...usernames]', async () => {
      repo.getUsersByRole.mockResolvedValue([
        { role_name: 'Administrator', users: [buildUser({ username: 'alice' }), buildUser({ username: 'bob' })] },
        { role_name: 'Contributor', users: [buildUser({ username: 'carol' })] },
      ]);

      await expect(roleService.getUsersByRole()).resolves.toEqual([
        ['Administrator', 'alice', 'bob'],
        ['Contributor', 'carol'],
      ]);
    });

    it('returns only the role name for a role without users', async () => {
      repo.getUsersByRole.mockResolvedValue([{ role_name: 'Read-only', users: [] }]);

      await expect(roleService.getUsersByRole()).resolves.toEqual([['Read-only']]);
    });

    it('keeps a null username in place', async () => {
      repo.getUsersByRole.mockResolvedValue([{ role_name: 'Contributor', users: [buildUser({ username: null })] }]);

      await expect(roleService.getUsersByRole()).resolves.toEqual([['Contributor', null]]);
    });

    it('returns an empty list when there are no roles', async () => {
      repo.getUsersByRole.mockResolvedValue([]);

      await expect(roleService.getUsersByRole()).resolves.toEqual([]);
    });

    it('wraps repository errors using the error message', async () => {
      repo.getUsersByRole.mockRejectedValue(new Error('timeout'));

      await expect(roleService.getUsersByRole()).rejects.toThrow('Failed to get users by role: timeout');
    });
  });

  describe('getUnassignedRolesByUserId', () => {
    it('returns the roles not assigned to the user', async () => {
      const roles = [{ id: OTHER_ID, role_name: 'Administrator' }];
      repo.getUnassignedRolesByUserId.mockResolvedValue(roles);

      await expect(roleService.getUnassignedRolesByUserId(ID)).resolves.toEqual(roles);
      expect(repo.getUnassignedRolesByUserId).toHaveBeenCalledWith(ID);
    });

    it('wraps repository errors using the error message', async () => {
      repo.getUnassignedRolesByUserId.mockRejectedValue(new Error("Cannot read properties of null (reading 'role_id')"));

      await expect(roleService.getUnassignedRolesByUserId(ID)).rejects.toThrow(
        "Failed to fetch unassigned roles: Cannot read properties of null (reading 'role_id')",
      );
    });
  });

  describe('getAssignedRolesByUserId', () => {
    it('returns the role assigned to the user', async () => {
      const role = { id: OTHER_ID, role_name: 'Contributor' };
      repo.getAssignedRolesByUserId.mockResolvedValue(role);

      await expect(roleService.getAssignedRolesByUserId(ID)).resolves.toEqual(role);
      expect(repo.getAssignedRolesByUserId).toHaveBeenCalledWith(ID);
    });

    it('returns an empty list when the user has no assignable role', async () => {
      repo.getAssignedRolesByUserId.mockResolvedValue([]);

      await expect(roleService.getAssignedRolesByUserId(ID)).resolves.toEqual([]);
    });

    it('wraps repository errors with the user id', async () => {
      repo.getAssignedRolesByUserId.mockRejectedValue(new Error('timeout'));

      await expect(roleService.getAssignedRolesByUserId(ID)).rejects.toThrow(
        `Failed to get assigned roles for user with id ${ID}: timeout`,
      );
    });
  });
});
