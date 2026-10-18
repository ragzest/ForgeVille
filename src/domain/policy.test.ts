import { describe, expect, it } from 'vitest';
import { mergeReadySnapshot } from './fixtures/mergeReady.ts';
import { minimalSnapshot } from './fixtures/minimalSnapshot.ts';
import { checkMove } from './transitions.ts';
import { latestRun, mergeEligibilityFor, mergePullRequest, requestChanges } from './policy.ts';
import type { ReviewFinding, TestRun, WorkflowSnapshot } from './types.ts';

const PR = 'pr-login';

function only<T>(items: readonly T[]): T {
  const [item] = items;
  if (items.length !== 1 || item === undefined) throw new Error(`expected one item, got ${String(items.length)}`);
  return item;
}

function editRun(s: WorkflowSnapshot, check: TestRun['check'], patch: Partial<TestRun>): WorkflowSnapshot {
  return { ...s, testRuns: s.testRuns.map((r) => (r.check === check ? { ...r, ...patch } : r)) };
}

function addFinding(s: WorkflowSnapshot, finding: ReviewFinding): WorkflowSnapshot {
  return { ...s, reviewReports: s.reviewReports.map((r) => ({ ...r, findings: [...r.findings, finding] })) };
}

function expectRefused(before: WorkflowSnapshot, pattern: RegExp) {
  const result = mergePullRequest(before, PR);
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.reason).toMatch(pattern);
  expect(result.snapshot).toBe(before);
  expect(only(result.snapshot.pullRequests).state).toBe('open');
  expect(only(result.snapshot.tasks).column).not.toBe('merged');
}

describe('mergePullRequest', () => {
  it('merges an eligible pull request', () => {
    const before = mergeReadySnapshot();
    expect(mergeEligibilityFor(before, PR)).toEqual({ eligible: true });

    const result = mergePullRequest(before, PR);

    expect(result.ok).toBe(true);
    expect(only(result.snapshot.pullRequests)).toMatchObject({ state: 'merged', mergedAt: before.clock.now });
    expect(only(result.snapshot.tasks)).toMatchObject({ column: 'merged', blockedFrom: null });
    expect(result.snapshot.events.at(-1)).toMatchObject({
      type: 'pull_request_merged',
      timestamp: before.clock.now,
      links: { pullRequestId: PR, taskId: 'task-login', agentId: 'agent-ada' },
    });
  });

  it('refuses without approval', () => {
    const before: WorkflowSnapshot = {
      ...mergeReadySnapshot(),
      reviewReports: mergeReadySnapshot().reviewReports.map((r) => ({ ...r, status: 'pending' })),
    };
    expectRefused(before, /Review is still pending/);
  });

  it('refuses when there is no review at all', () => {
    expectRefused({ ...mergeReadySnapshot(), reviewReports: [] }, /No review has been recorded/);
  });

  it('refuses when the unit tests failed, quoting the reason', () => {
    const before = editRun(mergeReadySnapshot(), 'unit', { status: 'failed', failureReason: 'login.test.ts: 2 failing' });
    expectRefused(before, /Unit tests failed: login\.test\.ts: 2 failing/);
  });

  it('refuses when a required check has not run or is still running', () => {
    const missing = { ...mergeReadySnapshot(), testRuns: mergeReadySnapshot().testRuns.filter((r) => r.check !== 'browser') };
    expectRefused(missing, /Browser tests: not run yet/);
    expectRefused(editRun(mergeReadySnapshot(), 'build', { status: 'running' }), /Build: still running/);
  });

  it('refuses with an unresolved blocking finding', () => {
    const before = addFinding(mergeReadySnapshot(), {
      id: 'finding-x',
      severity: 'blocking',
      message: 'Password is logged.',
      resolved: false,
    });
    expectRefused(before, /Unresolved blocking finding: Password is logged\./);
  });

  it('allows a resolved blocking finding', () => {
    const before = addFinding(mergeReadySnapshot(), {
      id: 'finding-x',
      severity: 'blocking',
      message: 'Password is logged.',
      resolved: true,
    });
    expect(mergePullRequest(before, PR).ok).toBe(true);
  });

  it('refuses an already merged pull request', () => {
    const first = mergePullRequest(mergeReadySnapshot(), PR);
    expect(first.ok).toBe(true);

    const second = mergePullRequest(first.snapshot, PR);
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.reason).toMatch(/already merged/);
    expect(second.snapshot).toBe(first.snapshot);
  });

  it('refuses a closed pull request and a task outside QA', () => {
    const closed = { ...mergeReadySnapshot(), pullRequests: mergeReadySnapshot().pullRequests.map((pr) => ({ ...pr, state: 'closed' as const })) };
    expect(mergePullRequest(closed, PR)).toMatchObject({ ok: false, reason: expect.stringMatching(/is closed/) as unknown });

    const inReview = { ...mergeReadySnapshot(), tasks: mergeReadySnapshot().tasks.map((t) => ({ ...t, column: 'in_review' as const })) };
    expectRefused(inReview, /FV-1 must be in QA to merge/);
  });

  it('lists every failed reason at once', () => {
    const eligibility = mergeEligibilityFor(minimalSnapshot(), PR);
    expect(eligibility).toEqual({
      eligible: false,
      reasons: [
        'FV-1 must be in QA to merge.',
        'Review is still pending.',
        'Build: not run yet.',
        'Browser tests: not run yet.',
      ],
    });
  });

  it('refuses an unknown pull request', () => {
    const before = mergeReadySnapshot();
    expect(mergePullRequest(before, 'pr-nope')).toEqual({
      ok: false,
      reason: 'Pull request pr-nope does not exist.',
      snapshot: before,
    });
  });

  it('is still the only route to merged: moveTask refuses it', () => {
    expect(checkMove(mergeReadySnapshot(), 'task-login', 'merged').ok).toBe(false);
  });
});

