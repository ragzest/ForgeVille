import { expect, test, type Page } from '@playwright/test';

async function ready(page: Page, url = '/') {
  await page.goto(url);
  await expect(page.locator('[data-shell-status="ready"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('office-canvas').locator('canvas')).toHaveAttribute('data-player', /,/);
}

async function openTwoD(page: Page) {
  await page.getByRole('navigation', { name: 'Office navigation' }).getByRole('button', { name: '2D view' }).click();
  await expect(page.getByRole('region', { name: 'Team' })).toBeVisible();
}

test('the 2D roster opens the desk panel with the agent and their work', async ({ page }) => {
  await ready(page, '/?scenario=agent-blocked');
  await openTwoD(page);

  await page.getByRole('button', { name: "Open Chen's desk" }).click();
  const panel = page.getByRole('dialog', { name: "Chen's desk" });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('Full-stack developer');
  await expect(panel).toContainText('Blocked');
  await expect(panel).toContainText('LN-4');
  await expect(panel).toContainText('OpenCode');
  await expect(panel).toContainText('Qwen Coder');
  await expect(panel.getByText('Mock estimate')).toBeVisible();
  await expect(panel).toContainText('desk:agent-chen');
  await expect(panel.getByText('Pause, resume, and interrupt arrive with S05-03.')).toBeVisible();

  await panel.getByRole('button', { name: 'Inspect task' }).click();
  await expect(panel.getByRole('status')).toContainText('Selected for the board: LN-4');
  await expect(page.getByRole('region', { name: 'Board' }).locator('li.is-selected')).toContainText('LN-4');

  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
});

test('the desk panel fits and closes at phone width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await openTwoD(page);

  await page.getByRole('button', { name: "Open Ada's desk" }).click();
  const panel = page.getByRole('dialog', { name: "Ada's desk" });
  await expect(panel).toBeVisible();

  const box = await panel.boundingBox();
  if (!box) throw new Error('no panel');
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(390);

  // Every action stays reachable by scrolling the panel.
  await panel.getByRole('button', { name: 'Interrupt' }).scrollIntoViewIfNeeded();
  await expect(panel.getByRole('button', { name: 'Interrupt' })).toBeInViewport();

  await panel.getByRole('button', { name: 'Close panel' }).click();
  await expect(panel).toBeHidden();
});
