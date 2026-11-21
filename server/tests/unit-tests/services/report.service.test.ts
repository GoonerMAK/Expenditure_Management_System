import * as reportService from '../../../src/services/report.service.js';
import * as projectRepository from '../../../src/repositories/project.repository.js';
import * as categoryRepository from '../../../src/repositories/category.repository.js';
import { buildCategory, buildProject, ID } from '../helpers/factories.js';

jest.mock('../../../src/repositories/project.repository.js');
jest.mock('../../../src/repositories/category.repository.js');

const projects = jest.mocked(projectRepository);
const categories = jest.mocked(categoryRepository);

const dated = (year: number, month: number, expenditure: number | null, initial_budget: number | null, revised_budget: number | null) => ({
  year,
  month,
  expenditure,
  initial_budget,
  revised_budget,
});

const ENTRIES = [
  dated(2025, 12, 100, 500, null),
  dated(2026, 1, 200, 1000, 1200),
  dated(2026, 1, 50, null, null),
  dated(2026, 3, 1300, 1000, null),
];

const totals = (budget: number, spent: number, percent_used: number | null, over_budget = false) => ({
  budget,
  spent,
  remaining: budget - spent,
  percent_used,
  over_budget,
});

describe('report.service', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getProjectReport', () => {
    beforeEach(() => {
      projects.getProjectById.mockResolvedValue(buildProject({ project_name: 'Bridge' }));
      projects.getProjectFinancialData.mockResolvedValue(ENTRIES);
    });

    it('builds one row per month with the same totals as the dashboard', async () => {
      await expect(reportService.getProjectReport(ID, { period: 'monthly' })).resolves.toEqual({
        subject: 'Project',
        name: 'Bridge',
        period: 'monthly',
        year: null,
        rows: [
          { period: '2025-12', ...totals(500, 100, 20) },
          { period: '2026-01', ...totals(1200, 250, 20.8) },
          { period: '2026-03', ...totals(1000, 1300, 130, true) },
        ],
        total: totals(2700, 1650, 61.1),
      });
      expect(projects.getProjectFinancialData).toHaveBeenCalledWith(ID, undefined);
    });

    it('builds one row per year', async () => {
      const report = await reportService.getProjectReport(ID, { period: 'yearly' });

      expect(report?.rows).toEqual([
        { period: '2025', ...totals(500, 100, 20) },
        { period: '2026', ...totals(2200, 1550, 70.5) },
      ]);
    });

    it('loads only the chosen year and reports it in the rows and the total', async () => {
      projects.getProjectFinancialData.mockResolvedValue(ENTRIES.filter((entry) => entry.year === 2026));

      const report = await reportService.getProjectReport(ID, { period: 'monthly', year: 2026 });

      expect(projects.getProjectFinancialData).toHaveBeenCalledWith(ID, 2026);
      expect(report?.year).toBe(2026);
      expect(report?.rows.map((row) => row.period)).toEqual(['2026-01', '2026-03']);
      expect(report?.total).toEqual(totals(2200, 1550, 70.5));
    });

    it('returns no rows and zero totals when there is no data', async () => {
      projects.getProjectFinancialData.mockResolvedValue([]);

      const report = await reportService.getProjectReport(ID, { period: 'monthly' });

      expect(report?.rows).toEqual([]);
      expect(report?.total).toEqual(totals(0, 0, null));
    });

    it('returns null when the project does not exist', async () => {
      projects.getProjectById.mockResolvedValue(null);

      await expect(reportService.getProjectReport(ID, { period: 'monthly' })).resolves.toBeNull();
      expect(projects.getProjectFinancialData).not.toHaveBeenCalled();
    });

    it('wraps repository errors', async () => {
      projects.getProjectById.mockRejectedValue(new Error('timeout'));

      await expect(reportService.getProjectReport(ID, { period: 'monthly' })).rejects.toThrow(
        'Failed to build project report: Error: timeout',
      );
    });
  });

  describe('getCategoryReport', () => {
    it('builds the report from the financial data of every project in the category', async () => {
      categories.getCategoryById.mockResolvedValue(buildCategory({ category_name: 'Roads' }));
      projects.getCategoryFinancialData.mockResolvedValue(ENTRIES.filter((entry) => entry.year === 2025));

      const report = await reportService.getCategoryReport(ID, { period: 'yearly', year: 2025 });

      expect(categories.getCategoryById).toHaveBeenCalledWith(ID);
      expect(projects.getCategoryFinancialData).toHaveBeenCalledWith(ID, 2025);
      expect(report).toEqual({
        subject: 'Category',
        name: 'Roads',
        period: 'yearly',
        year: 2025,
        rows: [{ period: '2025', ...totals(500, 100, 20) }],
        total: totals(500, 100, 20),
      });
    });

    it('reports on projects without a category', async () => {
      projects.getCategoryFinancialData.mockResolvedValue([]);

      const report = await reportService.getCategoryReport('uncategorised', { period: 'monthly' });

      expect(categories.getCategoryById).not.toHaveBeenCalled();
      expect(projects.getCategoryFinancialData).toHaveBeenCalledWith(null, undefined);
      expect(report?.name).toBe('Uncategorised');
    });

    it('returns null when the category does not exist', async () => {
      categories.getCategoryById.mockResolvedValue(null);

      await expect(reportService.getCategoryReport(ID, { period: 'monthly' })).resolves.toBeNull();
      expect(projects.getCategoryFinancialData).not.toHaveBeenCalled();
    });

    it('wraps repository errors', async () => {
      categories.getCategoryById.mockRejectedValue(new Error('timeout'));

      await expect(reportService.getCategoryReport(ID, { period: 'monthly' })).rejects.toThrow(
        'Failed to build category report: Error: timeout',
      );
    });
  });
});
