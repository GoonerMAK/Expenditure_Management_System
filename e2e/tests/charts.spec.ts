import { test, expect, request } from '@playwright/test';
import { API_URL, apiAs, createCategory, createProject, loginInUi, runId } from './helpers';

// Expenditure and budget charts on the Analytics page; test data is kept for reference.

test.describe('chart data API', () => {
  test('category totals add up every project in the category', async () => {
    const { api } = await apiAs('contributor');
    const category = await createCategory(api, 'E2E Chart');
    await createProject(api, category, `E2E Chart A ${runId()}`, [
      { year: 2026, month: 1, expenditure: 400, initial_budget: 1000, revised_budget: 0 },
    ]);
    await createProject(api, category, `E2E Chart B ${runId()}`, [
      { year: 2026, month: 2, expenditure: 900, initial_budget: 500, revised_budget: 800 },
    ]);

    const categories = await (await api.get('projects/summary/categories')).json();

    expect(categories.find((c: { category_id: string }) => c.category_id === category.id)).toEqual({
      category_id: category.id,
      category_name: category.category_name,
      budget: 1800,
      spent: 1300,
    });
  });

  test('project trend groups entries by month and by year', async () => {
    const { api } = await apiAs('contributor');
    const category = await createCategory(api, 'E2E Chart');
    const project = await createProject(api, category, `E2E Trend ${runId()}`, [
      { year: 2025, month: 11, expenditure: 100, initial_budget: 600, revised_budget: 0 },
      { year: 2026, month: 1, expenditure: 250, initial_budget: 600, revised_budget: 700 },
      { year: 2026, month: 2, expenditure: 800, initial_budget: 600, revised_budget: 0 },
    ]);

    const trend = await (await api.get(`projects/${project.id}/trend`)).json();

    expect(trend).toEqual({
      project_id: project.id,
      project_name: project.project_name,
      monthly: [
        { year: 2025, month: 11, budget: 600, spent: 100 },
        { year: 2026, month: 1, budget: 700, spent: 250 },
        { year: 2026, month: 2, budget: 600, spent: 800 },
      ],
      yearly: [
        { year: 2025, budget: 600, spent: 100 },
        { year: 2026, budget: 1300, spent: 1050 },
      ],
    });
  });

  test('trend returns clear errors for a missing project and a bad id', async () => {
    const { api } = await apiAs('readOnly');

    const missing = await api.get('projects/00000000-0000-4000-8000-000000000000/trend');
    expect(missing.status()).toBe(404);
    expect(await missing.json()).toEqual({ error: 'Project with id 00000000-0000-4000-8000-000000000000 not found' });

    expect((await api.get('projects/not-a-uuid/trend')).status()).toBe(400);
  });

  test('chart data needs a logged-in user', async () => {
    const anonymous = await request.newContext({ baseURL: API_URL });

    expect((await anonymous.get('projects/summary/categories')).status()).toBe(401);
    expect((await anonymous.get('projects/00000000-0000-4000-8000-000000000000/trend')).status()).toBe(401);
  });
});

