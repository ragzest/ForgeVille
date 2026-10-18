import { expect, test, type Page } from '@playwright/test';

const canvas = (page: Page) => page.getByTestId('office-canvas').locator('canvas');

async function position(page: Page): Promise<{ x: number; z: number }> {
  const raw = await canvas(page).getAttribute('data-player');
  const [x = NaN, z = NaN] = (raw ?? '').split(',').map(Number);
  return { x, z };
}

async function ready(page: Page, url = '/') {
  await page.goto(url);
  await expect(page.locator('[data-shell-status="ready"]')).toBeVisible({ timeout: 30_000 });
  await expect(canvas(page)).toHaveAttribute('data-player', /,/);
}

const toolbar = (page: Page) => page.getByRole('navigation', { name: 'Office navigation' });

test('zone buttons move the player to each zone anchor', async ({ page }) => {
  await ready(page);
  const anchors: Record<string, [number, number]> = {
    'Kanban board': [-8.2, -2],
    'QA lab': [8.5, -0.8],
    Reception: [6.5, 5],
    'Meeting area': [-4.4, 5.5],
  };
  for (const [label, [x, z]] of Object.entries(anchors)) {
    await toolbar(page).getByRole('button', { name: label }).click();
    await expect.poll(async () => position(page), { timeout: 15_000 }).toEqual({ x, z });
    await expect(toolbar(page).getByRole('button', { name: label })).toHaveAttribute('aria-pressed', 'true');
  }
});

test('overview shows the whole floor and pauses movement', async ({ page }) => {
  await ready(page);
  await toolbar(page).getByRole('button', { name: 'Overview' }).click();
  await expect(page.getByText(/Overview: movement is paused/)).toBeVisible();

  const before = await position(page);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(1500);
  await page.keyboard.up('KeyW');
  expect(await position(page)).toEqual(before);

  // Picking a zone from the overview drops the player there, back in walk mode.
  await toolbar(page).getByRole('button', { name: 'Project status' }).click();
  await expect(toolbar(page).getByRole('button', { name: 'Walk' })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => position(page), { timeout: 15_000 }).toEqual({ x: -1, z: 4.6 });
});

test('the 2D view replaces the canvas and lists zones, team, and tasks', async ({ page }) => {
  await ready(page, '/?scenario=agent-blocked');
  await toolbar(page).getByRole('button', { name: '2D view' }).click();

  await expect(page.getByTestId('office-canvas')).toHaveCount(0);
  const team = page.getByRole('region', { name: 'Team' });
  await expect(team.getByRole('listitem')).toHaveCount(7);
  await expect(team.getByRole('listitem').filter({ hasText: 'Chen' })).toContainText('Blocked');
  await expect(page.getByRole('region', { name: 'Board' })).toContainText('LN-4');

  const zones = page.getByRole('region', { name: 'Zones' });
  await zones.getByRole('button', { name: 'Kanban board' }).click();
  await expect(zones.getByRole('button', { name: 'Kanban board' })).toHaveAttribute('aria-pressed', 'true');

  // Back to the 3D office.
  await toolbar(page).getByRole('button', { name: 'Walk' }).click();
  await expect(canvas(page)).toBeVisible({ timeout: 30_000 });
});

test('keyboard users reach the view and zone controls without pointer lock', async ({ page }) => {
  await ready(page);
  await page.keyboard.press('Tab');
  await expect(toolbar(page).getByRole('button', { name: 'Walk' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(toolbar(page).getByRole('button', { name: 'Overview' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(toolbar(page).getByRole('button', { name: 'Overview' })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter'); // 2D view
  await expect(page.getByRole('region', { name: 'Team' })).toBeVisible();
});

test('without WebGL the 2D alternative works with zone selection', async ({ page }) => {
  await page.goto('/?webgl=off');
  await expect(page.locator('[data-shell-status="no-webgl"]')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Team' }).getByRole('listitem')).toHaveCount(7);
  await toolbar(page).getByRole('button', { name: 'Reception' }).click();
  await expect(toolbar(page).getByRole('button', { name: 'Reception' })).toHaveAttribute('aria-pressed', 'true');
});

test.describe('narrow viewport', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the toolbar stays reachable and the 2D view stacks without overflowing', async ({ page }) => {
    await ready(page);
    const last = toolbar(page).getByRole('button', { name: 'Meeting area' });
    await expect(last).toBeVisible();
    const box = await last.boundingBox();
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390);

    await toolbar(page).getByRole('button', { name: '2D view' }).click();
    const zones = await page.getByRole('region', { name: 'Zones' }).boundingBox();
    const team = await page.getByRole('region', { name: 'Team' }).boundingBox();
    expect(team?.y ?? 0).toBeGreaterThan((zones?.y ?? 0) + (zones?.height ?? 0) - 1); // stacked, not side by side
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
