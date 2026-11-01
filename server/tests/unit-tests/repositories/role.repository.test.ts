import prisma from '../../../src/db.js';
import * as roleRepository from '../../../src/repositories/role.repository.js';
import { buildRole, ID, OTHER_ID } from '../helpers/factories.js';

jest.mock('../../../src/db.js', () => ({
  __esModule: true,
  default: { $transaction: jest.fn() },
}));

const db = prisma as unknown as { $transaction: jest.Mock };

const tx = {
  role: { upsert: jest.fn(), delete: jest.fn() },
  user: { updateMany: jest.fn() },
};

describe('role.repository deleteRole', () => {
  beforeEach(() => {
    db.$transaction.mockImplementation((change) => change(tx));
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('moves the role users to the default role before deleting it', async () => {
    const role = buildRole({ role_name: 'Auditor' });
    tx.role.upsert.mockResolvedValue(buildRole({ id: OTHER_ID, role_name: 'Read-only' }));
    tx.role.delete.mockResolvedValue(role);

    await expect(roleRepository.deleteRole(ID)).resolves.toEqual(role);

    expect(tx.role.upsert).toHaveBeenCalledWith({
      where: { role_name: 'Read-only' },
      update: {},
      create: { role_name: 'Read-only' },
    });
    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { role_id: ID },
      data: { role_id: OTHER_ID, role_name: 'Read-only' },
    });
    expect(tx.user.updateMany.mock.invocationCallOrder[0]).toBeLessThan(tx.role.delete.mock.invocationCallOrder[0]);
    expect(tx.role.delete).toHaveBeenCalledWith({ where: { id: ID } });
  });
});