test.describe('Analytics page', () => {
  test('Read-only user sees category spending, with tooltip and table view', async ({ page }) => {
    const { api } = await apiAs('contributor');
    const category = await createCategory(api, 'E2E Chart');
    await createProject(api, category, `E2E Chart UI ${runId()}`, [
      { year: 2026, month: 4, expenditure: 1234, initial_budget: 5000, revised_budget: 0 },
    ]);

    await loginInUi(page, 'readOnly');
    await page.getByRole('link', { name: 'Analytics' }).click();
    await expect(page).toHaveURL(/\/analytics$/);

    const card = page.locator('.rounded-lg', { has: page.getByText('Spending by category') }).first();
    await expect(card.getByRole('img', { name: /Spending by category/ })).toBeVisible();
    await expect(card.locator('.recharts-legend-wrapper')).toContainText('Budget');

    // Hover the category's bars to see the tooltip with formatted values
    const bars = card.locator('.recharts-bar-rectangle');
    await expect(bars.first()).toBeVisible();
    // Category bars are horizontal, so every category name is listed on the left axis
    // Long names wrap onto two lines, so match the words with or without the space between them
    const label = new RegExp(category.category_name.split(' ').join('\\s*'));
    const tick = card.locator('.recharts-yAxis .recharts-cartesian-axis-tick', { hasText: label });
    await tick.scrollIntoViewIfNeeded();
    const box = await tick.boundingBox();
    const plot = await card.locator('.recharts-cartesian-grid').boundingBox();
    await page.mouse.move(plot!.x + plot!.width / 2, box!.y + box!.height / 2);
    const tooltip = card.locator('.recharts-tooltip-wrapper');
    await expect(tooltip).toContainText(category.category_name);
    await expect(tooltip).toContainText('Budget : 5,000');
    await expect(tooltip).toContainText('Spent : 1,234');

    await card.getByRole('button', { name: 'Show table' }).click();
    await expect(card.getByRole('row', { name: new RegExp(category.category_name) })).toContainText('5,0001,2343,766');
  });

  test('project trend switches between monthly and yearly', async ({ page }) => {
    const { api } = await apiAs('contributor');
    const category = await createCategory(api, 'E2E Chart');
    const name = `E2E Trend UI ${runId()}`;
    await createProject(api, category, name, [
      { year: 2025, month: 12, expenditure: 300, initial_budget: 1000, revised_budget: 0 },
      { year: 2026, month: 5, expenditure: 1500, initial_budget: 1000, revised_budget: 0 },
    ]);

    await loginInUi(page, 'readOnly');
    await page.goto('/analytics');
    await page.getByLabel('Project').selectOption({ label: name });

    const card = page.locator('.rounded-lg', { has: page.getByText('Monthly budget vs spent') }).first();
    await expect(card).toContainText(name);
    await expect(card.locator('.recharts-bar-rectangle')).toHaveCount(4);
    await card.getByRole('button', { name: 'Show table' }).click();
    await expect(card.getByRole('row', { name: /Dec 2025/ })).toContainText('1,000300700');
    await expect(card.getByRole('row', { name: /May 2026/ })).toContainText('1,0001,500-500');

    // The table view stays open when switching period
    await page.getByRole('tab', { name: 'Yearly' }).click();
    const yearly = page.locator('.rounded-lg', { has: page.getByText('Yearly budget vs spent') }).first();
    await expect(yearly.getByRole('row', { name: /^2025/ })).toContainText('1,000300700');
    await expect(yearly.getByRole('row', { name: /^2026/ })).toContainText('1,0001,500-500');
  });

  test('a failed chart request shows an error, and Try again recovers', async ({ page }) => {
    await loginInUi(page, 'readOnly');

    let fail = true;
    await page.route('**/api/projects/summary/categories', (route) =>
      fail ? route.fulfill({ status: 500, json: { error: 'boom' } }) : route.continue(),
    );
    await page.goto('/analytics');

    const card = page.locator('.rounded-lg', { has: page.getByText('Spending by category') }).first();
    await expect(card.getByRole('alert')).toContainText("Couldn't load this chart. Please try again.");
    // The rest of the page still works
    await expect(page.getByLabel('Project')).toBeEnabled();

    fail = false;
    await card.getByRole('button', { name: 'Try again' }).click();
    await expect(card.getByRole('alert')).toHaveCount(0);
    await expect(card.getByRole('img', { name: /Spending by category/ })).toBeVisible();
  });

  test('a failed trend request shows an error on that chart only', async ({ page }) => {
    await loginInUi(page, 'readOnly');
    await page.route('**/api/projects/*/trend', (route) => route.fulfill({ status: 500, json: { error: 'boom' } }));
    await page.goto('/analytics');

    const trend = page.locator('.rounded-lg', { has: page.getByText('Monthly budget vs spent') }).first();
    await expect(trend.getByRole('alert')).toContainText("Couldn't load this chart.");
    const categories = page.locator('.rounded-lg', { has: page.getByText('Spending by category') }).first();
    await expect(categories.getByRole('alert')).toHaveCount(0);
  });

  test('dashboard shows an error when the budget summary fails', async ({ page }) => {
    await loginInUi(page, 'readOnly');
    await page.route('**/api/projects/summary', (route) => route.fulfill({ status: 500, json: { error: 'boom' } }));
    await page.reload();

    await expect(page.getByRole('alert')).toContainText("Couldn't load the budget summary.");
    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
  });
});
