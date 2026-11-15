import { test, expect, type APIRequestContext } from '@playwright/test';
import { apiAs, createProject, getCategory, loginInUi, runId } from './helpers';

// Expense entries and the monthly totals they add up to; test data is kept for reference.

const PDF = { name: 'invoice.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 e2e receipt') };

const createProjectForMonth = async (api: APIRequestContext, name: string, month = 3) =>
  createProject(api, await getCategory(api), name, [
    { year: 2026, month, expenditure: 0, initial_budget: 5000, revised_budget: null },
  ]);

const addEntry = async (api: APIRequestContext, fields: Record<string, string>, receipt?: typeof PDF) => {
  const res = await api.post('expenses', { multipart: receipt ? { ...fields, receipt } : fields });
  expect(res.status()).toBe(201);
  return res.json();
};

const monthlySpend = async (api: APIRequestContext, projectId: string) => {
  const { monthly } = await (await api.get(`projects/${projectId}/trend`)).json();
  return Object.fromEntries(monthly.map((m: { year: number; month: number; spent: number }) => [`${m.year}-${m.month}`, m.spent]));
};

test.describe('expense entries API', () => {
  test('monthly expenditure is the sum of the entries in that month', async () => {
    const { api } = await apiAs('admin');
    const project = await createProjectForMonth(api, `E2E Expenses Sum ${runId()}`);

    const first = await addEntry(api, { project_id: project.id, date: '2026-03-05', vendor: 'Acme', amount: '100.10' });
    await addEntry(api, { project_id: project.id, date: '2026-03-28', vendor: 'Bolt Co', amount: '0.20' });
    await addEntry(api, { project_id: project.id, date: '2026-04-01', vendor: 'Cement Co', amount: '50' });

    expect(await monthlySpend(api, project.id)).toEqual({ '2026-3': 100.3, '2026-4': 50 });

    const moved = await api.put(`expenses/${first.id}`, { multipart: { date: '2026-04-15' } });
    expect(moved.status()).toBe(200);
    expect(await monthlySpend(api, project.id)).toEqual({ '2026-3': 0.2, '2026-4': 150.1 });

    expect((await api.delete(`expenses/${first.id}`)).status()).toBe(200);
    expect(await monthlySpend(api, project.id)).toEqual({ '2026-3': 0.2, '2026-4': 50 });
  });

  test('a hand-typed expenditure is replaced by the entries total', async () => {
    const { api } = await apiAs('admin');
    const project = await createProjectForMonth(api, `E2E Expenses Manual ${runId()}`);
    await addEntry(api, { project_id: project.id, date: '2026-03-10', vendor: 'Acme', amount: '75' });

    const res = await api.put(`financialData/${project.id}`, { data: { expenditure: 999, initial_budget: 6000 } });

    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual(expect.objectContaining({ expenditure: 75, initial_budget: 6000 }));
  });

  test('a receipt can be uploaded, opened and removed', async () => {
    const { api } = await apiAs('contributor');
    const project = await createProjectForMonth(api, `E2E Expenses Receipt ${runId()}`);
    const entry = await addEntry(api, { project_id: project.id, date: '2026-03-10', vendor: 'Acme', amount: '20' }, PDF);
    expect(entry).toEqual(expect.objectContaining({ has_receipt: true, receipt_name: 'invoice.pdf', receipt_type: 'application/pdf' }));
    expect(entry).not.toHaveProperty('receipt_file');

    const receipt = await api.get(`expenses/${entry.id}/receipt`);
    expect(receipt.status()).toBe(200);
    expect(receipt.headers()['content-type']).toBe('application/pdf');
    expect(await receipt.body()).toEqual(PDF.buffer);

    const removed = await api.put(`expenses/${entry.id}`, { multipart: { remove_receipt: 'true' } });
    expect(await removed.json()).toEqual(expect.objectContaining({ has_receipt: false, receipt_name: null }));
    expect((await api.get(`expenses/${entry.id}/receipt`)).status()).toBe(404);
  });

  test('rejects a receipt that is not a PDF or image', async () => {
    const { api } = await apiAs('contributor');
    const project = await createProjectForMonth(api, `E2E Expenses Bad File ${runId()}`);

    const res = await api.post('expenses', {
      multipart: {
        project_id: project.id,
        date: '2026-03-10',
        vendor: 'Acme',
        amount: '20',
        receipt: { name: 'run.exe', mimeType: 'application/x-msdownload', buffer: Buffer.from('MZ') },
      },
    });

    expect(res.status()).toBe(400);
    expect(await res.json()).toEqual({ message: 'Receipt must be a PDF, JPEG, PNG or WebP file.' });
  });

  test('Read-only users can list entries but not add them', async () => {
    const { api: contributor } = await apiAs('contributor');
    const project = await createProjectForMonth(contributor, `E2E Expenses Read-only ${runId()}`);
    await addEntry(contributor, { project_id: project.id, date: '2026-03-10', vendor: 'Acme', amount: '20' });
    const { api } = await apiAs('readOnly');

    const list = await api.get(`projects/${project.id}/expenses`);
    expect(list.status()).toBe(200);
    expect(await list.json()).toHaveLength(1);

    const res = await api.post('expenses', { multipart: { project_id: project.id, date: '2026-03-11', vendor: 'Acme', amount: '5' } });
    expect(res.status()).toBe(403);
  });
});

