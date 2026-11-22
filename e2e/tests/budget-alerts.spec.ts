import { test, expect, request, type APIRequestContext, type Page } from '@playwright/test';
import { API_URL, apiAs, getCategory, loginInUi, runId, type FinancialEntry } from './helpers';

type Notification = { id: string; project_id: string | null; level: string; threshold: number; percent_used: number | null; read_at: string | null };

const createProjectWithThreshold = async (
  api: APIRequestContext,
  name: string,
  alertThreshold: number | undefined,
  entries: FinancialEntry[],
) => {
  const category = await getCategory(api);
  const res = await api.post('projects', {
    data: { project_name: name, category_id: category.id, category_name: category.category_name, alert_threshold: alertThreshold },
  });
  expect(res.status()).toBe(201);
  const project = await res.json();
  for (const entry of entries) {
    const financial = await api.post('financialData', { data: { ...entry, project_id: project.id, project_name: name } });
    expect(financial.status()).toBe(201);
  }
  return project;
};

const notificationsFor = async (api: APIRequestContext, projectId: string): Promise<Notification[]> => {
  const res = await api.get('notifications');
  expect(res.status()).toBe(200);
  const { data } = await res.json();
  return data.filter((notification: Notification) => notification.project_id === projectId);
};

const bellButton = (page: Page) => page.getByRole('button', { name: /^Notifications/ });

const openBell = async (page: Page) => {
  await bellButton(page).click();
  return page.getByRole('menu');
};

test.describe('budget alerts API', () => {
  test('owner and admins are told when spending passes the threshold, then again when it goes over budget', async () => {
    const { api: contributor } = await apiAs('contributor');
    const { api: admin } = await apiAs('admin');
    const { api: readOnly } = await apiAs('readOnly');
    const project = await createProjectWithThreshold(contributor, `E2E Alert API ${runId()}`, 50, [
      { year: 2026, month: 1, expenditure: 600, initial_budget: 1000, revised_budget: null },
    ]);

    const first = await notificationsFor(contributor, project.id);
    expect(first).toEqual([expect.objectContaining({ level: 'Threshold', threshold: 50, percent_used: 60, read_at: null })]);
    expect(await notificationsFor(admin, project.id)).toHaveLength(1);
    expect(await notificationsFor(readOnly, project.id)).toHaveLength(0);

    const over = await contributor.post('financialData', {
      data: { year: 2026, month: 2, expenditure: 500, initial_budget: 0, revised_budget: null, project_id: project.id, project_name: project.project_name },
    });
    expect(over.status()).toBe(201);

    const levels = (await notificationsFor(contributor, project.id)).map((notification) => notification.level);
    expect(levels).toEqual(['OverBudget', 'Threshold']);
  });

  test('spending under the threshold sends nothing, and the same level is not sent twice', async () => {
    const { api } = await apiAs('contributor');
    const project = await createProjectWithThreshold(api, `E2E Alert Quiet ${runId()}`, undefined, [
      { year: 2026, month: 1, expenditure: 700, initial_budget: 1000, revised_budget: null },
    ]);
    expect(await notificationsFor(api, project.id)).toHaveLength(0);

    await api.post('financialData', {
      data: { year: 2026, month: 2, expenditure: 100, initial_budget: 0, revised_budget: null, project_id: project.id, project_name: project.project_name },
    });
    await api.post('financialData', {
      data: { year: 2026, month: 3, expenditure: 50, initial_budget: 0, revised_budget: null, project_id: project.id, project_name: project.project_name },
    });

    expect((await notificationsFor(api, project.id)).map((notification) => notification.level)).toEqual(['Threshold']);
  });

  test('marking read only touches your own notifications', async () => {
    const { api: contributor } = await apiAs('contributor');
    const { api: admin } = await apiAs('admin');
    const project = await createProjectWithThreshold(contributor, `E2E Alert Read ${runId()}`, 10, [
      { year: 2026, month: 1, expenditure: 200, initial_budget: 1000, revised_budget: null },
    ]);
    const [mine] = await notificationsFor(contributor, project.id);
    const [adminCopy] = await notificationsFor(admin, project.id);

    expect((await admin.post(`notifications/${mine.id}/read`)).status()).toBe(404);
    expect((await contributor.post(`notifications/${mine.id}/read`)).status()).toBe(200);

    expect((await notificationsFor(contributor, project.id))[0].read_at).not.toBeNull();
    expect((await notificationsFor(admin, project.id))[0]).toEqual(expect.objectContaining({ id: adminCopy.id, read_at: null }));
  });

  test('threshold is checked and notifications need a logged-in user', async () => {
    const { api } = await apiAs('contributor');
    const category = await getCategory(api);
    const bad = await api.post('projects', {
      data: { project_name: `E2E Alert Bad ${runId()}`, category_id: category.id, category_name: category.category_name, alert_threshold: 150 },
    });
    expect(bad.status()).toBe(400);

    const anonymous = await request.newContext({ baseURL: API_URL });
    expect((await anonymous.get('notifications')).status()).toBe(401);
    expect((await anonymous.post('notifications/read-all')).status()).toBe(401);
  });
});

