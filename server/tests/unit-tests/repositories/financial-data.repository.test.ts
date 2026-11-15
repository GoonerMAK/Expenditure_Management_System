import prisma from '../../../src/db.js';
import * as financialDataRepository from '../../../src/repositories/financial-data.repository.js';
import * as auditLogRepository from '../../../src/repositories/audit-log.repository.js';
import * as expenseEntryRepository from '../../../src/repositories/expense-entry.repository.js';
import { buildFinancialData, ID, OTHER_ID, USER_ID } from '../helpers/factories.js';

jest.mock('../../../src/db.js', () => ({
  __esModule: true,
  default: { $transaction: jest.fn() },
}));

jest.mock('../../../src/repositories/audit-log.repository.js');
jest.mock('../../../src/repositories/expense-entry.repository.js');

const db = prisma as unknown as { $transaction: jest.Mock };
const audit = jest.mocked(auditLogRepository);
const expenses = jest.mocked(expenseEntryRepository);

const tx = {
  financialData: {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findFirst: jest.fn(),
    findUniqueOrThrow: jest.fn(),
  },
};

describe('financial-data.repository', () => {
  beforeEach(() => {
    db.$transaction.mockImplementation((change) => change(tx));
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('createFinancialData', () => {
    it('records the saved month with who created it in the same transaction', async () => {
      const saved = buildFinancialData();
      tx.financialData.create.mockResolvedValue(saved);
      tx.financialData.findUniqueOrThrow.mockResolvedValue(saved);

      await expect(financialDataRepository.createFinancialData(2026, 3, 1500.5, 10000, 12000, OTHER_ID, 'Bridge Renovation', USER_ID))
        .resolves.toEqual(saved);

      expect(db.$transaction).toHaveBeenCalledTimes(1);
      expect(expenses.syncMonthIfItHasEntries).toHaveBeenCalledWith(tx, OTHER_ID, 2026, 3);
      expect(audit.recordAudit).toHaveBeenCalledWith(tx, 'Budget', 'Created', USER_ID, null, saved);
    });
  });

  describe('updateFinancialData', () => {
    it('records the month before the change and after its entries are summed', async () => {
      const before = buildFinancialData();
      const saved = buildFinancialData({ initial_budget: 15000 });
      tx.financialData.findFirst.mockResolvedValue(before);
      tx.financialData.update.mockResolvedValue(saved);
      tx.financialData.findUniqueOrThrow.mockResolvedValue(saved);

      await expect(financialDataRepository.updateFinancialData(OTHER_ID, undefined, undefined, undefined, 15000, undefined, undefined, undefined, USER_ID))
        .resolves.toEqual(saved);

      expect(tx.financialData.update).toHaveBeenCalledWith({ where: { id: ID }, data: { initial_budget: 15000 } });
      expect(audit.recordAudit).toHaveBeenCalledWith(tx, 'Budget', 'Updated', USER_ID, before, saved);
    });
  });

  describe('deleteFinancialData', () => {
    it('records the deleted month with who deleted it', async () => {
      const deleted = buildFinancialData();
      tx.financialData.delete.mockResolvedValue(deleted);

      await expect(financialDataRepository.deleteFinancialData(ID, USER_ID)).resolves.toEqual(deleted);

      expect(tx.financialData.delete).toHaveBeenCalledWith({ where: { id: ID } });
      expect(audit.recordAudit).toHaveBeenCalledWith(tx, 'Budget', 'Deleted', USER_ID, deleted, null);
    });
  });
});
