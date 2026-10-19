import { expect, test, type Page } from '@playwright/test';
import { lowContrastText } from './contrast.ts';

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

test('panels keep readable text, and a ride to every floor logs no errors', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  await ready(page, '/?scenario=qa-failure');
  await toolbar(page).getByRole('button', { name: '2D view' }).click();
  expect(await lowContrastText(page), '2D view').toEqual([]);

  await page.getByRole('button', { name: "Open Chen's desk" }).click();
  const desk = page.getByRole('dialog', { name: "Chen's desk" });
  await desk.getByRole('button', { name: 'Open terminal' }).click();
  expect(await lowContrastText(page), 'desk and terminal').toEqual([]);
  await desk.getByRole('button', { name: 'Close panel' }).click();

  await page.getByRole('region', { name: 'QA lab' }).getByRole('button', { name: 'Open QA screen' }).click();
  const qa = page.getByRole('dialog', { name: 'QA screen' });
  // The button is aria-disabled, not disabled: pressing it shows the refusal.
  await qa.getByRole('button', { name: 'Merge', exact: true }).click({ force: true });
  await expect(qa.getByRole('alert')).toContainText('✕');
  expect(await lowContrastText(page), 'QA refusal').toEqual([]);
  await qa.getByRole('button', { name: 'Close panel' }).click();

  await page.getByRole('button', { name: 'Open board' }).click();
  const board = page.getByRole('dialog', { name: 'Kanban board' });
  expect(await lowContrastText(page), 'board').toEqual([]);
  await board.getByRole('button', { name: 'Close panel' }).click();

  await toolbar(page).getByRole('button', { name: 'Walk' }).click();
  for (const [name, id] of [
    ['Floor 2 · Greenhouse', 'greenhouse'],
    ['Floor 3 · Night Studio', 'night-studio'],
    ['Floor 4 · Ember Forge', 'ember-forge'],
    ['Floor 1 · Workshop', 'workshop'],
  ] as const) {
    await toolbar(page).getByRole('button', { name }).click();
    await expect(page.locator('.shell')).toHaveAttribute('data-floor', id);
    expect(await lowContrastText(page), id).toEqual([]);
  }
  // Give the dev-only material audit time to look at the last floor.
  await page.waitForTimeout(2_000);
  expect(errors).toEqual([]);
});

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the shell and the terminal stop looping animation', async ({ page }) => {
    await ready(page, '/');
    await expect(page.locator('.shell')).toHaveAttribute('data-reduced-motion', 'true');
    await toolbar(page).getByRole('button', { name: '2D view' }).click();
    await page.getByRole('button', { name: "Open Ada's desk" }).click();
    await page.getByRole('dialog', { name: "Ada's desk" }).getByRole('button', { name: 'Open terminal' }).click();
    const cursor = page.locator('.terminal-cursor');
    await expect(cursor).toBeAttached();
    await expect(cursor).not.toHaveClass(/is-blinking/);
  });
});

test('a failed start offers the 2D view, and the 3D office again from there', async ({ page }) => {
  await page.goto('/?shell=error');
  const alert = page.getByRole('alert');
  await expect(alert.getByRole('heading', { name: 'The office hit a snag' })).toBeVisible();
  await alert.getByRole('button', { name: 'Use the 2D view' }).click();
  await expect(page.getByRole('heading', { name: 'Using the 2D view' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Team' })).toBeVisible();
  await page.getByRole('button', { name: 'Try the 3D office again' }).click();
  await expect(page.locator('[data-shell-status="ready"]')).toBeVisible({ timeout: 30_000 });
});
