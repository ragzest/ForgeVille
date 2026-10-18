import { expect, test } from '@playwright/test';

test('app shell loads with the ForgeVille title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/ForgeVille/);
  await expect(page.getByRole('main')).toBeVisible();
  // Headless browsers may or may not have WebGL; either outcome is a booted shell.
  await expect(page.locator('[data-shell-status="ready"], [data-shell-status="no-webgl"]')).toBeVisible();
});

test('?shell=error shows a message and retry recovers', async ({ page }) => {
  await page.goto('/?shell=error');
  const alert = page.getByRole('alert');
  await expect(alert).toContainText('The office could not start.');
  await alert.getByRole('button', { name: 'Retry' }).click();
  await expect(alert).toBeHidden();
  await expect(page.locator('[data-shell-status="ready"], [data-shell-status="no-webgl"]')).toBeVisible();
});

test('without WebGL the shell offers the 2D team and board regions', async ({ page }) => {
  await page.goto('/?webgl=off');
  await expect(page.getByRole('heading', { name: 'The 3D office cannot start' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Team' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Board' })).toBeVisible();
});
