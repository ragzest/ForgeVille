import { expect, test, type Page } from '@playwright/test';

const toolbar = (page: Page) => page.getByRole('navigation', { name: 'Office navigation' });

test('riding to another floor re-themes the office without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  await page.goto('/');
  await expect(page.locator('[data-shell-status="ready"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.shell')).toHaveAttribute('data-floor', 'workshop');
  await expect(page.getByLabel('You are on Floor 1 · Workshop')).toContainText('Lantern team');

  await toolbar(page).getByRole('button', { name: 'Floor 3 · Night Studio' }).click();
  await expect(page.locator('.shell')).toHaveAttribute('data-floor', 'night-studio');
  await expect(page.getByLabel('You are on Floor 3 · Night Studio')).toContainText('Vacant');
  await expect(page.getByRole('status').filter({ hasText: 'Floor 3 · Night Studio' })).toBeVisible();
  await expect(page.getByTestId('office-canvas').locator('canvas')).toBeVisible();

  // The 2D view explains that the team lives elsewhere and offers the way back.
  await toolbar(page).getByRole('button', { name: '2D view' }).click();
  await page.getByRole('button', { name: 'Go to Floor 1 · Workshop' }).click();
  await expect(page.locator('.shell')).toHaveAttribute('data-floor', 'workshop');

  // Back home, the team is present again: the floor chip names them and every desk is listed.
  await expect(page.getByRole('status').filter({ hasText: 'is vacant' })).toBeHidden();
  await expect(page.locator('.floor-chip')).toContainText('Lantern team');
  const team = page.getByRole('region', { name: 'Team' });
  await expect(team.getByRole('button', { name: /^Open .+'s desk$/ })).not.toHaveCount(0);

  // And the 3D office draws the workshop again.
  await toolbar(page).getByRole('button', { name: 'Walk' }).click();
  await expect(page.getByLabel('You are on Floor 1 · Workshop')).toContainText('Lantern team');
  await expect(page.getByTestId('office-canvas').locator('canvas')).toBeVisible();
  expect(errors).toEqual([]);
});

test('floor 2 has its own team in the 2D roster, and the elevator summarises both teams', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-shell-status="ready"]')).toBeVisible({ timeout: 30_000 });

  await toolbar(page).getByRole('button', { name: 'Floor 2 · Greenhouse' }).click();
  await expect(page.getByLabel('You are on Floor 2 · Greenhouse')).toContainText('Sprout team');

  await toolbar(page).getByRole('button', { name: '2D view' }).click();
  const team = page.getByRole('region', { name: 'Team' });
  await expect(team).toContainText('Sprout team · Floor 2 · Greenhouse');
  await expect(team.getByRole('button', { name: /^Open .+'s desk$/ })).toHaveCount(4);
  await expect(team.getByRole('button', { name: "Open Hana's desk" })).toBeVisible();
  await expect(team.getByRole('button', { name: "Open Ada's desk" })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Board' })).toContainText('SP-1');
  await expect(page.getByRole('region', { name: 'Board' })).not.toContainText('LN-2');

  // An event about someone downstairs offers the ride instead of their desk.
  await page.getByRole('button', { name: 'Open mission control' }).click();
  const mission = page.getByRole('dialog', { name: 'Mission control' });
  await expect(mission.getByRole('heading', { name: /This floor/ })).toContainText('Sprout team');
  await mission.getByRole('button', { name: "Open Ada's desk" }).click();
  const away = page.getByRole('dialog', { name: "Ada's desk" });
  await away.getByRole('button', { name: 'Go to floor 1' }).click();
  await expect(page.locator('.shell')).toHaveAttribute('data-floor', 'workshop');
  await expect(page.getByRole('dialog', { name: "Ada's desk" })).toContainText('Agent id');
});
