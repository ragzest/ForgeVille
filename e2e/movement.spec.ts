import { expect, test, type Page } from '@playwright/test';

async function position(page: Page): Promise<{ x: number; z: number }> {
  const raw = await page.getByTestId('office-canvas').locator('canvas').getAttribute('data-player');
  const [x = NaN, z = NaN] = (raw ?? '').split(',').map(Number);
  return { x, z };
}

async function hold(page: Page, key: string, ms: number) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
  await page.waitForTimeout(100);
}

/**
 * Holds a key until the player has moved, then releases it. Headless software
 * rendering can drop to about one frame a second, so a fixed hold is unreliable.
 */
async function holdUntilMoved(page: Page, key: string, moved: (p: { x: number; z: number }) => boolean) {
  await page.keyboard.down(key);
  try {
    await expect.poll(async () => moved(await position(page)), { timeout: 15_000 }).toBe(true);
  } finally {
    await page.keyboard.up(key);
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-shell-status="ready"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('office-canvas').locator('canvas')).toHaveAttribute('data-player', /,/);
});

test('W walks forward and Shift+W keeps moving', async ({ page }) => {
  // Speeds are unit-tested; this checks that the keys reach the player.
  const start = await position(page);
  await holdUntilMoved(page, 'KeyW', (p) => p.z < start.z - 0.3);
  const walked = await position(page);
  expect(walked.x).toBeCloseTo(start.x, 1);

  await page.keyboard.down('Shift');
  await holdUntilMoved(page, 'KeyW', (p) => p.z < walked.z - 0.3);
  await page.keyboard.up('Shift');
});

test('arrow keys strafe', async ({ page }) => {
  const start = await position(page);
  await holdUntilMoved(page, 'ArrowLeft', (p) => p.x < start.x - 0.3);
  expect((await position(page)).z).toBeCloseTo(start.z, 1);
});

test('movement keys do nothing while a key-capturing element has focus', async ({ page }) => {
  // A stand-in for the terminal or a text field, which later stories add.
  await page.evaluate(() => {
    const input = document.createElement('input');
    input.setAttribute('aria-label', 'Dummy input');
    document.getElementById('overlay-root')?.append(input);
    const panel = document.createElement('div');
    panel.setAttribute('data-captures-keys', '');
    panel.setAttribute('tabindex', '-1');
    panel.setAttribute('aria-label', 'Dummy terminal');
    document.getElementById('overlay-root')?.append(panel);
  });

  await page.getByLabel('Dummy input').focus();
  const before = await position(page);
  await hold(page, 'KeyW', 400);
  await hold(page, 'ArrowLeft', 300);
  expect(await position(page)).toEqual(before);
  await expect(page.getByLabel('Dummy input')).toHaveValue('w');

  await page.getByLabel('Dummy terminal').focus();
  await hold(page, 'KeyD', 300);
  expect(await position(page)).toEqual(before);

  // Back on the page, keys move the player again.
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
  });
  await holdUntilMoved(page, 'KeyW', (p) => p.z < before.z);
});

test('the control hint explains how to move', async ({ page }) => {
  await expect(page.getByText(/Click the office to look around/)).toBeVisible();
});
