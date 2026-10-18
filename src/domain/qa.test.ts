import { describe, expect, it } from 'vitest';
import { mergeReadySnapshot } from './fixtures/mergeReady.ts';
import { mergeEligibilityFor, mergePullRequest } from './policy.ts';
import { presenceOf } from './presence.ts';
import { failCheck } from './qa.ts';
import type { WorkflowSnapshot } from './types.ts';

const REASON = 'Login button is hidden on narrow screens.';

describe('failCheck (QA failure)', () => {
  it('fails the check, returns the task to its author, and records a failure event', () => {
    const before: WorkflowSnapshot = {
      ...mergeReadySnapshot(),
      tasks: mergeReadySnapshot().tasks.map((t) => ({ ...t, assigneeId: 'agent-rex' })),
    };

    const result = failCheck(before, 'run-login-browser', REASON);

    expect(result.ok).toBe(true);
    const run = result.snapshot.testRuns.find((r) => r.id === 'run-login-browser');
    expect(run).toMatchObject({ status: 'failed', failureReason: REASON, finishedAt: before.clock.now });

    expect(result.snapshot.tasks[0]).toMatchObject({ column: 'in_progress', assigneeId: 'agent-ada', blockedFrom: null });

    expect(result.snapshot.events.at(-1)).toMatchObject({
      type: 'check_failed',
      timestamp: before.clock.now,
      links: { testRunId: 'run-login-browser', pullRequestId: 'pr-login', taskId: 'task-login', agentId: 'agent-ada' },
    });
    expect(result.snapshot.events.at(-1)?.message).toContain(REASON);
  });

  it('blocks the merge and shows the failed check as the reason', () => {
    const failed = failCheck(mergeReadySnapshot(), 'run-login-browser', REASON).snapshot;

    const merge = mergePullRequest(failed, 'pr-login');
    expect(merge.ok).toBe(false);
    if (merge.ok) return;
    expect(merge.reason).toContain(`Browser tests failed: ${REASON}`);
  });

  it('leaves the author back at work', () => {
    const failed = failCheck(mergeReadySnapshot(), 'run-login-unit', 'Assertion failed.').snapshot;
    // The session in the fixture is running, so the author is working again.
    expect(presenceOf(failed, 'agent-ada')).toBe('working');
    expect(mergeEligibilityFor(failed, 'pr-login').eligible).toBe(false);
  });

  it('refuses an unknown run, a merged pull request, and a task not under test', () => {
    const base = mergeReadySnapshot();
    expect(failCheck(base, 'run-nope', REASON)).toEqual({
      ok: false,
      reason: 'Test run run-nope does not exist.',
      snapshot: base,
    });

    const merged = mergePullRequest(base, 'pr-login').snapshot;
    expect(failCheck(merged, 'run-login-unit', REASON)).toMatchObject({ ok: false, reason: 'Pull request #1 is merged.' });

    const backlog = { ...base, tasks: base.tasks.map((t) => ({ ...t, column: 'backlog' as const })) };
    expect(failCheck(backlog, 'run-login-unit', REASON)).toMatchObject({ ok: false, reason: 'FV-1 is not under test.' });
  });
});
