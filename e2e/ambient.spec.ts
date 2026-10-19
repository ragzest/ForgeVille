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

/** Everything the 2D view says about the team and the floor. */
async function teamText(page: Page): Promise<string> {
  await toolbar(page).getByRole('button', { name: '2D view' }).click();
  const text = await page.locator('.shell-main').innerText();
  await toolbar(page).getByRole('button', { name: 'Walk' }).click();
  return text;
}

test('"Follow the clock" is off by default and swaps each mood for the scenario time', async ({ page }) => {
  await ready(page, '/');
  const toggle = toolbar(page).getByRole('button', { name: 'Follow the clock' });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  // Off: each floor keeps its signature mood.
  await expect(page.locator('.shell')).toHaveAttribute('data-sky', 'morning');
  await toolbar(page).getByRole('button', { name: 'Floor 3 · Night Studio' }).click();
  await expect(page.locator('.shell')).toHaveAttribute('data-sky', 'night');

  // On: the seed's 08:30 reads as dawn on every floor.
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.shell')).toHaveAttribute('data-sky', 'dawn');
  await toolbar(page).getByRole('button', { name: 'Floor 1 · Workshop' }).click();
  await expect(page.locator('.shell')).toHaveAttribute('data-sky', 'dawn');

  await toggle.click();
  await expect(page.locator('.shell')).toHaveAttribute('data-sky', 'morning');
});

test('a watch of the living office logs no errors and changes no panel data', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  // A merge, so there is confetti, and idle agents, so there are errands.
  await ready(page, '/?scenario=successful-merge');
  const before = await teamText(page);
  await toolbar(page).getByRole('button', { name: 'Follow the clock' }).click();
  await toolbar(page).getByRole('button', { name: 'Overview' }).click();
  // Long enough for every idle agent's first errand to start (they get up 4–60 s in).
  await page.waitForTimeout(45_000);
  await toolbar(page).getByRole('button', { name: 'Floor 2 · Greenhouse' }).click();
  await page.waitForTimeout(5_000);
  await toolbar(page).getByRole('button', { name: 'Floor 1 · Workshop' }).click();
  expect(await teamText(page)).toBe(before);
  expect(errors).toEqual([]);
});
