import { expect, test } from '@playwright/test';

test('app shell loads with the ForgeVille title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/ForgeVille/);
  await expect(page.getByRole('main')).toBeVisible();
  // Headless browsers may or may not have WebGL; either outcome is a booted shell.
  await expect(page.locator('[data-shell-status="ready"], [data-shell-status="no-webgl"]')).toBeVisible();
});

test('the 3D office canvas mounts and the shell becomes ready', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  await page.goto('/');
  await expect(page.locator('[data-shell-status="ready"]')).toBeVisible({ timeout: 30_000 });
  const canvas = page.getByTestId('office-canvas').locator('canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThan(300);
  expect(box?.height ?? 0).toBeGreaterThan(200);
  expect(errors).toEqual([]);
});

test('?scenario= starts the office on that scenario', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  await page.goto('/?scenario=agent-blocked');
  await expect(page.locator('[data-shell-status="ready"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('office-canvas').locator('canvas')).toBeVisible();
  expect(errors).toEqual([]);
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
