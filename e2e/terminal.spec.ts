import { expect, test, type Page } from '@playwright/test';

const canvas = (page: Page) => page.getByTestId('office-canvas').locator('canvas');

async function position(page: Page): Promise<{ x: number; z: number }> {
  const raw = await canvas(page).getAttribute('data-player');
  const [x = NaN, z = NaN] = (raw ?? '').split(',').map(Number);
  return { x, z };
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-shell-status="ready"]')).toBeVisible({ timeout: 30_000 });
  await expect(canvas(page)).toHaveAttribute('data-player', /,/);
});

test('the terminal opens on the newest line and W does not move the player', async ({ page }) => {
  // Walk north until a desk is in reach, then open it.
  const hint = page.locator('.interact-hint');
  await page.keyboard.down('KeyW');
  try {
    await expect.poll(async () => (await hint.count()) > 0, { timeout: 20_000, intervals: [100] }).toBe(true);
  } finally {
    await page.keyboard.up('KeyW');
  }
  await page.keyboard.press('KeyE');
  const panel = page.getByRole('dialog');
  await panel.getByRole('button', { name: 'Open terminal' }).click();

  const terminal = panel.getByRole('region', { name: 'Simulated session' });
  await expect(terminal).toBeVisible();
  await expect(terminal).toHaveAttribute('data-captures-keys');
  await expect(terminal.getByText('SIMULATED', { exact: true })).toBeVisible();
  const log = terminal.getByRole('log');
  await expect(log).toBeFocused();

  // Scrolled to the newest line.
  const atBottom = await log.evaluate((el) => el.scrollTop + el.clientHeight >= el.scrollHeight - 2);
  expect(atBottom).toBe(true);

  // Holding W while the terminal is open leaves the player where they are.
  const before = await position(page);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(1200);
  await page.keyboard.up('KeyW');
  expect(await position(page)).toEqual(before);

  // Clicking empty office space (the ceiling) neither locks the mouse nor resumes walking.
  const box = await canvas(page).boundingBox();
  if (!box) throw new Error('no canvas');
  await page.mouse.click(box.x + 40, box.y + 20);
  await expect(terminal).toBeVisible();
  expect(await page.evaluate(() => document.pointerLockElement)).toBeNull();
  await expect(log).not.toBeFocused(); // focus left the terminal; only the movement pause holds the player
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(1200);
  await page.keyboard.up('KeyW');
  expect(await position(page)).toEqual(before);

  await panel.getByRole('button', { name: 'Back to desk' }).click();
  await expect(terminal).toBeHidden();
  await panel.getByRole('button', { name: 'Close panel' }).click();
  await expect(panel).toBeHidden();
});
