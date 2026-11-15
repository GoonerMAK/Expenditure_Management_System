import prisma from '../../../src/db.js';
import * as auditLogRepository from '../../../src/repositories/audit-log.repository.js';
import { buildExpenseEntry, buildFinancialData, buildProject, ID, OTHER_ID, USER_ID } from '../helpers/factories.js';

jest.mock('../../../src/db.js', () => ({
  __esModule: true,
  default: { auditLog: { findMany: jest.fn() } },
}));

const db = prisma as unknown as { auditLog: { findMany: jest.Mock } };

const tx = { auditLog: { create: jest.fn() } };

describe('audit-log.repository', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('listChanges', () => {
    it('lists only the tracked fields whose value changed', () => {
      const before = buildProject();
      const after = buildProject({ project_name: 'Bridge Rebuild', updated_at: new Date() });

      expect(auditLogRepository.listChanges('Project', before, after)).toEqual([
        { field: 'project_name', from: 'Bridge Renovation', to: 'Bridge Rebuild' },
      ]);
    });

    it('stores dates as ISO strings so equal dates are not reported', () => {
      const before = buildProject();
      const after = buildProject({ end_date: new Date('2027-01-31T00:00:00.000Z') });

      expect(auditLogRepository.listChanges('Project', before, after)).toEqual([
        { field: 'end_date', from: '2026-12-31T00:00:00.000Z', to: '2027-01-31T00:00:00.000Z' },
      ]);
    });

    it('treats a cleared value as null', () => {
      const before = buildFinancialData();
      const after = buildFinancialData({ revised_budget: null });

      expect(auditLogRepository.listChanges('Budget', before, after)).toEqual([
        { field: 'revised_budget', from: 12000, to: null },
      ]);
    });

    it('lists every filled field of a new record', () => {
      const after = buildFinancialData({ revised_budget: null });

      expect(auditLogRepository.listChanges('Budget', {}, after)).toEqual([
        { field: 'year', from: null, to: 2026 },
        { field: 'month', from: null, to: 3 },
        { field: 'initial_budget', from: null, to: 10000 },
        { field: 'expenditure', from: null, to: 1500.5 },
      ]);
    });

    it('leaves out receipt file names and review ids', () => {
      const before = buildExpenseEntry();
      const after = buildExpenseEntry({ receipt_file: 'other.pdf', reviewed_by_id: USER_ID });

      expect(auditLogRepository.listChanges('Expense', before, after)).toEqual([]);
    });
  });

  describe('describeRecord', () => {
    it('names a project by its name', () => {
      expect(auditLogRepository.describeRecord('Project', buildProject())).toBe('Bridge Renovation');
    });

    it('names a budget month as year and two-digit month', () => {
      expect(auditLogRepository.describeRecord('Budget', buildFinancialData())).toBe('2026-03');
    });

    it('names an expense by its vendor', () => {
      expect(auditLogRepository.describeRecord('Expense', buildExpenseEntry())).toBe('Steel Supplies Ltd');
    });
  });

  describe('recordAudit', () => {
    it('saves the action, the user and the changes', async () => {
      await auditLogRepository.recordAudit(tx as never, 'Project', 'Updated', USER_ID, buildProject(), buildProject({ description: 'New scope' }));

      expect(tx.auditLog.create).toHaveBeenCalledWith({
        data: {
          entity: 'Project',
          action: 'Updated',
          entity_label: 'Bridge Renovation',
          project_id: ID,
          user_id: USER_ID,
          changes: [{ field: 'description', from: 'Renovate the river bridge', to: 'New scope' }],
        },
      });
    });

    it('names a deleted record and its project from its last saved values', async () => {
      await auditLogRepository.recordAudit(tx as never, 'Budget', 'Deleted', USER_ID, buildFinancialData(), null);

      expect(tx.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: 'Deleted', entity_label: '2026-03', project_id: OTHER_ID }),
      });
    });

    it('saves a missing user as null', async () => {
      await auditLogRepository.recordAudit(tx as never, 'Project', 'Created', undefined, null, buildProject());

      expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ user_id: null }) });
    });

    it('skips an update that changed nothing it tracks', async () => {
      await auditLogRepository.recordAudit(tx as never, 'Project', 'Updated', USER_ID, buildProject(), buildProject({ updated_at: new Date() }));

      expect(tx.auditLog.create).not.toHaveBeenCalled();
    });

    it('keeps an approval even when the status was already approved', async () => {
      await auditLogRepository.recordAudit(tx as never, 'Expense', 'Approved', USER_ID, buildExpenseEntry(), buildExpenseEntry());

      expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'Approved', changes: [] }) });
    });
  });

  describe('getProjectAuditLog', () => {
    it('lists the project history newest first with the user names', async () => {
      db.auditLog.findMany.mockResolvedValue([]);

      await auditLogRepository.getProjectAuditLog(ID);

      expect(db.auditLog.findMany).toHaveBeenCalledWith({
        where: { project_id: ID },
        include: { user: { select: { username: true, name: true, email: true } } },
        orderBy: { created_at: 'desc' },
      });
    });
  });
});