test.describe('expense entries on the project page', () => {
  test('an administrator adds an entry with a receipt and sees the month total', async ({ page }) => {
    const { api } = await apiAs('admin');
    const project = await createProjectForMonth(api, `E2E Expenses UI ${runId()}`);
    await addEntry(api, { project_id: project.id, date: '2026-03-02', vendor: 'Earlier Vendor', amount: '100' });

    await loginInUi(page, 'admin');
    await page.goto(`/projects/${project.id}`);

    const form = page.getByRole('form', { name: 'Add expense entry' });
    await form.getByLabel('Date').fill('2026-03-20');
    await form.getByLabel('Vendor').fill('Paint Depot');
    await form.getByLabel('Amount').fill('49.5');
    await form.getByLabel('Notes').fill('Two buckets');
    await form.getByLabel('Receipt').setInputFiles(PDF);
    await form.getByRole('button', { name: 'Add entry' }).click();

    await expect(page.getByText('Expense entry added')).toBeVisible();
    const table = page.getByRole('table');
    await expect(table.getByRole('row', { name: /^Mar 2026/ })).toContainText('149.5');
    await expect(table.getByRole('row', { name: /Paint Depot/ })).toContainText('Two buckets');
    await expect(table.getByRole('link', { name: 'invoice.pdf' })).toBeVisible();

    await expect(page.getByLabel('Expenditure')).toHaveValue('149.5');
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await expect(page.getByLabel('Expenditure')).toBeDisabled();
    await expect(page.getByText('Adds up from the expense entries for this month')).toBeVisible();

    await page.getByRole('button', { name: 'Delete Paint Depot entry' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText('Expense entry deleted')).toBeVisible();
    await expect(table.getByRole('row', { name: /^Mar 2026/ })).toContainText('100');
    await expect(page.getByLabel('Expenditure')).toHaveValue('100');
  });

  test('Read-only users see the entries without the form or actions', async ({ page }) => {
    const { api } = await apiAs('contributor');
    const project = await createProjectForMonth(api, `E2E Expenses UI Read-only ${runId()}`);
    await addEntry(api, { project_id: project.id, date: '2026-03-02', vendor: 'Visible Vendor', amount: '10' });

    await loginInUi(page, 'readOnly');
    await page.goto(`/projects/${project.id}`);

    await expect(page.getByRole('row', { name: /Visible Vendor/ })).toBeVisible();
    await expect(page.getByRole('form', { name: 'Add expense entry' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Delete .* entry/ })).toHaveCount(0);
  });
});
