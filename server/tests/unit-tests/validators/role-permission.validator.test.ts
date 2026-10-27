import { permissionSchema } from '../../../src/validators/permission.validator.js';
import { roleSchema } from '../../../src/validators/role.validator.js';
import { OTHER_ID } from '../helpers/factories.js';

describe('role.validator roleSchema', () => {
  it('accepts exactly 2 characters', () => {
    expect(roleSchema.parse({ role_name: 'QA' })).toEqual({ role_name: 'QA' });
  });

  it.each(['', 'A'])('rejects %p with the custom message', (role_name) => {
    expect(roleSchema.safeParse({ role_name }).error?.issues[0].message).toBe('Role name must be at least 2 characters long');
  });

  it('rejects a missing role name', () => {
    expect(roleSchema.safeParse({}).success).toBe(false);
  });
});

describe('permission.validator permissionSchema', () => {
  it('accepts a name without a role', () => {
    expect(permissionSchema.parse({ permission_name: 'create_project' })).toEqual({ permission_name: 'create_project' });
  });

  it('accepts a name with a UUID role_id', () => {
    expect(permissionSchema.safeParse({ permission_name: 'create_project', role_id: OTHER_ID }).success).toBe(true);
  });

  it('rejects an empty name with the custom message', () => {
    expect(permissionSchema.safeParse({ permission_name: '' }).error?.issues[0].message).toBe(
      'Permission name cannot be empty',
    );
  });

  it('rejects a non-UUID role_id', () => {
    expect(permissionSchema.safeParse({ permission_name: 'x', role_id: 'admin' }).error?.issues[0].path).toEqual([
      'role_id',
    ]);
  });
});
