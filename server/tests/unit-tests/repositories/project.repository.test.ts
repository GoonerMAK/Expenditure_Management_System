import prisma from '../../../src/db.js';
import * as projectRepository from '../../../src/repositories/project.repository.js';
import * as auditLogRepository from '../../../src/repositories/audit-log.repository.js';
import * as budgetAlertRepository from '../../../src/repositories/budget-alert.repository.js';
import { buildProject, buildUser, ID, OTHER_ID, USER_ID } from '../helpers/factories.js';

jest.mock('../../../src/db.js', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(),
    project: { findMany: jest.fn(), count: jest.fn() },
    financialData: { groupBy: jest.fn(), findMany: jest.fn() },
    user: { findMany: jest.fn() },
  },
}));

jest.mock('../../../src/repositories/audit-log.repository.js');
jest.mock('../../../src/repositories/budget-alert.repository.js');

const db = prisma as unknown as {
  $transaction: jest.Mock;
  project: { findMany: jest.Mock; count: jest.Mock };
  financialData: { groupBy: jest.Mock; findMany: jest.Mock };
  user: { findMany: jest.Mock };
};

const audit = jest.mocked(auditLogRepository);
const alerts = jest.mocked(budgetAlertRepository);

const tx = {
  project: { create: jest.fn(), update: jest.fn(), delete: jest.fn(), findUnique: jest.fn() },
};

const FROM = new Date('2026-01-01T00:00:00.000Z');
const TO = new Date('2026-03-31T00:00:00.000Z');
const DAY_AFTER_TO = new Date('2026-04-01T00:00:00.000Z');

const spend = (project_id: string, expenditure: number | null) => ({ project_id, _sum: { expenditure } });

const mockSpendData = (ids: string[], totals: ReturnType<typeof spend>[]) => {
  db.project.findMany.mockImplementation((args) => {
    if (args.select) {
      return Promise.resolve(ids.map((id) => ({ id })));
    }
    return Promise.resolve([...args.where.id.in].reverse().map((id: string) => buildProject({ id, project_name: id })));
  });
  db.financialData.groupBy.mockResolvedValue(totals);
};

const pageNames = (projects: { project_name: string }[]) => projects.map((project) => project.project_name);

