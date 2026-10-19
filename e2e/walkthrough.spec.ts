import { expect, test, type Page } from '@playwright/test';

/**
 * One walkthrough of the milestone-0 slice on the 2D path: pick the failing-check
 * scenario, try to merge, open an agent's terminal, ride to a vacant floor and back.
 * It runs twice: once from the 3D office (switching to 2D), once with WebGL off.
 */

const toolbar = (page: Page) => page.getByRole('navigation', { name: 'Office navigation' });

/** Hosts the prototype must never reach: GitHub and agent vendors. */
const FORBIDDEN_HOST = /(^|\.)(github\.com|githubusercontent\.com|anthropic\.com|claude\.ai|openai\.com)$/;
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])$/;

/**
 * Records every request that leaves the dev server, and aborts those to GitHub or
 * agent hosts so they can never succeed. The test fails if the list is not empty.
 */
async function guardNetwork(page: Page): Promise<string[]> {
  const external: string[] = [];
  await page.context().route(
    (url) => FORBIDDEN_HOST.test(url.hostname),
    (route) => route.abort('blockedbyclient'),
  );
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!/^(https?|wss?):$/.test(url.protocol)) return; // data:, blob: and the like stay in the page
    if (!LOCAL_HOST.test(url.hostname)) external.push(request.url());
  });
  page.on('websocket', (ws) => {
    const url = new URL(ws.url());
    if (!LOCAL_HOST.test(url.hostname)) external.push(ws.url());
  });
  return external;
}

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

/** Reaches the 2D view. With WebGL, checks the 3D canvas first, then switches. */
async function open2D(page: Page, webgl: boolean) {
  await page.goto(webgl ? '/' : '/?webgl=off');
  const shell = page.locator('[data-shell-status="ready"], [data-shell-status="no-webgl"]');
  await expect(shell).toBeVisible({ timeout: 30_000 });
  const status = await shell.getAttribute('data-shell-status');

  if (status === 'ready') {
    // WebGL is available in this browser, so the 3D office must have drawn a canvas.
    await expect(page.getByTestId('office-canvas').locator('canvas')).toBeVisible();
    await toolbar(page).getByRole('button', { name: '2D view' }).click();
  } else {
    // No WebGL (or it was turned off): the documented 2D path is the only one.
    if (webgl) test.info().annotations.push({ type: 'limitation', description: 'No WebGL in this browser; ran the 2D path only.' });
    await expect(page.getByRole('heading', { name: 'The 3D office cannot start' })).toBeVisible();
  }
  await expect(page.getByRole('region', { name: 'Team' })).toBeVisible();
}

async function walkthrough(page: Page) {
  // 1. The failing-check scenario: merge is refused and the failed check is named.
  await page.getByRole('combobox', { name: 'Scenario' }).selectOption({ label: 'QA failure' });
  await expect(page).toHaveURL(/\?(.*&)?scenario=qa-failure/);

  const lab = page.getByRole('region', { name: 'QA lab' });
  await expect(lab).toContainText('PR #2');
  await expect(lab).toContainText('Browser tests ✕ Failed');
  await lab.getByRole('button', { name: 'Open QA screen' }).click();

  const qa = page.getByRole('dialog', { name: 'QA screen' });
  await expect(qa).toContainText('#2 Add-to-list button on article cards');
  await expect(qa.getByRole('list', { name: 'Checks' }).getByRole('listitem')).toContainText(['Browser tests✕ Failed']);
  const merge = qa.getByRole('button', { name: 'Merge', exact: true });
  await expect(merge).toHaveAttribute('aria-disabled', 'true');
  // aria-disabled keeps the button focusable so a press can explain the refusal.
  await merge.focus();
  await page.keyboard.press('Enter');
  const refusal = qa.getByRole('alert');
  await expect(refusal).toContainText('Not merged:');
  await expect(refusal).toContainText('Browser tests failed: The add button overlaps the article title at 390px wide.');
  await expect(qa).toContainText('StateOpen');
  await qa.getByRole('button', { name: 'Close panel' }).click();
  await expect(qa).toBeHidden();

  // 2. An agent panel opens the simulated terminal, clearly labelled.
  const team = page.getByRole('region', { name: 'Team' });
  await team.getByRole('button', { name: "Open Ada's desk" }).click();
  const desk = page.getByRole('dialog', { name: "Ada's desk" });
  await desk.getByRole('button', { name: 'Open terminal' }).click();
  const terminal = desk.getByRole('region', { name: 'Simulated session' });
  await expect(terminal).toBeVisible();
  await expect(terminal.getByText('SIMULATED', { exact: true })).toBeVisible();
  await desk.getByRole('button', { name: 'Close panel' }).click();
  await expect(desk).toBeHidden();

  // 3. Ride to a vacant floor and back; the team is there again.
  const shell = page.locator('.shell');
  await expect(shell).toHaveAttribute('data-floor', 'workshop');
  await toolbar(page).getByRole('button', { name: 'Floor 3 · Night Studio' }).click();
  await expect(shell).toHaveAttribute('data-floor', 'night-studio');
  const vacant = page.getByRole('status').filter({ hasText: 'is vacant' });
  await expect(vacant).toContainText('Floor 3 · Night Studio is vacant. The Lantern team works on Floor 1 · Workshop');

  await vacant.getByRole('button', { name: 'Go to Floor 1 · Workshop' }).click();
  await expect(shell).toHaveAttribute('data-floor', 'workshop');
  await expect(vacant).toBeHidden();
  await expect(team.getByRole('button', { name: "Open Ada's desk" })).toBeVisible();
  // Coming back keeps the scenario the visitor picked.
  await expect(page.getByRole('combobox', { name: 'Scenario' })).toHaveValue('qa-failure');
  await expect(lab).toContainText('Browser tests ✕ Failed');
}

for (const webgl of [true, false]) {
  test(`walkthrough on the 2D path (${webgl ? 'from the 3D office' : 'WebGL off'})`, async ({ page }) => {
    const external = await guardNetwork(page);
    const errors = collectErrors(page);

    await open2D(page, webgl);
    await walkthrough(page);

    expect(external, 'requests left the dev server').toEqual([]);
    expect(errors).toEqual([]);
  });
}