describe('latestRun', () => {
  it('uses the most recent run of a check', () => {
    const s = mergeReadySnapshot();
    const rerun: TestRun = { ...only(s.testRuns.filter((r) => r.check === 'unit')), id: 'rerun', startedAt: '2026-01-05T09:50:00.000Z', status: 'failed', failureReason: 'flaky' };
    expect(latestRun([...s.testRuns, rerun], 'unit')?.id).toBe('rerun');
    expect(mergeEligibilityFor({ ...s, testRuns: [...s.testRuns, rerun] }, PR).eligible).toBe(false);
  });
});

describe('requestChanges', () => {
  it('adds a blocking finding, sets changes requested, and returns a QA task to the author', () => {
    const before: WorkflowSnapshot = {
      ...mergeReadySnapshot(),
      tasks: mergeReadySnapshot().tasks.map((t) => ({ ...t, assigneeId: 'agent-rex' })),
    };
    const result = requestChanges(before, PR);

    expect(result.ok).toBe(true);
    const review = only(result.snapshot.reviewReports);
    expect(review.status).toBe('changes_requested');
    expect(review.updatedAt).toBe(before.clock.now);
    expect(review.findings.at(-1)).toMatchObject({ severity: 'blocking', resolved: false });
    expect(only(result.snapshot.tasks)).toMatchObject({ column: 'in_progress', assigneeId: 'agent-ada' });
    expect(result.snapshot.events.at(-1)).toMatchObject({ type: 'changes_requested', links: { pullRequestId: PR } });
    expect(mergeEligibilityFor(result.snapshot, PR).eligible).toBe(false);
  });

  it('escalates an existing finding by id', () => {
    const result = requestChanges(mergeReadySnapshot(), PR, 'finding-login-1');

    expect(result.ok).toBe(true);
    const review = only(result.snapshot.reviewReports);
    expect(review.findings).toEqual([
      { id: 'finding-login-1', severity: 'blocking', message: 'Rename the submit handler.', resolved: false },
    ]);
  });

  it('moves a task in review back to in progress', () => {
    const result = requestChanges(minimalSnapshot(), PR);
    expect(only(result.snapshot.tasks).column).toBe('in_progress');
  });

  it('leaves the column alone when the task is not in review or QA', () => {
    const before = { ...minimalSnapshot(), tasks: minimalSnapshot().tasks.map((t) => ({ ...t, column: 'in_progress' as const })) };
    const result = requestChanges(before, PR);
    expect(result.ok).toBe(true);
    expect(only(result.snapshot.tasks).column).toBe('in_progress');
  });

  it('refuses an unknown finding, a merged pull request, or a missing review', () => {
    const base = mergeReadySnapshot();
    expect(requestChanges(base, PR, 'finding-nope')).toMatchObject({ ok: false, snapshot: base });

    const merged = mergePullRequest(base, PR).snapshot;
    expect(requestChanges(merged, PR)).toMatchObject({ ok: false, reason: 'Pull request #1 is merged.' });

    const noReview = { ...base, reviewReports: [] };
    expect(requestChanges(noReview, PR)).toMatchObject({ ok: false, reason: 'Pull request #1 has no review to update.' });
  });
});
