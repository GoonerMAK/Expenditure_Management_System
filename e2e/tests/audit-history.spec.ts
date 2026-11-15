import { randomUUID } from 'node:crypto';
import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { apiAs, createProject, getCategory, loginInUi, runId, type UserKey } from './helpers';

const createProjectForMonth = async (api: APIRequestContext, name: string) =>
  createProject(api, await getCategory(api), name, [
    { year: 2026, month: 3, expenditure: 0, initial_budget: 5000, revised_budget: null },
  ]);

const addEntry = async (api: APIRequestContext, fields: Record<string, string>) => {
  const res = await api.post('expenses', { multipart: fields });
  expect(res.status()).toBe(201);
  return res.json();
};

type Project = { id: string; project_name: string; category_id: string };

const projectDates = { start_date: '2026-03-01T00:00:00.000Z', end_date: '2026-06-30T00:00:00.000Z' };

const updateProject = async (api: APIRequestContext, project: Project, details: Record<string, string>) => {
  const res = await api.put(`projects/${project.id}`, {
    data: { project_name: project.project_name, category_id: project.category_id, ...details },
  });
  expect(res.status()).toBe(200);
};

const historyItems = (page: Page) => page.getByRole('list', { name: 'Project history' }).locator(':scope > li');

const historyItem = (page: Page, text: string) => historyItems(page).filter({ hasText: text });

const historyLength = async (api: APIRequestContext, projectId: string) =>
  (await (await api.get(`projects/${projectId}/history`)).json()).length;

const openProject = async (page: Page, user: UserKey, projectId: string) => {
  await loginInUi(page, user);
  await page.goto(`/projects/${projectId}`);
};

