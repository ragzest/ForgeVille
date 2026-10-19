import { expect, test, type Page } from '@playwright/test';

const canvas = (page: Page) => page.getByTestId('office-canvas').locator('canvas');
const toolbar = (page: Page) => page.getByRole('navigation', { name: 'Office navigation' });

async function ready(page: Page, url: string) {
  await page.goto(url);
  await expect(page.locator('[data-shell-status="ready"]')).toBeVisible({ timeout: 30_000 });
  await expect(canvas(page)).toHaveAttribute('data-player', /,/);
}

test('walking to the QA screen and pressing E opens the failing pull request', async ({ page }) => {
  await ready(page, '/?scenario=qa-failure');
  await toolbar(page).getByRole('button', { name: 'QA lab' }).click();

  const hint = page.locator('.interact-hint');
  await page.keyboard.down('KeyW');
  try {
    await expect.poll(async () => (await hint.textContent()) ?? '', { timeout: 20_000, intervals: [100] }).toContain('QA screen');
  } finally {
    await page.keyboard.up('KeyW');
  }
  await page.keyboard.press('KeyE');

  const panel = page.getByRole('dialog', { name: 'QA screen' });
  await expect(panel).toContainText('#2 Add-to-list button on article cards');
  const checks = panel.getByRole('list', { name: 'Checks' }).getByRole('listitem');
  await expect(checks).toHaveText(['Unit tests✓ Passed', 'Build✓ Passed', 'Browser tests✕ Failed']);
  await expect(panel.getByRole('list', { name: 'Merge blocked because' })).toContainText('Browser tests failed');
  await expect(panel.getByText(/^Simulated screenshot/)).toHaveCount(2);
  await expect(panel.getByRole('button', { name: 'Merge', exact: true })).toBeDisabled();

  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
});

test('the 2D QA lab opens the passing pull request, which the policy would merge', async ({ page }) => {
  await ready(page, '/?scenario=review-and-qa-pass');
  await toolbar(page).getByRole('button', { name: '2D view' }).click();
  const lab = page.getByRole('region', { name: 'QA lab' });
  await expect(lab).toContainText('Browser tests ✓ Passed');

  await lab.getByRole('button', { name: 'Open QA screen' }).click();
  const panel = page.getByRole('dialog', { name: 'QA screen' });
  await expect(panel.getByRole('list', { name: 'Checks' }).getByRole('listitem')).toHaveText([
    'Unit tests✓ Passed',
    'Build✓ Passed',
    'Browser tests✓ Passed',
  ]);
  await expect(panel).toContainText('The merge policy would allow this merge.');
});
