import { expect, test, type Page } from '@playwright/test';

const canvas = (page: Page) => page.getByTestId('office-canvas').locator('canvas');
const toolbar = (page: Page) => page.getByRole('navigation', { name: 'Office navigation' });

async function ready(page: Page, url: string) {
  await page.goto(url);
  await expect(page.locator('[data-shell-status="ready"]')).toBeVisible({ timeout: 30_000 });
  await expect(canvas(page)).toHaveAttribute('data-player', /,/);
}

test('walking to the status display and pressing E opens mission control', async ({ page }) => {
  await ready(page, '/?scenario=qa-failure');
  await toolbar(page).getByRole('button', { name: 'Project status' }).click();

  const hint = page.locator('.interact-hint');
  await page.keyboard.down('KeyW');
  try {
    await expect
      .poll(async () => (await hint.textContent()) ?? '', { timeout: 20_000, intervals: [100] })
      .toContain('Project status display');
  } finally {
    await page.keyboard.up('KeyW');
  }
  await page.keyboard.press('KeyE');

  const panel = page.getByRole('dialog', { name: 'Mission control' });
  await expect(panel.getByRole('list', { name: 'Metrics' }).getByRole('listitem')).toHaveCount(8);
  await expect(panel.locator('[data-metric="recentFailures"]')).toContainText('Browser tests failed on Pull request #2');
  await expect(panel.getByRole('list', { name: 'Recent events' }).getByRole('listitem').first()).toContainText('✕ Failed');

  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
});

test('on a phone-sized screen mission control starts collapsed and keeps its close button in view', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page, '/?scenario=agent-blocked');
  await toolbar(page).getByRole('button', { name: '2D view' }).click();
  await page.getByRole('region', { name: 'Project status' }).getByRole('button', { name: 'Open mission control' }).click();

  const panel = page.getByRole('dialog', { name: 'Mission control' });
  const summary = panel.getByRole('button', { name: /active/ });
  await expect(summary).toHaveAttribute('aria-expanded', 'false');
  await expect(summary).toContainText('⛔ 1 blocked');
  await expect(panel.getByRole('button', { name: 'Close panel' })).toBeInViewport();

  await summary.click();
  await expect(panel.locator('[data-metric="blockedTasks"]')).toContainText('Needs attention');
  await expect(panel.getByRole('button', { name: 'Close panel' })).toBeInViewport();
});
