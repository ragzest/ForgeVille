import { expect, test, type Page } from '@playwright/test';

async function position(page: Page): Promise<{ x: number; z: number }> {
  const raw = await page.getByTestId('office-canvas').locator('canvas').getAttribute('data-player');
  const [x = NaN, z = NaN] = (raw ?? '').split(',').map(Number);
  return { x, z };
}

/** Holds a key until `done` passes, polling; headless software rendering can be slow. */
async function holdUntil(page: Page, key: string, done: () => Promise<boolean>) {
  await page.keyboard.down(key);
  try {
    await expect.poll(done, { timeout: 20_000, intervals: [100] }).toBe(true);
  } finally {
    await page.keyboard.up(key);
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-shell-status="ready"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('office-canvas').locator('canvas')).toHaveAttribute('data-player', /,/);
});

test('walking up to a desk shows a hint; E opens its panel and Escape closes it', async ({ page }) => {
  const hint = page.locator('.interact-hint');
  await expect(hint).toHaveCount(0); // nothing in reach at the entrance

  // Walk north from the entrance until something is in reach.
  await holdUntil(page, 'KeyW', async () => (await hint.count()) > 0);
  await expect(hint).toContainText('E');
  const label = (await hint.locator('span').textContent()) ?? '';
  expect(label).toMatch(/'s desk$/);

  await page.keyboard.press('KeyE');
  const panel = page.getByRole('dialog', { name: label });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText(/desk:agent-/);
  await expect(hint).toHaveCount(0);

  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(hint).toBeVisible();
});

test('clicking a desk while the pointer is unlocked opens its panel', async ({ page }) => {
  // Walk up close to the front-row desk on the right of the aisle, facing it.
  await holdUntil(page, 'KeyW', async () => (await position(page)).z < -0.9);
  const canvas = page.getByTestId('office-canvas').locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('no canvas');

  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.62);
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText(/desk:agent-/);
  await page.getByRole('button', { name: 'Close panel' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('E does nothing while typing in a field', async ({ page }) => {
  const hint = page.locator('.interact-hint');
  await holdUntil(page, 'KeyW', async () => (await hint.count()) > 0);

  await page.evaluate(() => {
    const input = document.createElement('input');
    input.setAttribute('aria-label', 'Dummy input');
    document.getElementById('overlay-root')?.append(input);
  });
  await page.getByLabel('Dummy input').focus();
  await page.keyboard.press('KeyE');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByLabel('Dummy input')).toHaveValue('e');
});
