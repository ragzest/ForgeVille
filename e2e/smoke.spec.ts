import { expect, test } from '@playwright/test';

test('app shell loads with the ForgeVille title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/ForgeVille/);
  await expect(page.getByRole('main')).toBeVisible();
});