test.describe('project history', () => {
  test('an admin edit to the project and its budget shows in the history without a reload', async ({ page }) => {
    const { api } = await apiAs('admin');
    const name = `E2E History Edit ${runId()}`;
    const project = await createProjectForMonth(api, name);

    await openProject(page, 'admin', project.id);
    await expect(historyItems(page)).toHaveCount(2);

    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Project Name').fill(`${name} Renamed`);
    await page.getByLabel('Initial Budget').fill('6000');
    await page.getByRole('button', { name: 'Update' }).click();

    await expect(page.getByText('Project updated successfully')).toBeVisible();
    await expect(historyItems(page)).toHaveCount(4);
    await expect(historyItem(page, 'e2e_admin changed the project')).toContainText(`Name: ${name} → ${name} Renamed`);
    await expect(historyItem(page, 'e2e_admin changed the budget for Mar 2026')).toContainText('Initial budget: 5,000 → 6,000');
  });

  test('pressing Update with nothing changed adds no entry', async ({ page }) => {
    const { api } = await apiAs('admin');
    const project = await createProjectForMonth(api, `E2E History No Change ${runId()}`);
    await updateProject(api, project, { description: 'Bridge repairs', ...projectDates });

    await openProject(page, 'admin', project.id);
    await expect(historyItems(page)).toHaveCount(3);

    await page.getByRole('button', { name: 'Edit' }).click();
    const refetched = page.waitForResponse((res) => res.url().endsWith('/history'));
    await page.getByRole('button', { name: 'Update' }).click();

    await expect(page.getByText('Project updated successfully')).toBeVisible();
    await refetched;
    await expect(historyItems(page)).toHaveCount(3);
    expect(await historyLength(api, project.id)).toBe(3);
  });

  test('a contributor adds an expense', async ({ page }) => {
    const { api } = await apiAs('contributor');
    const project = await createProjectForMonth(api, `E2E History Add ${runId()}`);

    await openProject(page, 'contributor', project.id);
    const form = page.getByRole('form', { name: 'Add expense entry' });
    await form.getByLabel('Date').fill('2026-03-20');
    await form.getByLabel('Vendor').fill('Paint Depot');
    await form.getByLabel('Amount').fill('49.5');
    await form.getByRole('button', { name: 'Add entry' }).click();

    await expect(page.getByText('Expense entry added')).toBeVisible();
    await expect(historyItems(page).first()).toContainText('e2e_contributor added the expense from Paint Depot');
    await expect(historyItems(page).first()).toContainText('Amount: empty → 49.5');
  });

  test('an admin approves one entry and rejects another with a reason', async ({ page }) => {
    const { api } = await apiAs('contributor');
    const project = await createProjectForMonth(api, `E2E History Review ${runId()}`);
    await addEntry(api, { project_id: project.id, date: '2026-03-05', vendor: 'Steel Supplies', amount: '120' });
    await addEntry(api, { project_id: project.id, date: '2026-03-06', vendor: 'Bolt Shop', amount: '30' });

    await openProject(page, 'admin', project.id);
    await page.getByRole('button', { name: 'Approve Steel Supplies entry' }).click();
    await expect(page.getByText('Expense entry approved')).toBeVisible();

    await page.getByRole('button', { name: 'Reject Bolt Shop entry' }).click();
    const dialog = page.getByRole('alertdialog');
    await dialog.getByLabel('Reason (optional)').fill('No receipt');
    await dialog.getByRole('button', { name: 'Reject' }).click();
    await expect(page.getByText('Expense entry rejected')).toBeVisible();

    await expect(historyItems(page)).toHaveCount(6);
    await expect(historyItems(page).nth(0)).toContainText('e2e_admin rejected the expense from Bolt Shop');
    await expect(historyItems(page).nth(0)).toContainText('Rejection reason: empty → No receipt');
    await expect(historyItems(page).nth(1)).toContainText('e2e_admin approved the expense from Steel Supplies');
    await expect(historyItem(page, 'e2e_contributor added the expense from Bolt Shop')).toHaveCount(1);
  });

  test('deleting an expense shows in the history', async ({ page }) => {
    const { api } = await apiAs('admin');
    const project = await createProjectForMonth(api, `E2E History Delete ${runId()}`);
    await addEntry(api, { project_id: project.id, date: '2026-03-05', vendor: 'Crane Hire', amount: '600' });

    await openProject(page, 'admin', project.id);
    await page.getByRole('button', { name: 'Delete Crane Hire entry' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();

    await expect(historyItems(page).first()).toContainText('e2e_admin deleted the expense from Crane Hire');
  });

  test('entries are listed newest first', async ({ page }) => {
    const { api } = await apiAs('admin');
    const name = `E2E History Order ${runId()}`;
    const project = await createProjectForMonth(api, name);
    await updateProject(api, project, { project_name: `${name} Renamed` });
    await addEntry(api, { project_id: project.id, date: '2026-03-05', vendor: 'Acme', amount: '25' });

    await openProject(page, 'admin', project.id);

    await expect(historyItems(page)).toContainText([
      'added the expense from Acme',
      `changed the project ${name} Renamed`,
      'added the budget for Mar 2026',
      `added the project ${name}`,
    ]);
    const times = await historyItems(page).locator('time').evaluateAll((elements) => elements.map((el) => el.getAttribute('datetime')));
    expect(times).toEqual([...times].sort().reverse());
  });

  test('a Read-only user sees the history', async ({ page }) => {
    const { api } = await apiAs('admin');
    const name = `E2E History Read-only ${runId()}`;
    const project = await createProjectForMonth(api, name);

    await openProject(page, 'readOnly', project.id);

    await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();
    await expect(historyItem(page, `e2e_admin added the project ${name}`)).toHaveCount(1);
  });

  test('the history API returns 404 for an unknown project', async () => {
    const { api } = await apiAs('readOnly');

    expect((await api.get(`projects/${randomUUID()}/history`)).status()).toBe(404);
  });

  test('project page with several history entries', async ({ page }) => {
    const { api: contributor } = await apiAs('contributor');
    const { api: admin } = await apiAs('admin');
    const name = `E2E History Screenshot ${runId()}`;
    const project = await createProjectForMonth(contributor, name);
    const approved = await addEntry(contributor, { project_id: project.id, date: '2026-03-04', vendor: 'Steel Supplies', amount: '250.75' });
    const rejected = await addEntry(contributor, { project_id: project.id, date: '2026-03-11', vendor: 'Bolt Shop', amount: '86.4' });
    await admin.put(`expenses/${approved.id}`, { multipart: { amount: '300' } });
    await admin.post(`expenses/${approved.id}/approve`);
    await admin.post(`expenses/${rejected.id}/reject`, { data: { rejection_reason: 'No receipt' } });
    await updateProject(admin, project, { project_name: `${name} Phase 2`, description: 'North pier repairs', ...projectDates });

    await openProject(page, 'admin', project.id);
    await page.setViewportSize({ width: 1440, height: 1000 });

    await expect(historyItems(page)).toHaveCount(8);
    await page.screenshot({ path: 'screenshots/audit-history.png', fullPage: true });
  });
});
