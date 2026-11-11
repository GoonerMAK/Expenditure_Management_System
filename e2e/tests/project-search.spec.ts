import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { apiAs, createCategory, getCategory, loginInUi, runId } from './helpers';

type Category = { id: string; category_name: string };

type ProjectSetup = {
  name: string;
  category: Category;
  start_date?: string;
  end_date?: string;
  spend?: number;
};

const tag = `PS${runId()}`;

const names = {
  alpha: `E2E Search Alpha ${tag}`,
  bravo: `E2E Search Bravo ${tag}`,
  charlie: `E2E Search Charlie ${tag}`,
  delta: `E2E Search Delta ${tag}`,
};

let searchCategory: Category;
let ownerName: string;

const createProject = async (api: APIRequestContext, project: ProjectSetup) => {
  const res = await api.post('projects', {
    data: {
      project_name: project.name,
      category_id: project.category.id,
      category_name: project.category.category_name,
      start_date: project.start_date,
      end_date: project.end_date,
    },
  });
  expect(res.status()).toBe(201);
  const created = await res.json();
  if (project.spend) {
    const financial = await api.post('financialData', {
      data: { year: 2026, month: 3, expenditure: project.spend, initial_budget: 10000, revised_budget: null, project_id: created.id, project_name: project.name },
    });
    expect(financial.status()).toBe(201);
  }
  return created;
};

const projectNames = (page: Page) => page.locator('main h3.text-lg');

const searchFor = async (page: Page, text: string) => {
  await page.getByLabel('Search projects').fill(text);
  await expect.poll(() => new URL(page.url()).searchParams.get('search')).toBe(text);
};

