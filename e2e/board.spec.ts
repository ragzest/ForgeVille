import { expect, test, type Page } from '@playwright/test';

const canvas = (page: Page) => page.getByTestId('office-canvas').locator('canvas');
const toolbar = (page: Page) => page.getByRole('navigation', { name: 'Office navigation' });

async function ready(page: Page, url = '/') {
  await page.goto(url);
  await expect(page.locator('[data-shell-status="ready"]')).toBeVisible({ timeout: 30_000 });
  await expect(canvas(page)).toHaveAttribute('data-player', /,/);
}

test('walking to the whiteboard and pressing E opens the board overlay', async ({ page }) => {
  await ready(page, '/?scenario=agent-blocked');
  await toolbar(page).getByRole('button', { name: 'Kanban board' }).click();

  // The zone anchor faces the board; step forward until it is in reach.
  const hint = page.locator('.interact-hint');
  await page.keyboard.down('KeyW');
  try {
    await expect.poll(async () => (await hint.textContent()) ?? '', { timeout: 20_000, intervals: [100] }).toContain('Kanban board');
  } finally {
    await page.keyboard.up('KeyW');
  }
  await page.keyboard.press('KeyE');

  const board = page.getByRole('dialog', { name: 'Kanban board' });
  await expect(board).toBeVisible();
  const headings = board.getByRole('heading', { level: 3 });
  await expect(headings).toHaveText([/^Backlog/, /^Ready/, /^In Progress/, /^In Review/, /^QA/, /^Blocked/, /^Merged/]);

  const blocked = board.getByRole('region', { name: /^Blocked ·/ });
  const note = blocked.getByRole('button', { name: /LN-4/ });
  await expect(note).toContainText('Chen');
  await expect(note).toContainText('Blocked (from In Progress)');
  await expect(board.getByRole('region', { name: /^QA ·/ })).toContainText('Nothing in QA. The test bench is quiet.');

  await note.click();
  await expect(board.getByRole('region', { name: /^LN-4 · / })).toContainText('Depends on');

  await page.keyboard.press('Escape');
  await expect(board).toBeHidden();
});

test('the board overlay stacks its columns on a phone without sideways scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await toolbar(page).getByRole('button', { name: '2D view' }).click();
  await page.getByRole('button', { name: 'Open board' }).click();

  const board = page.getByRole('dialog', { name: 'Kanban board' });
  await expect(board).toBeVisible();
  const box = await board.boundingBox();
  if (!box) throw new Error('no board');
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

  const merged = board.getByRole('region', { name: /^Merged ·/ });
  await merged.scrollIntoViewIfNeeded();
  await expect(merged).toBeInViewport();
  await board.getByRole('button', { name: 'Close panel' }).click();
  await expect(board).toBeHidden();
});

test('a legal move updates the board and the roster; an illegal one shows the reason', async ({ page }) => {
  await ready(page);
  await toolbar(page).getByRole('button', { name: '2D view' }).click();
  const ada = page.getByRole('region', { name: 'Team' }).getByRole('listitem').filter({ hasText: 'Ada' });
  await expect(ada).toContainText('Working');

  await page.getByRole('button', { name: 'Open board' }).click();
  const board = page.getByRole('dialog', { name: 'Kanban board' });
  await board.getByRole('button', { name: /LN-2/ }).click();
  const detail = board.getByRole('region', { name: /^LN-2 · / });
  await expect(detail).toContainText('Depends on');
  await expect(detail).toContainText('LN-1');

  await detail.getByRole('button', { name: 'Move to In Review' }).click();
  await expect(detail.getByRole('status')).toContainText('LN-2 moved from In Progress to In Review.');
  await expect(board.getByRole('region', { name: /^In Review ·/ }).getByRole('button', { name: /LN-2/ })).toBeVisible();
  await expect(ada).toContainText('Awaiting review');

  await detail.getByText('Try a move the rules refuse').click();
  await detail.getByRole('button', { name: 'Try Backlog' }).click();
  await expect(detail.getByRole('alert')).toContainText('LN-2 is In Review; it cannot move to Backlog.');
  await expect(board.getByRole('region', { name: /^In Review ·/ }).getByRole('button', { name: /LN-2/ })).toBeVisible();
});
