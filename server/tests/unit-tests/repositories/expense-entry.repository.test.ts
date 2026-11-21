import prisma from '../../../src/db.js';
import * as expenseEntryRepository from '../../../src/repositories/expense-entry.repository.js';
import * as budgetAlertRepository from '../../../src/repositories/budget-alert.repository.js';
import * as projectLockRepository from '../../../src/repositories/project-lock.repository.js';
import { buildExpenseEntry, buildProject, ID, OTHER_ID, USER_ID } from '../helpers/factories.js';

jest.mock('../../../src/db.js', () => ({
  __esModule: true,
  default: { $transaction: jest.fn(), expenseEntry: { findMany: jest.fn() } },
}));

jest.mock('../../../src/repositories/budget-alert.repository.js');
jest.mock('../../../src/repositories/project-lock.repository.js');

const alerts = jest.mocked(budgetAlertRepository);
const locks = jest.mocked(projectLockRepository);

const firstCall = (mock: jest.Mock) => mock.mock.invocationCallOrder[0];

const db = prisma as unknown as {
  $transaction: jest.Mock;
  expenseEntry: { findMany: jest.Mock };
};

const tx = {
  expenseEntry: {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findUnique: jest.fn(),
    aggregate: jest.fn(),
    count: jest.fn(),
  },
  financialData: { updateMany: jest.fn(), create: jest.fn() },
  project: { findUniqueOrThrow: jest.fn() },
  auditLog: { create: jest.fn() },
};

const auditRow = (action: string, changes: unknown[], entity_label = 'Steel Supplies Ltd') => ({
  data: {
    action,
    entity: 'Expense',
    entity_label,
    project_id: OTHER_ID,
    user_id: USER_ID,
    changes,
  },
});

const march = { gte: new Date('2026-03-01T00:00:00.000Z'), lt: new Date('2026-04-01T00:00:00.000Z') };
const april = { gte: new Date('2026-04-01T00:00:00.000Z'), lt: new Date('2026-05-01T00:00:00.000Z') };

const reviewer = { reviewed_by: { select: { username: true } } };

const approvedSum = (amount: number | null) => ({ _sum: { amount } });

const sumQuery = (range: typeof march) => ({
  where: { project_id: OTHER_ID, date: range, status: 'Approved' },
  _sum: { amount: true },
});

const monthUpdate = (month: number, expenditure: number) => ({
  where: { project_id: OTHER_ID, year: 2026, month },
  data: { expenditure },
});

