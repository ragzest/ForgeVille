import { describe, expect, it } from 'vitest';
import { buildScenario } from '../../services/mock/scenarios.ts';
import { CHECK_STATUS, checkRows, focusPullRequest, qaDisplay } from './qa.ts';
import { qaDisplay as wallQa } from './displays.ts';

describe('QA view model', () => {
  it('is the same model the wall screen paints', () => {
    const snapshot = buildScenario('qa-failure');
    expect(wallQa(snapshot)).toEqual(qaDisplay(snapshot));
  });

  it('focuses the newest open pull request, else the newest', () => {
    expect(focusPullRequest(buildScenario('qa-failure'))?.number).toBe(2);
    expect(focusPullRequest(buildScenario('feature-in-progress'))?.number).toBe(1);
  });

  it('reads each check from its latest run', () => {
    const rows = checkRows(buildScenario('review-and-qa-pass'), 'pr-2');
    expect(rows.map((r) => r.status)).toEqual(['passed', 'passed', 'passed']);
    expect(checkRows(buildScenario('qa-failure'), 'pr-2').find((r) => r.check === 'browser')?.status).toBe('failed');
  });

  it('has an icon and a word for every status', () => {
    expect(Object.values(CHECK_STATUS).map((s) => `${s.icon} ${s.text}`)).toEqual([
      '✓ Passed',
      '✕ Failed',
      '◐ Running',
      '… Queued',
      '– Not run',
    ]);
  });
});