describe('project.repository', () => {
  beforeEach(() => {
    db.$transaction.mockImplementation((change) => change(tx));
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('createProject', () => {
    it('creates the project and records who created it in the same transaction', async () => {
      const project = buildProject();
      tx.project.create.mockResolvedValue(project);

      await expect(projectRepository.createProject('Bridge Renovation', undefined, OTHER_ID, 'Infrastructure', undefined, undefined, USER_ID))
        .resolves.toEqual(project);

      expect(db.$transaction).toHaveBeenCalledTimes(1);
      expect(audit.recordAudit).toHaveBeenCalledWith(tx, 'Project', 'Created', USER_ID, null, project);
    });

    it('saves the alert threshold when one is given', async () => {
      tx.project.create.mockResolvedValue(buildProject({ alert_threshold: 90 }));

      await projectRepository.createProject('Bridge Renovation', undefined, OTHER_ID, 'Infrastructure', undefined, undefined, USER_ID, 90);

      expect(tx.project.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ alert_threshold: 90 }),
      }));
    });
  });

  describe('updateProject', () => {
    it('records the project before and after the change with who changed it', async () => {
      const before = buildProject();
      const after = buildProject({ project_name: 'Bridge Rebuild' });
      tx.project.findUnique.mockResolvedValue(before);
      tx.project.update.mockResolvedValue(after);

      await expect(projectRepository.updateProject(ID, 'Bridge Rebuild', undefined, undefined, undefined, undefined, undefined, undefined, USER_ID))
        .resolves.toEqual(after);

      expect(tx.project.update).toHaveBeenCalledWith({ where: { id: ID }, data: { project_name: 'Bridge Rebuild' } });
      expect(audit.recordAudit).toHaveBeenCalledWith(tx, 'Project', 'Updated', USER_ID, before, after);
      expect(alerts.checkBudgetAlert).toHaveBeenCalledWith(tx, ID);
    });

    it('changes the alert threshold and checks the budget alert against it', async () => {
      const before = buildProject();
      const after = buildProject({ alert_threshold: 50 });
      tx.project.findUnique.mockResolvedValue(before);
      tx.project.update.mockResolvedValue(after);

      await projectRepository.updateProject(ID, undefined, undefined, undefined, undefined, undefined, undefined, undefined, USER_ID, 50);

      expect(tx.project.update).toHaveBeenCalledWith({ where: { id: ID }, data: { alert_threshold: 50 } });
      expect(alerts.checkBudgetAlert).toHaveBeenCalledWith(tx, ID);
    });

    it('records nothing when the update fails', async () => {
      tx.project.findUnique.mockResolvedValue(null);
      tx.project.update.mockRejectedValue(new Error('Record to update not found'));

      await expect(projectRepository.updateProject(ID, 'Bridge Rebuild')).rejects.toThrow('Record to update not found');

      expect(audit.recordAudit).not.toHaveBeenCalled();
      expect(alerts.checkBudgetAlert).not.toHaveBeenCalled();
    });
  });

  describe('deleteProject', () => {
    it('records the deleted project with who deleted it', async () => {
      const project = buildProject();
      tx.project.delete.mockResolvedValue(project);

      await expect(projectRepository.deleteProject(ID, USER_ID)).resolves.toEqual(project);

      expect(tx.project.delete).toHaveBeenCalledWith({ where: { id: ID } });
      expect(audit.recordAudit).toHaveBeenCalledWith(tx, 'Project', 'Deleted', USER_ID, project, null);
    });
  });

  describe('buildProjectFilter', () => {
    it('has no conditions when no filter is given', () => {
      expect(projectRepository.buildProjectFilter()).toEqual({ AND: [] });
    });

    it('matches any part of the name ignoring case', () => {
      expect(projectRepository.buildProjectFilter({ search: 'bridge' })).toEqual({
        AND: [{ project_name: { contains: 'bridge', mode: 'insensitive' } }],
      });
    });

    it('filters by category and owner', () => {
      expect(projectRepository.buildProjectFilter({ category: 'c1', owner: 'u1' })).toEqual({
        AND: [{ category_id: 'c1' }, { created_by_id: 'u1' }],
      });
    });

    it('keeps projects whose period overlaps the range, counting no end date as ongoing', () => {
      expect(projectRepository.buildProjectFilter({ from: FROM, to: TO })).toEqual({
        AND: [
          { start_date: { not: null } },
          { start_date: { lt: DAY_AFTER_TO } },
          { OR: [{ end_date: null }, { end_date: { gte: FROM } }] },
        ],
      });
    });

    it('needs only a start date and an end after the from date when to is empty', () => {
      expect(projectRepository.buildProjectFilter({ from: FROM })).toEqual({
        AND: [{ start_date: { not: null } }, { OR: [{ end_date: null }, { end_date: { gte: FROM } }] }],
      });
    });

    it('needs only a start date up to the to date when from is empty', () => {
      expect(projectRepository.buildProjectFilter({ to: TO })).toEqual({
        AND: [{ start_date: { not: null } }, { start_date: { lt: DAY_AFTER_TO } }],
      });
    });
  });

  describe('getAllProjects', () => {
    it('keeps the created date order by default', async () => {
      db.project.findMany.mockResolvedValue([]);

      await projectRepository.getAllProjects(6, 6);

      expect(db.project.findMany).toHaveBeenCalledWith({
        where: { AND: [] },
        skip: 6,
        take: 6,
        orderBy: [{ created_at: 'asc' }],
      });
    });

    it('applies the filters to the page query', async () => {
      db.project.findMany.mockResolvedValue([]);

      await projectRepository.getAllProjects(0, 6, { owner: 'u1' });

      expect(db.project.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { AND: [{ created_by_id: 'u1' }] } }));
    });

    it.each`
      sort                 | orderBy
      ${'name_asc'}        | ${[{ project_name: 'asc' }]}
      ${'name_desc'}       | ${[{ project_name: 'desc' }]}
      ${'start_date_desc'} | ${[{ start_date: { sort: 'desc', nulls: 'last' } }, { created_at: 'asc' }]}
      ${'start_date_asc'}  | ${[{ start_date: { sort: 'asc', nulls: 'last' } }, { created_at: 'asc' }]}
    `('orders by $sort', async ({ sort, orderBy }) => {
      db.project.findMany.mockResolvedValue([]);

      await projectRepository.getAllProjects(0, 6, {}, sort);

      expect(db.project.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy }));
    });

    describe('sorting by spend', () => {
      it('sums the expenditure of the filtered projects', async () => {
        mockSpendData([], []);

        await projectRepository.getAllProjects(0, 6, { search: 'bridge' }, 'spend_desc');

        const where = { AND: [{ project_name: { contains: 'bridge', mode: 'insensitive' } }] };
        expect(db.financialData.groupBy).toHaveBeenCalledWith({
          by: ['project_id'],
          where: { project: where },
          _sum: { expenditure: true },
        });
        expect(db.project.findMany).toHaveBeenCalledWith({ where, select: { id: true }, orderBy: [{ created_at: 'asc' }] });
      });

      it('puts the highest spend first and projects without spend last', async () => {
        mockSpendData(['none', 'low', 'zero', 'high', 'empty'], [spend('low', 100), spend('zero', 0), spend('high', 900), spend('empty', null)]);

        const projects = await projectRepository.getAllProjects(0, 6, {}, 'spend_desc');

        expect(pageNames(projects)).toEqual(['high', 'low', 'none', 'zero', 'empty']);
      });

      it('puts the lowest spend first and projects without spend last', async () => {
        mockSpendData(['none', 'low', 'high', 'mid'], [spend('low', 100), spend('high', 900), spend('mid', 500)]);

        const projects = await projectRepository.getAllProjects(0, 6, {}, 'spend_asc');

        expect(pageNames(projects)).toEqual(['low', 'mid', 'high', 'none']);
      });

      it('returns only the requested page in spend order', async () => {
        mockSpendData(['a', 'b', 'c', 'd'], [spend('a', 1), spend('b', 2), spend('c', 3), spend('d', 4)]);

        const projects = await projectRepository.getAllProjects(1, 2, {}, 'spend_desc');

        expect(db.project.findMany).toHaveBeenLastCalledWith({ where: { id: { in: ['c', 'b'] } } });
        expect(pageNames(projects)).toEqual(['c', 'b']);
      });

      it('skips a project removed between the queries', async () => {
        mockSpendData(['a', 'b'], [spend('a', 1), spend('b', 2)]);
        db.project.findMany.mockImplementation((args) =>
          Promise.resolve(args.select ? [{ id: 'a' }, { id: 'b' }] : [buildProject({ id: 'a', project_name: 'a' })]),
        );

        const projects = await projectRepository.getAllProjects(0, 6, {}, 'spend_desc');

        expect(pageNames(projects)).toEqual(['a']);
      });
    });
  });

  describe('getProjectsCount', () => {
    it('counts every project without filters', async () => {
      db.project.count.mockResolvedValue(3);

      await expect(projectRepository.getProjectsCount()).resolves.toBe(3);
      expect(db.project.count).toHaveBeenCalledWith({ where: { AND: [] } });
    });

    it('counts only the filtered projects', async () => {
      db.project.count.mockResolvedValue(1);

      await projectRepository.getProjectsCount({ category: 'c1' });

      expect(db.project.count).toHaveBeenCalledWith({ where: { AND: [{ category_id: 'c1' }] } });
    });
  });

  describe('getProjectOwners', () => {
    it('lists the users who created at least one project', async () => {
      const owner = buildUser();
      db.user.findMany.mockResolvedValue([owner]);

      await expect(projectRepository.getProjectOwners()).resolves.toEqual([owner]);
      expect(db.user.findMany).toHaveBeenCalledWith({
        where: { projects: { some: {} } },
        select: { id: true, username: true, name: true, email: true },
      });
    });
  });

  describe('getCategoryFinancialData', () => {
    it.each([['c1'], [null]])('reads the financial data of every project in category %p by date', async (category_id) => {
      const entries = [{ year: 2026, month: 1, expenditure: 10, initial_budget: 100, revised_budget: null }];
      db.financialData.findMany.mockResolvedValue(entries);

      await expect(projectRepository.getCategoryFinancialData(category_id)).resolves.toEqual(entries);
      expect(db.financialData.findMany).toHaveBeenCalledWith({
        where: { project: { category_id } },
        select: { year: true, month: true, expenditure: true, initial_budget: true, revised_budget: true },
        orderBy: [{ year: 'asc' }, { month: 'asc' }],
      });
    });

    it('reads only the chosen year when one is given', async () => {
      db.financialData.findMany.mockResolvedValue([]);

      await projectRepository.getCategoryFinancialData('c1', 2026);

      expect(db.financialData.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { project: { category_id: 'c1' }, year: 2026 } }));
    });
  });

  describe('getProjectFinancialData', () => {
    it('reads the financial data of the project by date', async () => {
      db.financialData.findMany.mockResolvedValue([]);

      await projectRepository.getProjectFinancialData(ID);

      expect(db.financialData.findMany).toHaveBeenCalledWith({
        where: { project_id: ID },
        select: { year: true, month: true, expenditure: true, initial_budget: true, revised_budget: true },
        orderBy: [{ year: 'asc' }, { month: 'asc' }],
      });
    });

    it('reads only the chosen year when one is given', async () => {
      db.financialData.findMany.mockResolvedValue([]);

      await projectRepository.getProjectFinancialData(ID, 2026);

      expect(db.financialData.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { project_id: ID, year: 2026 } }));
    });
  });
});
