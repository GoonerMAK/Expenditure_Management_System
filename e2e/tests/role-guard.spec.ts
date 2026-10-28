import { test, expect } from '@playwright/test';
import { apiAs, data, getCategory, loginInUi, runId } from './helpers';

// Role permissions enforced on the server, not only in the UI; test data is kept for reference.

test.describe('API role permissions', () => {
  test('Read-only can read but not write', async () => {
    const { api } = await apiAs('readOnly');

    expect((await api.get('projects')).status()).toBe(200);
    expect((await api.get('categories')).status()).toBe(200);

    const project = await api.post('projects', { data: { project_name: `E2E Read-only ${runId()}` } });
    expect(project.status()).toBe(403);
    expect(await project.json()).toEqual({ message: 'Access denied. Insufficient permissions.' });

    expect((await api.post('categories', { data: { category_name: `E2E R ${runId().slice(-8)}` } })).status()).toBe(403);
    expect((await api.post('financialData', { data: { year: 2026, month: 1 } })).status()).toBe(403);
  });

  test('Contributor can write project data but not manage roles or users', async () => {
    const { api } = await apiAs('contributor');

    const category = await api.post('categories', { data: { category_name: `E2E C ${runId().slice(-8)}` } });
    expect(category.status()).toBe(201);

    expect((await api.post('roles', { data: { role_name: `E2E Role ${runId()}` } })).status()).toBe(403);
    expect((await api.post('permissions', { data: { permission_name: 'e2e' } })).status()).toBe(403);
  });

  test('Administrator can manage roles', async () => {
    const { api } = await apiAs('admin');

    const role = await api.post('roles', { data: { role_name: `E2E Role ${runId()}` } });
    expect(role.status()).toBe(201);
  });

  test('project owner comes from the logged-in user, not the request', async () => {
    const contributor = await apiAs('contributor');
    const admin = await apiAs('admin');
    const category = await getCategory(contributor.api);

    const created = await contributor.api.post('projects', {
      data: {
        project_name: `E2E Owner Check ${runId()}`,
        category_id: category.id,
        category_name: category.category_name,
        created_by_id: admin.id,
      },
    });
    expect(created.status()).toBe(201);
    const project = await created.json();
    expect(project.created_by_id).toBe(contributor.id);

    // An admin editing the project, even while sending their own id, must not take ownership
    const updated = await admin.api.put(`projects/${project.id}`, {
      data: { project_name: `${project.project_name} (edited)`, created_by_id: admin.id },
    });
    expect(updated.status()).toBe(200);
    expect((await updated.json()).created_by_id).toBe(contributor.id);

    const financial = await contributor.api.post('financialData', {
      data: {
        year: 2026,
        month: 1,
        expenditure: 1500,
        initial_budget: 5000,
        revised_budget: 5500,
        project_id: project.id,
        project_name: `${project.project_name} (edited)`,
      },
    });
    expect(financial.status()).toBe(201);
  });
});

test.describe('UI role access', () => {
  test('Read-only user sees the dashboard and is kept out of write pages', async ({ page }) => {
    await loginInUi(page, 'readOnly');
    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();

    await page.goto('/add-project');
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('Contributor can create a category from the UI', async ({ page }) => {
    await loginInUi(page, 'contributor');
    // Category names are limited to 20 characters
    const name = `E2E UI ${runId().slice(-8)}`;

    await page.goto('/add-category');
    await page.getByPlaceholder('Enter category name').fill(name);
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page.getByText('Successfully created Category')).toBeVisible();
  });

  test('Administrator can open the users and roles page', async ({ page }) => {
    await loginInUi(page, 'admin');

    await page.goto('/users-roles');
    await expect(page).toHaveURL(/\/users-roles$/);
  });

  test('project created by the contributor shows them as owner on the dashboard', async ({ page }) => {
    await loginInUi(page, 'admin');
    const card = page.getByText(/E2E Owner Check .* \(edited\)/).first();
    await expect(card).toBeVisible();
    await expect(page.getByText(`Created by: ${data.users.contributor.username}`).first()).toBeVisible();
  });
});
