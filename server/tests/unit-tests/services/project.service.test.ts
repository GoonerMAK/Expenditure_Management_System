import * as projectService from '../../../src/services/project.service.js';
import * as projectRepository from '../../../src/repositories/project.repository.js';
import { buildProject, ID, OTHER_ID } from '../helpers/factories.js';

jest.mock('../../../src/repositories/project.repository.js');

const repo = jest.mocked(projectRepository);

const START = new Date('2026-02-01T00:00:00.000Z');
const END = new Date('2026-12-31T00:00:00.000Z');

describe('project.service', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('createProject', () => {
    it('forwards every field to the repository in order and returns the result', async () => {
      const project = buildProject();
      repo.createProject.mockResolvedValue(project);

      const result = await projectService.createProject(
        'Bridge Renovation',
        'Renovate the river bridge',
        OTHER_ID,
        'Infrastructure',
        START,
        END,
        OTHER_ID,
      );

      expect(result).toEqual(project);
      expect(repo.createProject).toHaveBeenCalledWith(
        'Bridge Renovation',
        'Renovate the river bridge',
        OTHER_ID,
        'Infrastructure',
        START,
        END,
        OTHER_ID,
      );
    });

    it('passes omitted optional fields through as undefined', async () => {
      repo.createProject.mockResolvedValue(buildProject({ description: null }));

      await projectService.createProject('Bridge Renovation');

      expect(repo.createProject).toHaveBeenCalledWith(
        'Bridge Renovation',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );
    });

    it('wraps repository errors', async () => {
      repo.createProject.mockRejectedValue(new Error('Unique constraint failed on project_name'));

      await expect(projectService.createProject('Bridge Renovation')).rejects.toThrow(
        'Failed to create project: Error: Unique constraint failed on project_name',
      );
    });
  });

  describe('updateProject', () => {
    it('forwards every field to the repository in order and returns the result', async () => {
      const project = buildProject({ project_name: 'Bridge Rebuild' });
      repo.updateProject.mockResolvedValue(project);

      const result = await projectService.updateProject(
        ID,
        'Bridge Rebuild',
        'Rebuild',
        OTHER_ID,
        'Infrastructure',
        START,
        END,
        OTHER_ID,
      );

      expect(result).toEqual(project);
      expect(repo.updateProject).toHaveBeenCalledWith(
        ID,
        'Bridge Rebuild',
        'Rebuild',
        OTHER_ID,
        'Infrastructure',
        START,
        END,
        OTHER_ID,
      );
    });

    it('supports a partial update with only the id', async () => {
      repo.updateProject.mockResolvedValue(buildProject());

      await projectService.updateProject(ID);

      expect(repo.updateProject).toHaveBeenCalledWith(
        ID,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );
    });

    it('throws a not-found error when the repository returns null', async () => {
      repo.updateProject.mockResolvedValue(null);

      await expect(projectService.updateProject(ID, 'Bridge Rebuild')).rejects.toThrow(
        `Failed to update project: Error: Project with id ${ID} not found`,
      );
    });

    it('wraps repository errors', async () => {
      repo.updateProject.mockRejectedValue(new Error('Record to update not found'));

      await expect(projectService.updateProject(ID, 'Bridge Rebuild')).rejects.toThrow(
        'Failed to update project: Error: Record to update not found',
      );
    });
  });

  describe('deleteProject', () => {
    it('returns the deleted project', async () => {
      const project = buildProject();
      repo.deleteProject.mockResolvedValue(project);

      await expect(projectService.deleteProject(ID)).resolves.toEqual(project);
      expect(repo.deleteProject).toHaveBeenCalledWith(ID);
    });

    it('throws a not-found error when the repository returns null', async () => {
      repo.deleteProject.mockResolvedValue(null);

      await expect(projectService.deleteProject(ID)).rejects.toThrow(
        `Failed to delete project: Error: Project with id ${ID} not found`,
      );
    });

    it('wraps repository errors', async () => {
      repo.deleteProject.mockRejectedValue(new Error('timeout'));

      await expect(projectService.deleteProject(ID)).rejects.toThrow('Failed to delete project: Error: timeout');
    });
  });

  describe('getAllProjects', () => {
    it('queries the page and the total count with the given offset and limit', async () => {
      repo.getAllProjects.mockResolvedValue([]);
      repo.getProjectsCount.mockResolvedValue(0);

      await projectService.getAllProjects(12, 6);

      expect(repo.getAllProjects).toHaveBeenCalledWith(12, 6);
      expect(repo.getProjectsCount).toHaveBeenCalledTimes(1);
    });

    it('returns the page data with pagination metadata', async () => {
      const projects = [buildProject(), buildProject({ id: OTHER_ID, project_name: 'School Expansion' })];
      repo.getAllProjects.mockResolvedValue(projects);
      repo.getProjectsCount.mockResolvedValue(14);

      await expect(projectService.getAllProjects(0, 6)).resolves.toEqual({
        data: projects,
        pagination: { offset: 0, limit: 6, totalItems: 14, totalPages: 3, hasMore: true },
      });
    });

    it.each`
      offset | limit | total | totalPages | hasMore
      ${0}   | ${6}  | ${0}  | ${0}       | ${false}
      ${0}   | ${6}  | ${6}  | ${1}       | ${false}
      ${0}   | ${6}  | ${7}  | ${2}       | ${true}
      ${6}   | ${6}  | ${12} | ${2}       | ${false}
      ${6}   | ${6}  | ${13} | ${3}       | ${true}
      ${12}  | ${6}  | ${13} | ${3}       | ${false}
      ${30}  | ${6}  | ${13} | ${3}       | ${false}
      ${0}   | ${1}  | ${3}  | ${3}       | ${true}
      ${0}   | ${100}| ${250}| ${3}       | ${true}
    `(
      'offset=$offset limit=$limit total=$total -> totalPages=$totalPages hasMore=$hasMore',
      async ({ offset, limit, total, totalPages, hasMore }) => {
        repo.getAllProjects.mockResolvedValue([]);
        repo.getProjectsCount.mockResolvedValue(total);

        const { pagination } = await projectService.getAllProjects(offset, limit);

        expect(pagination).toEqual({ offset, limit, totalItems: total, totalPages, hasMore });
      },
    );

    it('wraps an error from the page query', async () => {
      repo.getAllProjects.mockRejectedValue(new Error('timeout'));
      repo.getProjectsCount.mockResolvedValue(10);

      await expect(projectService.getAllProjects(0, 6)).rejects.toThrow('Failed to fetch projects: Error: timeout');
    });

    it('wraps an error from the count query', async () => {
      repo.getAllProjects.mockResolvedValue([]);
      repo.getProjectsCount.mockRejectedValue(new Error('count failed'));

      await expect(projectService.getAllProjects(0, 6)).rejects.toThrow('Failed to fetch projects: Error: count failed');
    });
  });

  describe('getProjectById', () => {
    it('returns the matching project', async () => {
      const project = buildProject();
      repo.getProjectById.mockResolvedValue(project);

      await expect(projectService.getProjectById(ID)).resolves.toEqual(project);
      expect(repo.getProjectById).toHaveBeenCalledWith(ID);
    });

    it('throws a not-found error when the repository returns null', async () => {
      repo.getProjectById.mockResolvedValue(null);

      await expect(projectService.getProjectById(ID)).rejects.toThrow(
        `Failed to fetch project: Error: Project with id ${ID} not found`,
      );
    });

    it('wraps repository errors', async () => {
      repo.getProjectById.mockRejectedValue(new Error('timeout'));

      await expect(projectService.getProjectById(ID)).rejects.toThrow('Failed to fetch project: Error: timeout');
    });
  });

  const entry = (expenditure: number | null, initial_budget: number | null, revised_budget: number | null) => ({
    expenditure,
    initial_budget,
    revised_budget,
  });

  const inCategory = (category_id: string, category_name: string) => ({ category_id, category_name });

  describe('getBudgetSummary', () => {
    it('totals each project, preferring the revised budget over the initial one', async () => {
      repo.getProjectsWithFinancialData.mockResolvedValue([
        { id: ID, project_name: 'Bridge', ...inCategory('c1', 'Roads'), financial_data: [entry(300, 1000, null), entry(200, 1000, 1500)] },
      ]);

      const summary = await projectService.getBudgetSummary();

      expect(summary.projects).toEqual([
        {
          project_id: ID,
          project_name: 'Bridge',
          budget: 2500,
          spent: 500,
          remaining: 2000,
          percent_used: 20,
          over_budget: false,
        },
      ]);
    });

    it('builds overall totals and counts over-budget projects', async () => {
      repo.getProjectsWithFinancialData.mockResolvedValue([
        { id: ID, project_name: 'Bridge', ...inCategory('c1', 'Roads'), financial_data: [entry(1200, 1000, null)] },
        { id: OTHER_ID, project_name: 'Road', ...inCategory('c1', 'Roads'), financial_data: [entry(100, 2000, null)] },
      ]);

      const summary = await projectService.getBudgetSummary();

      expect(summary.projects[0]).toEqual(expect.objectContaining({ remaining: -200, percent_used: 120, over_budget: true }));
      expect(summary.overall).toEqual({
        budget: 3000,
        spent: 1300,
        remaining: 1700,
        percent_used: 43.3,
        over_budget: false,
        over_budget_count: 1,
      });
    });

    it('treats missing amounts as zero and leaves percent empty when there is no budget', async () => {
      repo.getProjectsWithFinancialData.mockResolvedValue([
        { id: ID, project_name: 'Empty', ...inCategory('c1', 'Roads'), financial_data: [entry(null, null, null)] },
        { id: OTHER_ID, project_name: 'No budget', ...inCategory('c1', 'Roads'), financial_data: [entry(50, null, null)] },
      ]);

      const summary = await projectService.getBudgetSummary();

      expect(summary.projects[0]).toEqual(expect.objectContaining({ budget: 0, spent: 0, percent_used: null, over_budget: false }));
      expect(summary.projects[1]).toEqual(expect.objectContaining({ budget: 0, spent: 50, percent_used: null, over_budget: true }));
    });

    it('returns zero totals when there are no projects', async () => {
      repo.getProjectsWithFinancialData.mockResolvedValue([]);

      await expect(projectService.getBudgetSummary()).resolves.toEqual({
        overall: { budget: 0, spent: 0, remaining: 0, percent_used: null, over_budget: false, over_budget_count: 0 },
        projects: [],
      });
    });

    it('wraps repository errors', async () => {
      repo.getProjectsWithFinancialData.mockRejectedValue(new Error('timeout'));

      await expect(projectService.getBudgetSummary()).rejects.toThrow('Failed to fetch budget summary: Error: timeout');
    });
  });

  describe('getBudgetByCategory', () => {
    it('adds up budget and spend for all projects in each category, sorted by name', async () => {
      repo.getProjectsWithFinancialData.mockResolvedValue([
        { id: ID, project_name: 'Bridge', ...inCategory('c2', 'Roads'), financial_data: [entry(300, 1000, null)] },
        { id: OTHER_ID, project_name: 'School', ...inCategory('c1', 'Education'), financial_data: [entry(50, 500, 800)] },
        { id: 'p3', project_name: 'Tunnel', ...inCategory('c2', 'Roads'), financial_data: [entry(null, 2000, null), entry(400, null, null)] },
      ]);

      await expect(projectService.getBudgetByCategory()).resolves.toEqual([
        { category_id: 'c1', category_name: 'Education', budget: 800, spent: 50 },
        { category_id: 'c2', category_name: 'Roads', budget: 3000, spent: 700 },
      ]);
    });

    it('returns an empty list when there are no projects', async () => {
      repo.getProjectsWithFinancialData.mockResolvedValue([]);

      await expect(projectService.getBudgetByCategory()).resolves.toEqual([]);
    });

    it('wraps repository errors', async () => {
      repo.getProjectsWithFinancialData.mockRejectedValue(new Error('timeout'));

      await expect(projectService.getBudgetByCategory()).rejects.toThrow('Failed to fetch budget by category: Error: timeout');
    });
  });

  describe('getProjectTrend', () => {
    const dated = (year: number, month: number, ...amounts: [number | null, number | null, number | null]) => ({
      year,
      month,
      ...entry(...amounts),
    });

    it('groups entries by month and by year, keeping date order', async () => {
      repo.getProjectById.mockResolvedValue(buildProject({ project_name: 'Bridge' }));
      repo.getProjectFinancialData.mockResolvedValue([
        dated(2025, 12, 100, 500, null),
        dated(2026, 1, 200, 1000, 1200),
        dated(2026, 1, 50, null, null),
        dated(2026, 3, 300, 1000, null),
      ]);

      await expect(projectService.getProjectTrend(ID)).resolves.toEqual({
        project_id: ID,
        project_name: 'Bridge',
        monthly: [
          { year: 2025, month: 12, budget: 500, spent: 100 },
          { year: 2026, month: 1, budget: 1200, spent: 250 },
          { year: 2026, month: 3, budget: 1000, spent: 300 },
        ],
        yearly: [
          { year: 2025, budget: 500, spent: 100 },
          { year: 2026, budget: 2200, spent: 550 },
        ],
      });
      expect(repo.getProjectFinancialData).toHaveBeenCalledWith(ID);
    });

    it('returns empty series when the project has no financial data', async () => {
      repo.getProjectById.mockResolvedValue(buildProject());
      repo.getProjectFinancialData.mockResolvedValue([]);

      await expect(projectService.getProjectTrend(ID)).resolves.toEqual(
        expect.objectContaining({ monthly: [], yearly: [] }),
      );
    });

    it('returns null when the project does not exist', async () => {
      repo.getProjectById.mockResolvedValue(null);

      await expect(projectService.getProjectTrend(ID)).resolves.toBeNull();
      expect(repo.getProjectFinancialData).not.toHaveBeenCalled();
    });

    it('wraps repository errors', async () => {
      repo.getProjectById.mockRejectedValue(new Error('timeout'));

      await expect(projectService.getProjectTrend(ID)).rejects.toThrow('Failed to fetch project trend: Error: timeout');
    });
  });
});
