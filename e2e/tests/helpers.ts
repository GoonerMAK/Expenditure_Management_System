import { readFileSync } from 'node:fs';
import { request, type APIRequestContext, type Page, expect } from '@playwright/test';

export const data = JSON.parse(readFileSync(new URL('../test-data.json', import.meta.url), 'utf8'));

export type UserKey = 'admin' | 'contributor' | 'readOnly';

export const API_URL = process.env.API_URL ?? 'http://localhost:4000/api/';

// Unique suffix so reruns never clash with data kept from earlier runs
export const runId = () => `${Date.now()}`;

export const apiAs = async (user: UserKey): Promise<{ api: APIRequestContext; id: string }> => {
  const api = await request.newContext({ baseURL: API_URL });
  const res = await api.post('auth/login', { data: { email: data.users[user].email, password: data.password } });
  expect(res.status()).toBe(200);
  const { user: loggedIn } = await res.json();
  return { api, id: loggedIn.id };
};

export const loginInUi = async (page: Page, user: UserKey) => {
  await page.goto('/login');
  await page.locator('#email').fill(data.users[user].email);
  await page.locator('#password').fill(data.password);
  await page.getByRole('button', { name: /login/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
};

export const getCategory = async (api: APIRequestContext) => {
  const categories = await (await api.get('categories')).json();
  return categories.find((c: { category_name: string }) => c.category_name === data.category);
};
