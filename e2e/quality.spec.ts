import { expect, test, type Page } from '@playwright/test';

const toolbar = (page: Page) => page.getByRole('navigation', { name: 'Office navigation' });

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

async function ready(page: Page, url: string) {
  await page.goto(url);
  await expect(page.locator('[data-shell-status="ready"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('office-canvas').locator('canvas')).toHaveAttribute('data-player', /,/);
}

const canvasQuality = (page: Page) => page.getByTestId('office-canvas').locator('[data-quality]');

test('quality is Medium by default, and a choice applies at once and survives a reload', async ({ page }) => {
  const errors = collectErrors(page);
  await ready(page, '/');
  const settings = toolbar(page).getByRole('button', { name: 'Graphics: Medium' });
  await expect(settings).toBeVisible();
  await expect(canvasQuality(page)).toHaveAttribute('data-quality', 'medium');

  await settings.click();
  const popover = page.getByRole('dialog', { name: 'Graphics settings' });
  await popover.getByRole('radio', { name: /^High/ }).check();
  await expect(canvasQuality(page)).toHaveAttribute('data-quality', 'high');
  // The glow pass draws without errors on the night floor too.
  await page.keyboard.press('Escape');
  await toolbar(page).getByRole('button', { name: 'Floor 3 · Night Studio' }).click();
  await page.waitForTimeout(1_500);

  await toolbar(page).getByRole('button', { name: 'Graphics: High' }).click();
  await page.getByRole('dialog', { name: 'Graphics settings' }).getByRole('radio', { name: /^Low/ }).check();
  await expect(canvasQuality(page)).toHaveAttribute('data-quality', 'low');

  await ready(page, '/');
  await expect(toolbar(page).getByRole('button', { name: 'Graphics: Low' })).toBeVisible({ timeout: 15_000 });
  await expect(canvasQuality(page)).toHaveAttribute('data-quality', 'low');
  expect(errors).toEqual([]);
});

test('Auto steps down when the frame rate stays low, and says so', async ({ page }) => {
  // Software WebGL runs well under 45 fps, so Auto has to drop from High.
  await page.addInitScript(() => {
    localStorage.setItem('forgeville.quality', 'auto');
  });
  await ready(page, '/');
  await expect(page.getByRole('status').filter({ hasText: 'Auto dropped graphics to Medium' })).toBeVisible({ timeout: 30_000 });
  await expect(toolbar(page).getByRole('button', { name: /^Graphics: Auto · (Medium|Low)$/ })).toBeVisible();
});

test('?debug=perf shows a frame-time readout', async ({ page }) => {
  await ready(page, '/?debug=perf');
  await expect(page.getByTestId('perf-readout')).toContainText(/\d+(\.\d)? ms · \d+ fps · \d+ calls/, { timeout: 10_000 });
  await ready(page, '/');
  await expect(page.getByTestId('perf-readout')).toHaveCount(0);
});
