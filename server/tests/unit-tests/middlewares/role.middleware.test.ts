import { protectBuiltInRoles, protectLastAdmin } from '../../../src/middlewares/role.middleware.js';
import * as roleRepository from '../../../src/repositories/role.repository.js';
import * as userRepository from '../../../src/repositories/user.repository.js';
import { buildRole, buildUser, ID, OTHER_ID } from '../helpers/factories.js';
import { expectResponse, mockNext, mockRequest, mockResponse } from '../helpers/express.js';

jest.mock('../../../src/repositories/role.repository.js');
jest.mock('../../../src/repositories/user.repository.js');

const roles = jest.mocked(roleRepository);
const users = jest.mocked(userRepository);

const userWithRole = (role_name: string) => ({ ...buildUser({ role_name }), role: buildRole({ role_name }) });

describe('role.middleware protectBuiltInRoles', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it.each(['Read-only', 'Contributor', 'Administrator'])('responds 403 for the built-in role %s', async (role_name) => {
    roles.getRoleById.mockResolvedValue(buildRole({ role_name }));
    const res = mockResponse();
    const next = mockNext();

    await protectBuiltInRoles(mockRequest({ params: { id: ID } }), res, next);

    expect(roles.getRoleById).toHaveBeenCalledWith(ID);
    expectResponse(res, 403, { message: `The built-in role '${role_name}' cannot be changed or deleted.` });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next for a custom role', async () => {
    roles.getRoleById.mockResolvedValue(buildRole({ role_name: 'Auditor' }));
    const res = mockResponse();
    const next = mockNext();

    await protectBuiltInRoles(mockRequest({ params: { id: ID } }), res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next when the role does not exist so the controller can respond', async () => {
    roles.getRoleById.mockResolvedValue(null);
    const next = mockNext();

    await protectBuiltInRoles(mockRequest({ params: { id: ID } }), mockResponse(), next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('responds 500 when the role lookup fails', async () => {
    roles.getRoleById.mockRejectedValue(new Error('db down'));
    const res = mockResponse();
    const next = mockNext();

    await protectBuiltInRoles(mockRequest({ params: { id: ID } }), res, next);

    expectResponse(res, 500, { message: 'Failed to check the role.' });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('role.middleware protectLastAdmin', () => {
  const lastAdminMessage = { message: 'The last Administrator cannot be demoted or deleted.' };

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('calls next without counting admins when the target is not an Administrator', async () => {
    users.getUserWithRole.mockResolvedValue(userWithRole('Contributor'));
    const next = mockNext();

    await protectLastAdmin(mockRequest({ method: 'DELETE', params: { id: ID } }), mockResponse(), next);

    expect(users.getUserWithRole).toHaveBeenCalledWith(ID);
    expect(users.countUsersWithRole).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('calls next when the target user does not exist', async () => {
    users.getUserWithRole.mockResolvedValue(null);
    const next = mockNext();

    await protectLastAdmin(mockRequest({ method: 'DELETE', params: { id: ID } }), mockResponse(), next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('responds 409 when deleting the last Administrator', async () => {
    users.getUserWithRole.mockResolvedValue(userWithRole('Administrator'));
    users.countUsersWithRole.mockResolvedValue(1);
    const res = mockResponse();
    const next = mockNext();

    await protectLastAdmin(mockRequest({ method: 'DELETE', params: { id: ID } }), res, next);

    expect(users.countUsersWithRole).toHaveBeenCalledWith('Administrator');
    expectResponse(res, 409, lastAdminMessage);
    expect(next).not.toHaveBeenCalled();
  });

  it('responds 409 when the last Administrator is demoted by role name', async () => {
    users.getUserWithRole.mockResolvedValue(userWithRole('Administrator'));
    users.countUsersWithRole.mockResolvedValue(1);
    const res = mockResponse();
    const next = mockNext();

    await protectLastAdmin(
      mockRequest({ method: 'PUT', params: { id: ID }, body: { data: { role_name: 'Read-only' } } }),
      res,
      next,
    );

    expectResponse(res, 409, lastAdminMessage);
    expect(next).not.toHaveBeenCalled();
  });

  it('responds 409 when the last Administrator is moved to another role by id', async () => {
    users.getUserWithRole.mockResolvedValue(userWithRole('Administrator'));
    roles.getRoleById.mockResolvedValue(buildRole({ id: OTHER_ID, role_name: 'Contributor' }));
    users.countUsersWithRole.mockResolvedValue(1);
    const res = mockResponse();

    await protectLastAdmin(
      mockRequest({ method: 'PUT', params: { id: ID }, body: { data: { role_id: OTHER_ID } } }),
      res,
      mockNext(),
    );

    expect(roles.getRoleById).toHaveBeenCalledWith(OTHER_ID);
    expectResponse(res, 409, lastAdminMessage);
  });

  it('lets another Administrator be demoted while one remains', async () => {
    users.getUserWithRole.mockResolvedValue(userWithRole('Administrator'));
    users.countUsersWithRole.mockResolvedValue(2);
    const res = mockResponse();
    const next = mockNext();

    await protectLastAdmin(
      mockRequest({ method: 'PUT', params: { id: ID }, body: { data: { role_name: 'Read-only' } } }),
      res,
      next,
    );

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it.each([
    ['a profile-only change', { name: 'Jane Doe' }],
    ['the Administrator role name', { role_name: 'Administrator' }],
  ])('calls next for %s on the last Administrator', async (_label, data) => {
    users.getUserWithRole.mockResolvedValue(userWithRole('Administrator'));
    const next = mockNext();

    await protectLastAdmin(mockRequest({ method: 'PUT', params: { id: ID }, body: { data } }), mockResponse(), next);

    expect(users.countUsersWithRole).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('calls next when the role id points at the Administrator role', async () => {
    users.getUserWithRole.mockResolvedValue(userWithRole('Administrator'));
    roles.getRoleById.mockResolvedValue(buildRole({ role_name: 'Administrator' }));
    const next = mockNext();

    await protectLastAdmin(
      mockRequest({ method: 'PUT', params: { id: ID }, body: { data: { role_id: OTHER_ID } } }),
      mockResponse(),
      next,
    );

    expect(users.countUsersWithRole).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('treats a PUT without a body as keeping the role', async () => {
    users.getUserWithRole.mockResolvedValue(userWithRole('Administrator'));
    const next = mockNext();

    await protectLastAdmin(mockRequest({ method: 'PUT', params: { id: ID }, body: undefined }), mockResponse(), next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('responds 500 when a lookup fails', async () => {
    users.getUserWithRole.mockRejectedValue(new Error('db down'));
    const res = mockResponse();
    const next = mockNext();

    await protectLastAdmin(mockRequest({ method: 'DELETE', params: { id: ID } }), res, next);

    expectResponse(res, 500, { message: 'Failed to check the Administrator count.' });
    expect(next).not.toHaveBeenCalled();
  });
});
