import { expect, test, type Page } from '@playwright/test';

const toolbar = (page: Page) => page.getByRole('navigation', { name: 'Office navigation' });

test('riding to another floor re-themes the office without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  await page.goto('/');
  await expect(page.locator('[data-shell-status="ready"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.shell')).toHaveAttribute('data-floor', 'workshop');
  await expect(page.getByLabel('You are on Floor 1 · Workshop')).toContainText('Lantern team');

  await toolbar(page).getByRole('button', { name: 'Floor 3 · Night Studio' }).click();
  await expect(page.locator('.shell')).toHaveAttribute('data-floor', 'night-studio');
  await expect(page.getByLabel('You are on Floor 3 · Night Studio')).toContainText('Vacant');
  await expect(page.getByRole('status').filter({ hasText: 'Floor 3 · Night Studio' })).toBeVisible();
  await expect(page.getByTestId('office-canvas').locator('canvas')).toBeVisible();

  // The 2D view explains that the team lives elsewhere and offers the way back.
  await toolbar(page).getByRole('button', { name: '2D view' }).click();
  await page.getByRole('button', { name: 'Go to Floor 1 · Workshop' }).click();
  await expect(page.locator('.shell')).toHaveAttribute('data-floor', 'workshop');
  expect(errors).toEqual([]);
});
