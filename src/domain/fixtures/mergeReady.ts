import type { TestRun, WorkflowSnapshot } from '../types.ts';
import { minimalSnapshot } from './minimalSnapshot.ts';

const run = (check: TestRun['check'], minute: number): TestRun => ({
  id: `run-login-${check}`,
  pullRequestId: 'pr-login',
  check,
  status: 'passed',
  startedAt: `2026-01-05T09:${String(minute)}:00.000Z`,
  finishedAt: `2026-01-05T09:${String(minute + 1)}:00.000Z`,
  summary: `Simulated ${check} check passed.`,
  failureReason: null,
});

/**
 * Minimal snapshot whose pull request passes the merge policy: task in QA,
 * review approved, all required checks passed, only a non-blocking finding.
 */
export function mergeReadySnapshot(): WorkflowSnapshot {
  const s = minimalSnapshot();
  return {
    ...s,
    tasks: s.tasks.map((t) => ({ ...t, column: 'qa' })),
    testRuns: [run('unit', 40), run('build', 42), run('browser', 44)],
    reviewReports: s.reviewReports.map((r) => ({ ...r, status: 'approved' })),
  };
}
