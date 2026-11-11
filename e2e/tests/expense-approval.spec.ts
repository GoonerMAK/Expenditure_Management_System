import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { apiAs, createProject, getCategory, loginInUi, runId } from './helpers';

const createProjectForMonth = async (api: APIRequestContext, name: string, expenditure = 0) =>
  createProject(api, await getCategory(api), name, [
    { year: 2026, month: 3, expenditure, initial_budget: 5000, revised_budget: null },
  ]);

const addEntry = async (api: APIRequestContext, fields: Record<string, string>) => {
  const res = await api.post('expenses', { multipart: fields });
  expect(res.status()).toBe(201);
  return res.json();
};

const marchSpend = async (api: APIRequestContext, projectId: string) => {
  const { monthly } = await (await api.get(`projects/${projectId}/trend`)).json();
  const march = monthly.find((m: { year: number; month: number }) => m.year === 2026 && m.month === 3);
  return march?.spent;
};

const entryRow = (page: Page, vendor: string) => page.getByRole('table').getByRole('row', { name: new RegExp(vendor) });

const marchRow = (page: Page) => page.getByRole('table').getByRole('row', { name: /^Mar 2026/ });

test.describe('expense approval API', () => {
  test('a contributor entry is pending and not counted until an admin approves it', async () => {
    const { api: contributor } = await apiAs('contributor');
    const { api: admin, id: adminId } = await apiAs('admin');
    const project = await createProjectForMonth(contributor, `E2E Approval Pending ${runId()}`, 300);

    const entry = await addEntry(contributor, { project_id: project.id, date: '2026-03-05', vendor: 'Acme', amount: '80' });
    expect(entry).toEqual(expect.objectContaining({ status: 'Pending', reviewed_by_id: null, reviewed_at: null }));
    expect(await marchSpend(contributor, project.id)).toBe(0);

    const approved = await admin.post(`expenses/${entry.id}/approve`);
    expect(approved.status()).toBe(200);
    expect(await approved.json()).toEqual(
      expect.objectContaining({ status: 'Approved', reviewed_by_id: adminId, reviewed_by_name: 'e2e_admin', reviewed_at: expect.any(String) }),
    );
    expect(await marchSpend(contributor, project.id)).toBe(80);
  });

  test('an admin entry is approved straight away', async () => {
    const { api: admin, id: adminId } = await apiAs('admin');
    const project = await createProjectForMonth(admin, `E2E Approval Admin ${runId()}`);

    const entry = await addEntry(admin, { project_id: project.id, date: '2026-03-05', vendor: 'Acme', amount: '25' });

    expect(entry).toEqual(expect.objectContaining({ status: 'Approved', reviewed_by_id: adminId }));
    expect(await marchSpend(admin, project.id)).toBe(25);
  });

  test('an admin rejects with a reason and the contributor resubmits by editing', async () => {
    const { api: contributor } = await apiAs('contributor');
    const { api: admin } = await apiAs('admin');
    const project = await createProjectForMonth(contributor, `E2E Approval Reject ${runId()}`);
    const entry = await addEntry(contributor, { project_id: project.id, date: '2026-03-05', vendor: 'Acme', amount: '60' });

    const rejected = await admin.post(`expenses/${entry.id}/reject`, { data: { rejection_reason: 'Missing receipt' } });
    expect(rejected.status()).toBe(200);
    expect(await rejected.json()).toEqual(expect.objectContaining({ status: 'Rejected', rejection_reason: 'Missing receipt' }));
    expect(await marchSpend(contributor, project.id)).toBe(0);

    const resubmitted = await contributor.put(`expenses/${entry.id}`, { multipart: { notes: 'Receipt attached' } });
    expect(await resubmitted.json()).toEqual(
      expect.objectContaining({ status: 'Pending', rejection_reason: null, reviewed_by_id: null, reviewed_at: null }),
    );
  });

  test('a contributor edit sends an approved entry back to pending, an admin edit does not', async () => {
    const { api: contributor } = await apiAs('contributor');
    const { api: admin } = await apiAs('admin');
    const project = await createProjectForMonth(contributor, `E2E Approval Edit ${runId()}`);
    const entry = await addEntry(contributor, { project_id: project.id, date: '2026-03-05', vendor: 'Acme', amount: '40' });
    await admin.post(`expenses/${entry.id}/approve`);

    const adminEdit = await admin.put(`expenses/${entry.id}`, { multipart: { amount: '45' } });
    expect(await adminEdit.json()).toEqual(expect.objectContaining({ status: 'Approved', amount: 45 }));
    expect(await marchSpend(contributor, project.id)).toBe(45);

    const contributorEdit = await contributor.put(`expenses/${entry.id}`, { multipart: { amount: '50' } });
    expect(await contributorEdit.json()).toEqual(expect.objectContaining({ status: 'Pending', amount: 50 }));
    expect(await marchSpend(contributor, project.id)).toBe(0);
  });

  test('only Administrators can approve or reject', async () => {
    const { api: contributor } = await apiAs('contributor');
    const { api: readOnly } = await apiAs('readOnly');
    const project = await createProjectForMonth(contributor, `E2E Approval Roles ${runId()}`);
    const entry = await addEntry(contributor, { project_id: project.id, date: '2026-03-05', vendor: 'Acme', amount: '10' });

    for (const api of [contributor, readOnly]) {
      expect((await api.post(`expenses/${entry.id}/approve`)).status()).toBe(403);
      expect((await api.post(`expenses/${entry.id}/reject`, { data: {} })).status()).toBe(403);
    }
    expect(await marchSpend(contributor, project.id)).toBe(0);
  });

  test('a month without entries keeps its typed-in expenditure', async () => {
    const { api } = await apiAs('contributor');
    const project = await createProjectForMonth(api, `E2E Approval Typed ${runId()}`, 300);

    expect(await marchSpend(api, project.id)).toBe(300);
  });
});