const choose = async (page: Page, label: string, option: string) => {
  await page.getByLabel(label, { exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
};

const monthsBetween = (shown: Date, target: Date) =>
  (target.getFullYear() - shown.getFullYear()) * 12 + target.getMonth() - shown.getMonth();

const pickDate = async (page: Page, label: string, isoDate: string) => {
  const target = new Date(`${isoDate}T00:00:00`);
  await page.getByRole('button', { name: label, exact: true }).click();
  const dialog = page.getByRole('dialog');
  const caption = await dialog.locator('[aria-live="polite"]').textContent();
  const months = monthsBetween(new Date(`1 ${caption}`), target);
  const navigation = months < 0 ? 'Go to previous month' : 'Go to next month';
  for (let step = 0; step < Math.abs(months); step++) {
    await dialog.getByRole('button', { name: navigation }).click();
  }
  await dialog.locator('button[name="day"]:not(.day-outside)').filter({ hasText: new RegExp(`^${target.getDate()}$`) }).click();
  await expect(dialog).toBeHidden();
};

const openSearch = async (page: Page) => {
  await loginInUi(page, 'admin');
  await searchFor(page, tag);
  await expect(projectNames(page)).toHaveCount(4);
};

test.describe('project search, filters and sort', () => {
  test.beforeAll(async () => {
    const { api: admin } = await apiAs('admin');
    const { api: contributor } = await apiAs('contributor');
    searchCategory = await createCategory(admin, 'E2E Search');
    const otherCategory = await getCategory(admin);
    ownerName = 'e2e_admin';

    await createProject(contributor, { name: names.alpha, category: searchCategory, start_date: '2026-01-10', end_date: '2026-03-31', spend: 500 });
    await createProject(admin, { name: names.bravo, category: searchCategory, start_date: '2026-05-01', spend: 2000 });
    await createProject(contributor, { name: names.charlie, category: otherCategory, start_date: '2026-07-01', end_date: '2026-08-31', spend: 100 });
    await createProject(contributor, { name: names.delta, category: searchCategory });
  });

  test('search narrows the list and ignores case', async ({ page }) => {
    await openSearch(page);

    await searchFor(page, `bravo ${tag.toLowerCase()}`);

    await expect(projectNames(page)).toHaveText([names.bravo]);
  });

  test('category, owner and date filters each work and combine', async ({ page }) => {
    await openSearch(page);

    await choose(page, 'Category', searchCategory.category_name);
    await expect(projectNames(page)).toHaveText([names.alpha, names.bravo, names.delta]);

    await choose(page, 'Owner', ownerName);
    await expect(projectNames(page)).toHaveText([names.bravo]);

    await choose(page, 'Owner', 'All owners');
    await pickDate(page, 'From date', '2026-03-01');
    await expect(projectNames(page)).toHaveText([names.alpha, names.bravo]);

    await pickDate(page, 'To date', '2026-04-30');
    await expect(projectNames(page)).toHaveText([names.alpha]);
    await expect(page).toHaveURL(/from=2026-03-01&to=2026-04-30/);

    await page.goto(`/dashboard?search=${tag}&from=2026-06-15`);
    await expect(projectNames(page)).toHaveText([names.bravo, names.charlie]);
  });

  test('each sort order is right, including spend', async ({ page }) => {
    await openSearch(page);

    const orders: [string, string[]][] = [
      ['Name A-Z', [names.alpha, names.bravo, names.charlie, names.delta]],
      ['Name Z-A', [names.delta, names.charlie, names.bravo, names.alpha]],
      ['Start date newest', [names.charlie, names.bravo, names.alpha, names.delta]],
      ['Start date oldest', [names.alpha, names.bravo, names.charlie, names.delta]],
      ['Total spend highest', [names.bravo, names.alpha, names.charlie, names.delta]],
      ['Total spend lowest', [names.charlie, names.alpha, names.bravo, names.delta]],
    ];
    for (const [sort, expected] of orders) {
      await choose(page, 'Sort', sort);
      await expect(projectNames(page)).toHaveText(expected);
    }
  });

  test('refreshing keeps the filters and Clear filters resets them', async ({ page }) => {
    await openSearch(page);
    await choose(page, 'Category', searchCategory.category_name);
    await choose(page, 'Sort', 'Name Z-A');
    await expect(projectNames(page)).toHaveText([names.delta, names.bravo, names.alpha]);

    await page.reload();

    await expect(page.getByLabel('Search projects')).toHaveValue(tag);
    await expect(page.getByLabel('Category', { exact: true })).toHaveText(searchCategory.category_name);
    await expect(page.getByLabel('Sort', { exact: true })).toHaveText('Name Z-A');
    await expect(projectNames(page)).toHaveText([names.delta, names.bravo, names.alpha]);

    await page.getByRole('button', { name: 'Clear filters' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByLabel('Search projects')).toHaveValue('');
    await expect(page.getByLabel('Category', { exact: true })).toHaveText('All categories');
    await expect(page.getByLabel('Sort', { exact: true })).toHaveText('Sort by');
  });

  test('the back button restores the previous filters', async ({ page }) => {
    await openSearch(page);
    await choose(page, 'Category', searchCategory.category_name);
    await expect(projectNames(page)).toHaveCount(3);

    await page.goBack();

    await expect(page.getByLabel('Category', { exact: true })).toHaveText('All categories');
    await expect(projectNames(page)).toHaveCount(4);
  });

  test('shows an empty state when nothing matches', async ({ page }) => {
    await openSearch(page);

    await searchFor(page, `No Such Project ${tag}`);

    await expect(page.getByRole('heading', { name: 'No projects match your filters' })).toBeVisible();
    await expect(projectNames(page)).toHaveCount(0);
    await page.getByRole('main').getByRole('button', { name: 'Clear filters' }).last().click();
    await expect(page.getByLabel('Search projects')).toHaveValue('');
    await expect(page.getByRole('heading', { name: 'No projects match your filters' })).toBeHidden();
  });

  test('paging works with a filter on and a filter change returns to the first page', async ({ page }) => {
    const { api } = await apiAs('contributor');
    const pageTag = `PP${runId()}`;
    for (let index = 1; index <= 8; index++) {
      await createProject(api, { name: `E2E Paging ${pageTag} ${index}`, category: searchCategory });
    }
    const { pagination } = await (await api.get(`projects?offset=0&limit=6&search=${pageTag}`)).json();
    expect(pagination).toEqual(expect.objectContaining({ totalItems: 8, totalPages: 2 }));

    await loginInUi(page, 'admin');
    await searchFor(page, pageTag);
    await expect(projectNames(page)).toHaveCount(6);
    const pager = page.getByRole('navigation', { name: 'pagination' });
    await expect(pager.getByRole('link', { name: '2', exact: true })).toBeVisible();
    await expect(pager.getByRole('link', { name: '3', exact: true })).toHaveCount(0);

    await pager.getByRole('link', { name: '2', exact: true }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(projectNames(page)).toHaveText([`E2E Paging ${pageTag} 7`, `E2E Paging ${pageTag} 8`]);

    await choose(page, 'Sort', 'Name Z-A');
    await expect(page).not.toHaveURL(/page=/);
    await expect(projectNames(page)).toHaveCount(6);
    await expect(projectNames(page).first()).toHaveText(`E2E Paging ${pageTag} 8`);
  });

  test('Read-only users can filter by owner', async ({ page }) => {
    const { api } = await apiAs('readOnly');
    const owners = await (await api.get('projects/owners')).json();
    expect(owners).toEqual(expect.arrayContaining([expect.objectContaining({ display_name: 'e2e_contributor' })]));

    await loginInUi(page, 'readOnly');
    await searchFor(page, tag);
    await choose(page, 'Owner', 'e2e_contributor');

    await expect(projectNames(page)).toHaveText([names.alpha, names.charlie, names.delta]);
  });

  test('API rejects bad filter values with a clear message', async () => {
    const { api } = await apiAs('readOnly');

    const badSort = await api.get('projects?sort=budget');
    expect(badSort.status()).toBe(400);
    expect((await badSort.json()).message).toContain('Sort must be one of');

    const badRange = await api.get('projects?from=2026-05-01&to=2026-04-01');
    expect(badRange.status()).toBe(400);
    expect((await badRange.json()).message).toBe('From date must be on or before the To date');
  });
});
