import { protectBuiltInRoles } from '../../../src/middlewares/role.middleware.js';
import * as roleRepository from '../../../src/repositories/role.repository.js';
import { buildRole, ID } from '../helpers/factories.js';
import { expectResponse, mockNext, mockRequest, mockResponse } from '../helpers/express.js';

jest.mock('../../../src/repositories/role.repository.js');

const roles = jest.mocked(roleRepository);

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