test.describe('expense approval on the project page', () => {
  test('a contributor submits an entry, it is pending and not counted', async ({ page }) => {
    const { api } = await apiAs('contributor');
    const project = await createProjectForMonth(api, `E2E Approval UI Submit ${runId()}`);

    await loginInUi(page, 'contributor');
    await page.goto(`/projects/${project.id}`);

    const form = page.getByRole('form', { name: 'Add expense entry' });
    await form.getByLabel('Date').fill('2026-03-20');
    await form.getByLabel('Vendor').fill('Paint Depot');
    await form.getByLabel('Amount').fill('49.5');
    await form.getByRole('button', { name: 'Add entry' }).click();

    await expect(page.getByText('Expense entry added')).toBeVisible();
    await expect(entryRow(page, 'Paint Depot')).toContainText('Pending');
    await expect(marchRow(page)).toContainText('49.5 pending');
    await expect(page.getByLabel('Expenditure')).toHaveValue('0');
    await expect(page.getByRole('button', { name: /^(Approve|Reject) / })).toHaveCount(0);
  });

  test('an admin approves an entry and it is counted', async ({ page }) => {
    const { api } = await apiAs('contributor');
    const project = await createProjectForMonth(api, `E2E Approval UI Approve ${runId()}`);
    await addEntry(api, { project_id: project.id, date: '2026-03-05', vendor: 'Steel Supplies', amount: '120' });

    await loginInUi(page, 'admin');
    await page.goto(`/projects/${project.id}`);
    await expect(entryRow(page, 'Steel Supplies')).toContainText('Pending');

    await page.getByRole('button', { name: 'Approve Steel Supplies entry' }).click();

    await expect(page.getByText('Expense entry approved')).toBeVisible();
    await expect(entryRow(page, 'Steel Supplies')).toContainText('Approved');
    await expect(entryRow(page, 'Steel Supplies')).toContainText('by e2e_admin');
    await expect(marchRow(page)).not.toContainText('pending');
    await expect(page.getByLabel('Expenditure')).toHaveValue('120');
  });

  test('an admin rejects an entry with a reason', async ({ page }) => {
    const { api } = await apiAs('contributor');
    const project = await createProjectForMonth(api, `E2E Approval UI Reject ${runId()}`);
    await addEntry(api, { project_id: project.id, date: '2026-03-05', vendor: 'Bolt Shop', amount: '30' });

    await loginInUi(page, 'admin');
    await page.goto(`/projects/${project.id}`);

    await page.getByRole('button', { name: 'Reject Bolt Shop entry' }).click();
    const dialog = page.getByRole('alertdialog');
    await dialog.getByLabel('Reason (optional)').fill('Duplicate of invoice 1042');
    await dialog.getByRole('button', { name: 'Reject' }).click();

    await expect(page.getByText('Expense entry rejected')).toBeVisible();
    await expect(entryRow(page, 'Bolt Shop')).toContainText('Rejected');
    await expect(entryRow(page, 'Bolt Shop')).toContainText('Reason: Duplicate of invoice 1042');
    await expect(page.getByLabel('Expenditure')).toHaveValue('0');
  });

  test("a contributor's edit sends an approved entry back to pending", async ({ page }) => {
    const { api: contributor } = await apiAs('contributor');
    const { api: admin } = await apiAs('admin');
    const project = await createProjectForMonth(contributor, `E2E Approval UI Edit ${runId()}`);
    const entry = await addEntry(contributor, { project_id: project.id, date: '2026-03-05', vendor: 'Cement Co', amount: '200' });
    await admin.post(`expenses/${entry.id}/approve`);

    await loginInUi(page, 'contributor');
    await page.goto(`/projects/${project.id}`);
    await expect(entryRow(page, 'Cement Co')).toContainText('Approved');
    await expect(page.getByLabel('Expenditure')).toHaveValue('200');

    await page.getByRole('button', { name: 'Edit Cement Co entry' }).click();
    const form = page.getByRole('form', { name: 'Edit expense entry' });
    await form.getByLabel('Amount').fill('210');
    await form.getByRole('button', { name: 'Save entry' }).click();

    await expect(page.getByText('Expense entry updated')).toBeVisible();
    await expect(entryRow(page, 'Cement Co')).toContainText('Pending');
    await expect(marchRow(page)).toContainText('210 pending');
    await expect(page.getByLabel('Expenditure')).toHaveValue('0');
  });

  test('a Read-only user sees the statuses but no buttons', async ({ page }) => {
    const { api: contributor } = await apiAs('contributor');
    const { api: admin } = await apiAs('admin');
    const project = await createProjectForMonth(contributor, `E2E Approval UI Read-only ${runId()}`);
    const approved = await addEntry(contributor, { project_id: project.id, date: '2026-03-05', vendor: 'Approved Vendor', amount: '10' });
    await addEntry(contributor, { project_id: project.id, date: '2026-03-06', vendor: 'Pending Vendor', amount: '5' });
    await admin.post(`expenses/${approved.id}/approve`);

    await loginInUi(page, 'readOnly');
    await page.goto(`/projects/${project.id}`);

    await expect(entryRow(page, 'Approved Vendor')).toContainText('Approved');
    await expect(entryRow(page, 'Pending Vendor')).toContainText('Pending');
    await expect(page.getByRole('table').getByRole('button')).toHaveCount(0);
    await expect(page.getByRole('form', { name: 'Add expense entry' })).toHaveCount(0);
  });

  test('project page with mixed statuses', async ({ page }) => {
    const { api: contributor } = await apiAs('contributor');
    const { api: admin } = await apiAs('admin');
    const project = await createProjectForMonth(contributor, `E2E Approval Screenshot ${runId()}`);
    const approved = await addEntry(contributor, { project_id: project.id, date: '2026-03-04', vendor: 'Steel Supplies Ltd', amount: '1250', notes: 'Rebar for the north pier' });
    const rejected = await addEntry(contributor, { project_id: project.id, date: '2026-03-11', vendor: 'Bolt Shop', amount: '86.4' });
    await addEntry(contributor, { project_id: project.id, date: '2026-03-18', vendor: 'Paint Depot', amount: '49.5' });
    await addEntry(admin, { project_id: project.id, date: '2026-03-25', vendor: 'Crane Hire Co', amount: '600' });
    await admin.post(`expenses/${approved.id}/approve`);
    await admin.post(`expenses/${rejected.id}/reject`, { data: { rejection_reason: 'Duplicate of invoice 1042' } });

    await loginInUi(page, 'admin');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`/projects/${project.id}`);

    await expect(marchRow(page)).toContainText('1,850');
    await expect(marchRow(page)).toContainText('49.5 pending');
    await expect(entryRow(page, 'Bolt Shop')).toContainText('Reason: Duplicate of invoice 1042');
    await page.screenshot({ path: 'screenshots/expense-approval.png', fullPage: true });
  });
});
