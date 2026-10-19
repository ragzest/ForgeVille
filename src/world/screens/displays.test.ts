import { describe, expect, it } from 'vitest';
import { TASK_COLUMNS, missionControlMetrics } from '../../domain/index.ts';
import { buildScenario } from '../../services/mock/scenarios.ts';
import { boardColumns, qaDisplay, statusTiles } from './displays.ts';

describe('in-world displays', () => {
  it('puts every task on the whiteboard in its column, in domain order', () => {
    const snapshot = buildScenario('agent-blocked');
    const columns = boardColumns(snapshot);
    expect(columns.map((c) => c.column)).toEqual([...TASK_COLUMNS]);
    expect(columns.reduce((n, c) => n + c.cards.length, 0)).toBe(snapshot.tasks.length);
    expect(columns.find((c) => c.column === 'blocked')?.cards.map((c) => c.issueKey)).toContain('LN-4');
  });

  it('shows the failed browser check on the QA screen in the failing scenario', () => {
    const qa = qaDisplay(buildScenario('qa-failure'));
    expect(qa.heading).toMatch(/^PR #2/);
    expect(qa.rows.find((r) => r.check === 'browser')?.status).toBe('failed');
  });

  it('shows passing checks when review and QA pass', () => {
    const qa = qaDisplay(buildScenario('review-and-qa-pass'));
    expect(qa.rows.every((r) => r.status === 'passed')).toBe(true);
  });

  it('reads status numbers from the metrics function', () => {
    const snapshot = buildScenario('agent-blocked');
    const m = missionControlMetrics(snapshot);
    const tiles = Object.fromEntries(statusTiles(snapshot).map((t) => [t.label, t]));
    expect(tiles['Active agents']?.value).toBe(String(m.activeAgents));
    expect(tiles.Blocked?.value).toBe(String(m.blockedTasks));
    expect(tiles.Blocked?.tone).toBe('danger');
  });
});
