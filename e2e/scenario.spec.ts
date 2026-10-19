import { expect, test, type Page } from '@playwright/test';

const canvas = (page: Page) => page.getByTestId('office-canvas').locator('canvas');
const toolbar = (page: Page) => page.getByRole('navigation', { name: 'Office navigation' });
const switcher = (page: Page) => page.getByRole('combobox', { name: 'Scenario' });

async function ready(page: Page, url: string) {
  await page.goto(url);
  await expect(page.locator('[data-shell-status="ready"]')).toBeVisible({ timeout: 30_000 });
  await expect(canvas(page)).toHaveAttribute('data-player', /,/);
}

async function openQaFrom2D(page: Page) {
  await toolbar(page).getByRole('button', { name: '2D view' }).click();
  await page.getByRole('region', { name: 'QA lab' }).getByRole('button', { name: 'Open QA screen' }).click();
  return page.getByRole('dialog', { name: 'QA screen' });
}

test('?scenario=qa-failure deep-links the failing check into the QA panel', async ({ page }) => {
  await ready(page, '/?scenario=qa-failure');
  await expect(switcher(page)).toHaveValue('qa-failure');
  const panel = await openQaFrom2D(page);
  await expect(panel.getByRole('list', { name: 'Checks' }).getByRole('listitem')).toContainText(['Browser tests✕ Failed']);
  await expect(panel.getByRole('list', { name: 'Merge blocked because' })).toContainText('Browser tests failed');
});

test('switching scenario updates the URL and the open views, and keeps the floor', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await ready(page, '/?scenario=qa-failure');
  const chip = page.locator('.floor-chip');
  const floorBefore = await chip.textContent();
  const panel = await openQaFrom2D(page);
  await expect(panel).toContainText('Browser tests✕ Failed');

  await switcher(page).selectOption({ label: 'Successful merge' });

  await expect(page).toHaveURL(/\?scenario=successful-merge$/);
  await expect(panel).toContainText('LN-2 · Merged');
  await expect(page.getByRole('region', { name: 'QA lab' })).toContainText('(merged)');
  await expect(chip).toHaveText(floorBefore ?? '');

  // Reloading keeps the chosen scenario: the URL is the source of truth.
  await page.reload();
  await expect(page.locator('[data-shell-status="ready"]')).toBeVisible({ timeout: 30_000 });
  await expect(switcher(page)).toHaveValue('successful-merge');
  expect(errors).toEqual([]);
});

test('an unknown scenario falls back to the default with a notice, and the office still works', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await ready(page, '/?scenario=nope');
  const notice = page.locator('.scenario-notice');
  await expect(notice).toContainText('There is no scenario called nope. Showing Feature in progress instead.');
  await expect(switcher(page)).toHaveValue('feature-in-progress');

  await notice.getByRole('button', { name: 'Dismiss notice' }).click();
  await expect(notice).toBeHidden();
  expect(errors).toEqual([]);
});
