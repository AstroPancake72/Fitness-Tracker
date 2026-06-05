import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  await page.fill('input[type="email"]', 'test@gmail.com');
  await page.fill('input[type="password"]', '123');
  await page.getByRole('button', { name: 'Log In' }).click();
  await expect(page.getByRole('button', { name: "Create New Routine Template" })).toBeVisible();
  await page.context().storageState({ path: authFile });
});