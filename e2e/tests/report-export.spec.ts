import { readFileSync } from 'node:fs';
import { test, expect, request, type Page } from '@playwright/test';
import { API_URL, apiAs, createCategory, createProject, loginInUi, runId } from './helpers';

const exportCard = (page: Page) =>
  page.locator('.rounded-lg', { has: page.getByText('Export report', { exact: true }) }).first();

const chooseOption = async (page: Page, label: string, option: string) => {
  const trigger = exportCard(page).getByLabel(label);
  await trigger.click();
  await page.getByRole('option', { name: option, exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(trigger).toContainText(option);
};

const exportAndRead = async (page: Page) => {
  const downloadPromise = page.waitForEvent('download');
  await exportCard(page).getByRole('button', { name: 'Export' }).click();
  const download = await downloadPromise;
  return { name: download.suggestedFilename(), content: readFileSync((await download.path())!) };
};

test.describe('report export API', () => {
  test('project report adds up each month and the year, using the revised budget', async () => {
    const { api } = await apiAs('readOnly');
    const { api: contributor } = await apiAs('contributor');
    const category = await createCategory(contributor, 'E2E Report');
    const project = await createProject(contributor, category, `E2E Report API ${runId()}`, [
      { year: 2026, month: 1, expenditure: 400, initial_budget: 1000, revised_budget: null },
      { year: 2026, month: 2, expenditure: 900, initial_budget: 500, revised_budget: 800 },
    ]);

    const response = await api.get(`reports/projects/${project.id}?period=monthly&year=2026&format=csv`);

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/csv');
    const lines = (await response.text()).trim().split('\r\n');
    expect(lines).toContain('"2026-01",1000,400,600,40,"No"');
    expect(lines).toContain('"2026-02",800,900,-100,112.5,"Yes"');
    expect(lines).toContain('"Total",1800,1300,500,72.2,"No"');
  });

  test('category report adds up every project in the category', async () => {
    const { api } = await apiAs('contributor');
    const category = await createCategory(api, 'E2E Report');
    await createProject(api, category, `E2E Report Cat A ${runId()}`, [
      { year: 2026, month: 3, expenditure: 100, initial_budget: 300, revised_budget: null },
    ]);
    await createProject(api, category, `E2E Report Cat B ${runId()}`, [
      { year: 2026, month: 3, expenditure: 200, initial_budget: 700, revised_budget: null },
    ]);

    const response = await api.get(`reports/categories/${category.id}?period=yearly`);

    const lines = (await response.text()).trim().split('\r\n');
    expect(lines).toContain('"2026",1000,300,700,30,"No"');
  });

  test('reports return clear errors and need a logged-in user', async () => {
    const { api } = await apiAs('readOnly');

    expect((await api.get('reports/projects/00000000-0000-4000-8000-000000000000')).status()).toBe(404);
    expect((await api.get('reports/projects/not-a-uuid')).status()).toBe(400);
    expect((await api.get('reports/categories/00000000-0000-4000-8000-000000000000?format=xlsx')).status()).toBe(400);

    const anonymous = await request.newContext({ baseURL: API_URL });
    expect((await anonymous.get('reports/categories/uncategorised')).status()).toBe(401);
  });
});

test.describe('Export report card', () => {
  test('Read-only user downloads a project report as CSV and as PDF', async ({ page }) => {
    const { api } = await apiAs('contributor');
    const category = await createCategory(api, 'E2E Report');
    const name = `E2E Report UI ${runId()}`;
    await createProject(api, category, name, [
      { year: 2025, month: 12, expenditure: 150, initial_budget: 600, revised_budget: null },
      { year: 2026, month: 1, expenditure: 250, initial_budget: 600, revised_budget: 700 },
    ]);

    await loginInUi(page, 'readOnly');
    await page.goto('/analytics');
    await chooseOption(page, 'Which project', name);
    await chooseOption(page, 'Period', 'Monthly');
    await exportCard(page).getByLabel('Year').fill('2026');

    const csv = await exportAndRead(page);
    expect(csv.name).toMatch(/^e2e-report-ui-\d+-monthly-2026\.csv$/);
    const text = csv.content.toString('utf8');
    expect(text).toContain('"2026-01",700,250,450,35.7,"No"');
    expect(text).not.toContain('2025-12');

    await chooseOption(page, 'Format', 'PDF');
    await chooseOption(page, 'Period', 'Yearly');
    await exportCard(page).getByLabel('Year').fill('');
    const pdf = await exportAndRead(page);
    expect(pdf.name).toMatch(/^e2e-report-ui-\d+-yearly-all-years\.pdf$/);
    expect(pdf.content.subarray(0, 5).toString()).toBe('%PDF-');

    await exportCard(page).screenshot({ path: 'screenshots/report-export.png' });
  });

  test('Contributor downloads a category report', async ({ page }) => {
    const { api } = await apiAs('contributor');
    const category = await createCategory(api, 'E2E Report');
    await createProject(api, category, `E2E Report Cat UI ${runId()}`, [
      { year: 2026, month: 6, expenditure: 50, initial_budget: 200, revised_budget: null },
    ]);

    await loginInUi(page, 'contributor');
    await page.goto('/analytics');
    await chooseOption(page, 'Report for', 'Category');
    await chooseOption(page, 'Which category', category.category_name);

    const csv = await exportAndRead(page);
    expect(csv.content.toString('utf8')).toContain(`"Category","${category.category_name}"`);
    expect(csv.content.toString('utf8')).toContain('"Total",200,50,150,25,"No"');
  });

  test('an invalid year blocks export, and a failed download shows an error', async ({ page }) => {
    await loginInUi(page, 'readOnly');
    await page.goto('/analytics');
    const card = exportCard(page);

    await card.getByLabel('Year').fill('99');
    await expect(card).toContainText('Enter a year from 1900 to 9999');
    await expect(card.getByRole('button', { name: 'Export' })).toBeDisabled();

    await card.getByLabel('Year').fill('');
    await page.route('**/api/reports/**', (route) => route.fulfill({ status: 500, json: { error: 'boom' } }));
    await card.getByRole('button', { name: 'Export' }).click();
    await expect(card.getByRole('alert')).toContainText("Couldn't export the report. Please try again.");
  });
});
