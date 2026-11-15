import prisma from '../../../src/db.js';
import * as projectRepository from '../../../src/repositories/project.repository.js';
import { buildProject, buildUser } from '../helpers/factories.js';

jest.mock('../../../src/db.js', () => ({
  __esModule: true,
  default: {
    project: { findMany: jest.fn(), count: jest.fn() },
    financialData: { groupBy: jest.fn() },
    user: { findMany: jest.fn() },
  },
}));

const db = prisma as unknown as {
  project: { findMany: jest.Mock; count: jest.Mock };
  financialData: { groupBy: jest.Mock };
  user: { findMany: jest.Mock };
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
  afterEach(() => {
    jest.resetAllMocks();
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
});