describe('expense-entry.repository', () => {
  beforeEach(() => {
    db.$transaction.mockImplementation((change) => change(tx));
    tx.financialData.updateMany.mockResolvedValue({ count: 1 });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('syncMonthlyExpenditure', () => {
    it('sets the month to the sum of its approved entries only', async () => {
      tx.expenseEntry.aggregate.mockResolvedValue(approvedSum(250.756));

      await expenseEntryRepository.syncMonthlyExpenditure(tx as never, OTHER_ID, 2026, 3);

      expect(tx.expenseEntry.aggregate).toHaveBeenCalledWith(sumQuery(march));
      expect(tx.financialData.updateMany).toHaveBeenCalledWith(monthUpdate(3, 250.76));
      expect(tx.financialData.create).not.toHaveBeenCalled();
    });

    it('sets the month to 0 when none of its entries are approved', async () => {
      tx.expenseEntry.aggregate.mockResolvedValue(approvedSum(null));

      await expenseEntryRepository.syncMonthlyExpenditure(tx as never, OTHER_ID, 2026, 3);

      expect(tx.financialData.updateMany).toHaveBeenCalledWith(monthUpdate(3, 0));
    });

    it('creates the month row when the project has none for that month', async () => {
      tx.expenseEntry.aggregate.mockResolvedValue(approvedSum(100));
      tx.financialData.updateMany.mockResolvedValue({ count: 0 });
      tx.project.findUniqueOrThrow.mockResolvedValue(buildProject({ id: OTHER_ID }));

      await expenseEntryRepository.syncMonthlyExpenditure(tx as never, OTHER_ID, 2026, 3);

      expect(tx.financialData.create).toHaveBeenCalledWith({
        data: { year: 2026, month: 3, expenditure: 100, project_id: OTHER_ID, project_name: 'Bridge Renovation' },
      });
    });
  });

  describe('syncMonthIfItHasEntries', () => {
    it('counts entries of every status when checking the month', async () => {
      tx.expenseEntry.count.mockResolvedValue(1);
      tx.expenseEntry.aggregate.mockResolvedValue(approvedSum(null));

      await expenseEntryRepository.syncMonthIfItHasEntries(tx as never, OTHER_ID, 2026, 3);

      expect(tx.expenseEntry.count).toHaveBeenCalledWith({ where: { project_id: OTHER_ID, date: march } });
      expect(tx.financialData.updateMany).toHaveBeenCalledWith(monthUpdate(3, 0));
    });

    it('keeps the typed-in expenditure of a month without entries', async () => {
      tx.expenseEntry.count.mockResolvedValue(0);

      await expenseEntryRepository.syncMonthIfItHasEntries(tx as never, OTHER_ID, 2026, 3);

      expect(tx.expenseEntry.aggregate).not.toHaveBeenCalled();
      expect(tx.financialData.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('createExpenseEntry', () => {
    it('creates the entry and updates its month in the same transaction', async () => {
      const entry = { ...buildExpenseEntry({ status: 'Pending' }), reviewed_by: null };
      tx.expenseEntry.create.mockResolvedValue(entry);
      tx.expenseEntry.aggregate.mockResolvedValue(approvedSum(null));
      const data = { project_id: OTHER_ID, date: entry.date, vendor: 'Acme', amount: 10, status: 'Pending' as const };

      await expect(expenseEntryRepository.createExpenseEntry(data, USER_ID)).resolves.toEqual(entry);

      expect(db.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.expenseEntry.create).toHaveBeenCalledWith({ data, include: reviewer });
      expect(tx.expenseEntry.aggregate).toHaveBeenCalledWith(sumQuery(march));
      expect(tx.financialData.updateMany).toHaveBeenCalledWith(monthUpdate(3, 0));
      expect(alerts.checkBudgetAlert).toHaveBeenCalledWith(tx, OTHER_ID);
    });

    it('locks the project before creating the entry', async () => {
      tx.expenseEntry.create.mockResolvedValue({ ...buildExpenseEntry(), reviewed_by: null });
      tx.expenseEntry.aggregate.mockResolvedValue(approvedSum(null));

      await expenseEntryRepository.createExpenseEntry({ project_id: OTHER_ID, date: new Date('2026-03-12'), vendor: 'Acme', amount: 10 });

      expect(locks.lockProjects).toHaveBeenCalledWith(tx, OTHER_ID);
      expect(firstCall(locks.lockProjects)).toBeLessThan(firstCall(tx.expenseEntry.create));
    });

    it('records who created the entry in the same transaction', async () => {
      const entry = { ...buildExpenseEntry({ status: 'Pending' }), reviewed_by: null };
      tx.expenseEntry.create.mockResolvedValue(entry);
      tx.expenseEntry.aggregate.mockResolvedValue(approvedSum(null));

      await expenseEntryRepository.createExpenseEntry({ project_id: OTHER_ID, date: entry.date, vendor: 'Steel Supplies Ltd', amount: 250.75 }, USER_ID);

      expect(tx.auditLog.create).toHaveBeenCalledWith(auditRow('Created', [
        { field: 'date', from: null, to: '2026-03-12T00:00:00.000Z' },
        { field: 'vendor', from: null, to: 'Steel Supplies Ltd' },
        { field: 'amount', from: null, to: 250.75 },
        { field: 'notes', from: null, to: 'Rebar for the north pier' },
        { field: 'receipt_name', from: null, to: 'invoice-1042.pdf' },
        { field: 'status', from: null, to: 'Pending' },
      ]));
    });
  });

  describe('updateExpenseEntry', () => {
    it('applies a review and recalculates the month in the same transaction', async () => {
      const review = { status: 'Approved' as const, rejection_reason: null, reviewed_by_id: ID, reviewed_at: new Date() };
      tx.expenseEntry.findUnique.mockResolvedValue(buildExpenseEntry({ status: 'Pending' }));
      tx.expenseEntry.update.mockResolvedValue({ ...buildExpenseEntry(), reviewed_by: { username: 'admin' } });
      tx.expenseEntry.aggregate.mockResolvedValue(approvedSum(250.75));

      await expenseEntryRepository.updateExpenseEntry(ID, review, USER_ID, 'Approved');

      expect(db.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.expenseEntry.update).toHaveBeenCalledWith({ where: { id: ID }, data: review, include: reviewer });
      expect(tx.expenseEntry.aggregate).toHaveBeenCalledTimes(1);
      expect(tx.financialData.updateMany).toHaveBeenCalledWith(monthUpdate(3, 250.75));
      expect(alerts.checkBudgetAlert).toHaveBeenCalledWith(tx, OTHER_ID);
    });

    it('locks the project of the entry before changing it', async () => {
      tx.expenseEntry.findUnique.mockResolvedValue(buildExpenseEntry());
      tx.expenseEntry.update.mockResolvedValue({ ...buildExpenseEntry(), reviewed_by: null });
      tx.expenseEntry.aggregate.mockResolvedValue(approvedSum(250.75));

      await expenseEntryRepository.updateExpenseEntry(ID, { amount: 250.75 });

      expect(locks.lockProjects).toHaveBeenCalledWith(tx, OTHER_ID);
      expect(firstCall(locks.lockProjects)).toBeLessThan(firstCall(tx.expenseEntry.update));
    });

    it('records an approval as its own action with the status change', async () => {
      tx.expenseEntry.findUnique.mockResolvedValue(buildExpenseEntry({ status: 'Pending' }));
      tx.expenseEntry.update.mockResolvedValue({ ...buildExpenseEntry(), reviewed_by: { username: 'admin' } });
      tx.expenseEntry.aggregate.mockResolvedValue(approvedSum(250.75));

      await expenseEntryRepository.updateExpenseEntry(ID, { status: 'Approved' }, USER_ID, 'Approved');

      expect(tx.auditLog.create).toHaveBeenCalledWith(auditRow('Approved', [
        { field: 'status', from: 'Pending', to: 'Approved' },
      ]));
    });

    it('records a rejection with its reason', async () => {
      tx.expenseEntry.findUnique.mockResolvedValue(buildExpenseEntry({ status: 'Pending' }));
      tx.expenseEntry.update.mockResolvedValue({ ...buildExpenseEntry({ status: 'Rejected', rejection_reason: 'No receipt' }), reviewed_by: null });
      tx.expenseEntry.aggregate.mockResolvedValue(approvedSum(0));

      await expenseEntryRepository.updateExpenseEntry(ID, { status: 'Rejected', rejection_reason: 'No receipt' }, USER_ID, 'Rejected');

      expect(tx.auditLog.create).toHaveBeenCalledWith(auditRow('Rejected', [
        { field: 'status', from: 'Pending', to: 'Rejected' },
        { field: 'rejection_reason', from: null, to: 'No receipt' },
      ]));
    });

    it('records an edit as an update with only the fields that changed', async () => {
      tx.expenseEntry.findUnique.mockResolvedValue(buildExpenseEntry());
      tx.expenseEntry.update.mockResolvedValue({ ...buildExpenseEntry({ amount: 300, vendor: 'Acme' }), reviewed_by: null });
      tx.expenseEntry.aggregate.mockResolvedValue(approvedSum(300));

      await expenseEntryRepository.updateExpenseEntry(ID, { amount: 300, vendor: 'Acme' }, USER_ID);

      expect(tx.auditLog.create).toHaveBeenCalledWith(auditRow('Updated', [
        { field: 'vendor', from: 'Steel Supplies Ltd', to: 'Acme' },
        { field: 'amount', from: 250.75, to: 300 },
      ], 'Acme'));
    });

    it('skips the history when an edit changes nothing it tracks', async () => {
      tx.expenseEntry.findUnique.mockResolvedValue(buildExpenseEntry());
      tx.expenseEntry.update.mockResolvedValue({ ...buildExpenseEntry({ receipt_file: 'replaced.pdf' }), reviewed_by: null });
      tx.expenseEntry.aggregate.mockResolvedValue(approvedSum(250.75));

      await expenseEntryRepository.updateExpenseEntry(ID, { receipt_file: 'replaced.pdf' }, USER_ID);

      expect(tx.auditLog.create).not.toHaveBeenCalled();
    });

    it('recalculates both months when the entry moves to another month', async () => {
      tx.expenseEntry.findUnique.mockResolvedValue(buildExpenseEntry());
      tx.expenseEntry.update.mockResolvedValue({ ...buildExpenseEntry({ date: new Date('2026-04-02T00:00:00.000Z') }), reviewed_by: null });
      tx.expenseEntry.aggregate.mockResolvedValue(approvedSum(0));

      await expenseEntryRepository.updateExpenseEntry(ID, { date: new Date('2026-04-02T00:00:00.000Z') });

      expect(tx.expenseEntry.aggregate).toHaveBeenNthCalledWith(1, sumQuery(april));
      expect(tx.expenseEntry.aggregate).toHaveBeenNthCalledWith(2, sumQuery(march));
    });

    it('returns null without changes when the entry does not exist', async () => {
      tx.expenseEntry.findUnique.mockResolvedValue(null);

      await expect(expenseEntryRepository.updateExpenseEntry(ID, { status: 'Approved' })).resolves.toBeNull();

      expect(tx.expenseEntry.update).not.toHaveBeenCalled();
      expect(tx.financialData.updateMany).not.toHaveBeenCalled();
      expect(tx.auditLog.create).not.toHaveBeenCalled();
      expect(alerts.checkBudgetAlert).not.toHaveBeenCalled();
      expect(locks.lockProjects).not.toHaveBeenCalled();
    });
  });

  describe('deleteExpenseEntry', () => {
    it('deletes the entry and recalculates its month in the same transaction', async () => {
      const entry = buildExpenseEntry();
      tx.expenseEntry.findUnique.mockResolvedValue(entry);
      tx.expenseEntry.aggregate.mockResolvedValue(approvedSum(null));

      await expect(expenseEntryRepository.deleteExpenseEntry(ID, USER_ID)).resolves.toEqual(entry);

      expect(tx.expenseEntry.delete).toHaveBeenCalledWith({ where: { id: ID } });
      expect(tx.financialData.updateMany).toHaveBeenCalledWith(monthUpdate(3, 0));
      expect(alerts.checkBudgetAlert).toHaveBeenCalledWith(tx, OTHER_ID);
    });

    it('locks the project of the entry before deleting it', async () => {
      tx.expenseEntry.findUnique.mockResolvedValue(buildExpenseEntry());
      tx.expenseEntry.aggregate.mockResolvedValue(approvedSum(null));

      await expenseEntryRepository.deleteExpenseEntry(ID);

      expect(locks.lockProjects).toHaveBeenCalledWith(tx, OTHER_ID);
      expect(firstCall(locks.lockProjects)).toBeLessThan(firstCall(tx.expenseEntry.delete));
    });

    it('records who deleted the entry and what it held', async () => {
      tx.expenseEntry.findUnique.mockResolvedValue(buildExpenseEntry());
      tx.expenseEntry.aggregate.mockResolvedValue(approvedSum(null));

      await expenseEntryRepository.deleteExpenseEntry(ID, USER_ID);

      expect(tx.auditLog.create).toHaveBeenCalledWith(auditRow('Deleted', [
        { field: 'date', from: '2026-03-12T00:00:00.000Z', to: null },
        { field: 'vendor', from: 'Steel Supplies Ltd', to: null },
        { field: 'amount', from: 250.75, to: null },
        { field: 'notes', from: 'Rebar for the north pier', to: null },
        { field: 'receipt_name', from: 'invoice-1042.pdf', to: null },
        { field: 'status', from: 'Approved', to: null },
      ]));
    });

    it('returns null when the entry does not exist', async () => {
      tx.expenseEntry.findUnique.mockResolvedValue(null);

      await expect(expenseEntryRepository.deleteExpenseEntry(ID)).resolves.toBeNull();

      expect(tx.expenseEntry.delete).not.toHaveBeenCalled();
    });
  });

  describe('getExpenseEntriesByProject', () => {
    it('lists the entries newest first with the reviewer name', async () => {
      db.expenseEntry.findMany.mockResolvedValue([]);

      await expenseEntryRepository.getExpenseEntriesByProject(OTHER_ID);

      expect(db.expenseEntry.findMany).toHaveBeenCalledWith({
        where: { project_id: OTHER_ID },
        include: reviewer,
        orderBy: [{ date: 'desc' }, { created_at: 'desc' }],
      });
    });
  });
});
