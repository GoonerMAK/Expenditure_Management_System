import prisma from '../../../src/db.js';
import * as userRepository from '../../../src/repositories/user.repository.js';
import { LastAdminError } from '../../../src/roles.js';
import { buildRole, buildUser, ID, OTHER_ID } from '../helpers/factories.js';

jest.mock('../../../src/db.js', () => ({
  __esModule: true,
  default: { $transaction: jest.fn(), role: { findUnique: jest.fn() } },
}));

const db = prisma as unknown as { $transaction: jest.Mock; role: { findUnique: jest.Mock } };

const tx = {
  $queryRaw: jest.fn(),
  user: { count: jest.fn(), update: jest.fn(), delete: jest.fn() },
};

const adminCounts = (before: number, after: number) => {
  tx.user.count.mockResolvedValueOnce(before).mockResolvedValueOnce(after);
};

describe('user.repository last Administrator guard', () => {
  beforeEach(() => {
    db.$transaction.mockImplementation((change) => change(tx));
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('locks the Administrator role before counting admins', async () => {
    adminCounts(2, 1);
    tx.user.delete.mockResolvedValue(buildUser());

    await userRepository.deleteUser(ID);

    expect(tx.$queryRaw.mock.calls[0][1]).toBe('Administrator');
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.user.count.mock.invocationCallOrder[0]);
    expect(tx.user.count).toHaveBeenCalledWith({ where: { role: { role_name: 'Administrator' } } });
  });

  it('rejects deleting the last Administrator', async () => {
    adminCounts(1, 0);

    await expect(userRepository.deleteUser(ID)).rejects.toBeInstanceOf(LastAdminError);
    expect(tx.user.delete).toHaveBeenCalledWith({ where: { id: ID } });
  });

  it('rejects demoting the last Administrator', async () => {
    db.role.findUnique.mockResolvedValue(buildRole({ id: OTHER_ID, role_name: 'Read-only' }));
    adminCounts(1, 0);

    await expect(userRepository.updateUser(ID, { role_name: 'Read-only' })).rejects.toBeInstanceOf(LastAdminError);
    expect(tx.user.update).toHaveBeenCalledWith({ where: { id: ID }, data: { role_name: 'Read-only', role_id: OTHER_ID } });
  });

  it('deletes an Administrator while another one remains', async () => {
    const user = buildUser();
    adminCounts(2, 1);
    tx.user.delete.mockResolvedValue(user);

    await expect(userRepository.deleteUser(ID)).resolves.toEqual(user);
  });

  it('allows changes while no Administrator exists yet', async () => {
    const user = buildUser();
    adminCounts(0, 0);
    tx.user.update.mockResolvedValue(user);

    await expect(userRepository.updateUser(ID, { name: 'Jane Doe' })).resolves.toEqual(user);
  });
});
