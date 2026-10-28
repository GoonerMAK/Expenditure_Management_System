import { test, expect, type APIRequestContext } from '@playwright/test';
import { apiAs, createProject, getCategory, loginInUi, runId, type FinancialEntry } from './helpers';

// Budget vs actual summary on the dashboard; test data is kept for reference.

const createProjectWithSpend = async (
  api: APIRequestContext,
  name: string,
  amounts: Omit<FinancialEntry, 'year' | 'month'>,
) => createProject(api, await getCategory(api), name, [{ year: 2026, month: 3, ...amounts }]);

test.describe('budget summary', () => {
  test('API totals a project, using the revised budget when set', async () => {
    const { api } = await apiAs('contributor');
    const project = await createProjectWithSpend(api, `E2E Budget Within ${runId()}`, {
      expenditure: 1200,
      initial_budget: 2000,
      revised_budget: 3000,
    });

    const summary = await (await api.get('projects/summary')).json();
    const totals = summary.projects.find((p: { project_id: string }) => p.project_id === project.id);

    expect(totals).toEqual({
      project_id: project.id,
      project_name: project.project_name,
      budget: 3000,
      spent: 1200,
      remaining: 1800,
      percent_used: 40,
      over_budget: false,
    });
  });

  test('Read-only users can see the summary', async () => {
    const { api } = await apiAs('readOnly');

    const res = await api.get('projects/summary');
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual(
      expect.objectContaining({ overall: expect.objectContaining({ over_budget_count: expect.any(Number) }) }),
    );
  });

  test('dashboard shows overall totals and marks an over-budget project', async ({ page }) => {
    const { api } = await apiAs('contributor');
    const name = `E2E Budget Over ${runId()}`;
    await createProjectWithSpend(api, name, { expenditure: 1500, initial_budget: 1000, revised_budget: null });
    const { overall } = await (await api.get('projects/summary')).json();
    const { pagination } = await (await api.get('projects?offset=0&limit=6')).json();

    await loginInUi(page, 'readOnly');

    const section = page.getByRole('region', { name: 'Budget summary' });
    await expect(section).toContainText(overall.budget.toLocaleString('en-US', { maximumFractionDigits: 2 }));
    await expect(section).toContainText(overall.spent.toLocaleString('en-US', { maximumFractionDigits: 2 }));
    await expect(section).toContainText(`${overall.over_budget_count} project`);

    // Projects are listed oldest first, so the new one is on the last page
    if (pagination.totalPages > 1) {
      await page.getByRole('link', { name: String(pagination.totalPages), exact: true }).click();
    }
    const card = page.locator('.p-6', { has: page.getByRole('heading', { name }) });
    await expect(card.getByText('Over budget')).toBeVisible();
    await expect(card).toContainText('Spent 1,500 of 1,000 (150%)');
    await expect(card).toContainText('Remaining -500');
  });
});
