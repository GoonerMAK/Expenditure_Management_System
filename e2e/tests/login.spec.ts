import { test, expect } from '@playwright/test';
import { data } from './helpers';

test.describe('Login', () => {
  test('the eye button reveals and hides the password without submitting', async ({ page }) => {
    await page.goto('/login');
    const password = page.locator('#password');
    await password.fill(data.password);
    await expect(password).toHaveAttribute('type', 'password');

    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(password).toHaveAttribute('type', 'text');
    await expect(password).toHaveValue(data.password);
    await expect(page).toHaveURL(/\/login$/);
    await page.screenshot({ path: 'screenshots/login-password-visible.png' });

    await page.getByRole('button', { name: 'Hide password' }).click();
    await expect(password).toHaveAttribute('type', 'password');

    await page.locator('#email').fill(data.users.admin.email);
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('the sign-up form has the same toggle', async ({ page }) => {
    await page.goto('/signup');
    const password = page.locator('#password');
    await password.fill('secret-123');

    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(password).toHaveAttribute('type', 'text');
  });
});