test.describe('Notification bell', () => {
  test('owner sees the alert, opens the project from it, and it turns read', async ({ page }) => {
    const { api } = await apiAs('contributor');
    const name = `E2E Alert UI ${runId()}`;
    const project = await createProjectWithThreshold(api, name, 50, [
      { year: 2026, month: 1, expenditure: 750, initial_budget: 1000, revised_budget: null },
    ]);

    await loginInUi(page, 'contributor');
    await expect(bellButton(page)).toHaveAccessibleName(/unread/);
    const menu = await openBell(page);
    const item = menu.getByRole('menuitem', { name: `Unread: ${name} has used 75% of its budget and reached its 50% alert` });
    await expect(item).toBeVisible();
    await expect(menu).toHaveCSS('opacity', '1');
    await expect(menu).toHaveCSS('transform', 'none');
    await page.screenshot({ path: 'screenshots/budget-alerts.png' });

    await item.click();
    await expect(page).toHaveURL(new RegExp(`/projects/${project.id}$`));

    const reopened = await openBell(page);
    await expect(reopened.getByRole('menuitem', { name: new RegExp(`^${name} has used 75%`) })).toBeVisible();
  });

  test('raising spend past the threshold by lowering it in the project form sends an alert', async ({ page }) => {
    const { api } = await apiAs('contributor');
    const name = `E2E Alert Form ${runId()}`;
    const project = await createProjectWithThreshold(api, name, undefined, [
      { year: 2026, month: 1, expenditure: 600, initial_budget: 1000, revised_budget: null },
    ]);
    expect(await notificationsFor(api, project.id)).toHaveLength(0);

    await loginInUi(page, 'contributor');
    await page.goto(`/projects/${project.id}`);
    await page.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByLabel('Budget Alert Threshold (%)')).toHaveValue('80');
    await page.getByLabel('Budget Alert Threshold (%)').fill('0');
    await page.getByRole('button', { name: 'Update' }).click();
    await expect(page.getByText('Alert threshold must be between 1 and 100')).toBeVisible();
    await page.getByLabel('Budget Alert Threshold (%)').fill('55');
    await page.getByRole('button', { name: 'Update' }).click();

    const menu = await openBell(page);
    await expect(menu.getByRole('menuitem', { name: `Unread: ${name} has used 60% of its budget and reached its 55% alert` })).toBeVisible();
    await expect(page.getByText('Alert threshold: 80% → 55%')).toBeVisible();
  });

  test('bell groups alerts by day, marks severity and unread, and filters to unread', async ({ page }) => {
    const { api } = await apiAs('contributor');
    const tag = runId();
    const warnName = `E2E Bell Warn ${tag}`;
    const overName = `E2E Bell Over ${tag}`;
    const warn = await createProjectWithThreshold(api, warnName, 50, [
      { year: 2026, month: 1, expenditure: 700, initial_budget: 1000, revised_budget: null },
    ]);
    await createProjectWithThreshold(api, overName, undefined, [
      { year: 2026, month: 1, expenditure: 900, initial_budget: 800, revised_budget: null },
    ]);
    const [warnAlert] = await notificationsFor(api, warn.id);
    expect((await api.post(`notifications/${warnAlert.id}/read`)).status()).toBe(200);

    await loginInUi(page, 'contributor');
    const menu = await openBell(page);
    await expect(menu).toHaveCSS('opacity', '1');

    const today = menu.getByRole('group', { name: 'Today' });
    const overItem = today.getByRole('menuitem', { name: new RegExp(`^Unread: ${overName} is over budget`) });
    const warnItem = today.getByRole('menuitem', { name: new RegExp(`^${warnName} has used 70%`) });
    await expect(overItem).toContainText('Over budget · 900 of 800');
    await expect(overItem.locator('[data-severity="over-budget"]')).toBeVisible();
    await expect(overItem.locator('[data-unread-dot]')).toBeVisible();
    await expect(warnItem).toContainText('70% used · passed 50% alert');
    await expect(warnItem.locator('[data-severity="threshold"]')).toBeVisible();
    await expect(warnItem.locator('[data-unread-dot]')).toHaveCount(0);
    expect((await menu.boundingBox())!.width).toBeGreaterThanOrEqual(380);
    await page.screenshot({ path: 'screenshots/notification-bell.png' });

    await menu.getByRole('menuitemradio', { name: /^Unread/ }).click();
    await expect(menu.getByRole('menuitemradio', { name: /^Unread/ })).toHaveAttribute('aria-checked', 'true');
    await expect(menu.getByRole('menuitem', { name: new RegExp(`^Unread: ${overName} is over budget`) })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: new RegExp(warnName) })).toHaveCount(0);

    await menu.getByRole('menuitemradio', { name: 'All' }).click();
    await expect(menu.getByRole('menuitem', { name: new RegExp(warnName) })).toBeVisible();
  });

  test('Mark all as read clears the unread count', async ({ page }) => {
    const { api } = await apiAs('contributor');
    await createProjectWithThreshold(api, `E2E Alert All ${runId()}`, 20, [
      { year: 2026, month: 1, expenditure: 300, initial_budget: 1000, revised_budget: null },
    ]);

    await loginInUi(page, 'contributor');
    const menu = await openBell(page);
    await menu.getByRole('menuitem', { name: 'Mark all as read' }).click();

    await expect(bellButton(page)).toHaveAccessibleName('Notifications');
    expect((await (await api.get('notifications')).json()).unread_count).toBe(0);
  });
});
