import { describe, expect, it } from 'vitest';
import { mergeReadySnapshot } from './fixtures/mergeReady.ts';
import { minimalSnapshot } from './fixtures/minimalSnapshot.ts';
import { missionControlMetrics } from './metrics.ts';
import { mergePullRequest } from './policy.ts';
import { failCheck } from './qa.ts';
import type { Agent, PullRequest, Task, TestRun, WorkflowEvent, WorkflowSnapshot } from './types.ts';

const T = (minute: number) => `2026-01-05T10:${String(minute).padStart(2, '0')}:00.000Z`;

function agent(id: string): Agent {
  return {
    id,
    projectId: 'project-shop',
    name: id,
    role: 'Developer',
    avatar: 'cat',
    runtimeLabel: 'Claude Code',
    modelLabel: 'Sonnet',
    mockUsage: null,
  };
}

function task(id: string, column: Task['column'], assigneeId: string | null): Task {
  return {
    id,
    projectId: 'project-shop',
    issueKey: id.toUpperCase(),
    title: id,
    description: '',
    column,
    blockedFrom: column === 'blocked' ? 'in_progress' : null,
    assigneeId,
    priority: 'medium',
    dependsOn: [],
    branch: null,
    pullRequestId: null,
  };
}

function pr(id: string, state: PullRequest['state'], reviewerId: string | null): PullRequest {
  return {
    id,
    projectId: 'project-shop',
    taskId: 't-review',
    number: 10,
    title: id,
    authorId: 'a-review',
    reviewerId,
    sourceBranch: id,
    baseBranch: 'main',
    state,
    openedAt: T(0),
    mergedAt: state === 'merged' ? T(1) : null,
  };
}

function run(id: string, check: TestRun['check'], status: TestRun['status']): TestRun {
  return {
    id,
    pullRequestId: 'pr-open',
    check,
    status,
    startedAt: T(2),
    finishedAt: status === 'passed' || status === 'failed' ? T(3) : null,
    summary: id,
    failureReason: status === 'failed' ? 'Simulated failure.' : null,
  };
}

function event(id: string, type: WorkflowEvent['type'], minute: number): WorkflowEvent {
  return { id, timestamp: T(minute), type, message: id, links: {} };
}

/** A busier company: two projects, five agents, mixed columns and checks. */
function busySnapshot(): WorkflowSnapshot {
  return {
    scenarioId: 'qa-failure',
    clock: { now: T(30) },
    projects: [
      { id: 'project-shop', name: 'Shop', description: 'A fictional shop.' },
      { id: 'project-blog', name: 'Blog', description: 'A fictional blog.' },
    ],
    agents: [agent('a-work'), agent('a-rev'), agent('a-idle'), agent('a-block'), agent('a-review')],
    tasks: [
      task('t-work', 'in_progress', 'a-work'),
      task('t-block', 'blocked', 'a-block'),
      task('t-review', 'in_review', 'a-review'),
      task('t-backlog-1', 'backlog', null),
      task('t-backlog-2', 'backlog', null),
      task('t-ready', 'ready', null),
      task('t-done-1', 'merged', null),
      task('t-done-2', 'merged', null),
    ],
    sessions: [
      {
        id: 's-work',
        agentId: 'a-work',
        taskId: 't-work',
        state: 'running',
        startedAt: T(0),
        lastActivityAt: T(5),
        transcript: [],
      },
    ],
    pullRequests: [pr('pr-open', 'open', 'a-rev'), pr('pr-merged-1', 'merged', null), pr('pr-merged-2', 'merged', null), pr('pr-closed', 'closed', null)],
    testRuns: [
      run('r1', 'unit', 'passed'),
      run('r2', 'build', 'passed'),
      run('r3', 'browser', 'failed'),
      run('r4', 'unit', 'running'),
      run('r5', 'build', 'queued'),
    ],
    reviewReports: [],
    events: [
      event('e-old-fail', 'check_failed', 1),
      event('e-moved', 'task_moved', 2),
      event('e-mid-fail', 'check_failed', 5),
      event('e-new-fail', 'check_failed', 9),
      event('e-blocked', 'task_blocked', 10),
    ],
  };
}

const ids = (events: readonly WorkflowEvent[]) => events.map((e) => e.id);

describe('missionControlMetrics', () => {
  it('counts the minimal fixture', () => {
    const m = missionControlMetrics(minimalSnapshot());
    expect(m).toEqual({
      totalProjects: 1,
      activeAgents: 1, // Rex reviewing; Ada awaiting review
      queuedTasks: 0,
      openPullRequests: 1,
      blockedTasks: 0,
      successfulMerges: 0,
      recentFailures: [],
      qaPassRate: 1, // one finished unit run, passed
    });
  });

  it('counts the busy fixture', () => {
    const m = missionControlMetrics(busySnapshot());
    expect(m.totalProjects).toBe(2);
    expect(m.activeAgents).toBe(2); // a-work working, a-rev reviewing
    expect(m.queuedTasks).toBe(3); // two backlog, one ready
    expect(m.openPullRequests).toBe(1); // merged and closed excluded
    expect(m.blockedTasks).toBe(1);
    expect(m.successfulMerges).toBe(2);
    expect(ids(m.recentFailures)).toEqual(['e-new-fail', 'e-mid-fail', 'e-old-fail']);
    expect(m.qaPassRate).toBeCloseTo(2 / 3); // running and queued runs not counted
  });

  it('limits recent failures, newest first', () => {
    expect(ids(missionControlMetrics(busySnapshot(), 2).recentFailures)).toEqual(['e-new-fail', 'e-mid-fail']);
    expect(missionControlMetrics(busySnapshot(), 0).recentFailures).toEqual([]);
  });

  it('orders failures by timestamp, not log order, and breaks ties by log order', () => {
    const s = busySnapshot();
    const shuffled: WorkflowSnapshot = {
      ...s,
      events: [event('late', 'check_failed', 20), event('early', 'check_failed', 1), event('tie-a', 'check_failed', 7), event('tie-b', 'check_failed', 7)],
    };
    expect(ids(missionControlMetrics(shuffled).recentFailures)).toEqual(['late', 'tie-b', 'tie-a', 'early']);
  });

  it('reports a null QA pass rate when no required check has finished', () => {
    const s = busySnapshot();
    const noneFinished: WorkflowSnapshot = { ...s, testRuns: s.testRuns.filter((r) => r.status === 'running' || r.status === 'queued') };
    expect(missionControlMetrics(noneFinished).qaPassRate).toBeNull();
    expect(missionControlMetrics({ ...s, testRuns: [] }).qaPassRate).toBeNull();
  });

  it('follows domain commands instead of stored counters', () => {
    const ready = mergeReadySnapshot();
    expect(missionControlMetrics(ready)).toMatchObject({ successfulMerges: 0, openPullRequests: 1, qaPassRate: 1 });

    const failed = failCheck(ready, 'run-login-browser', 'Button hidden.').snapshot;
    const afterFail = missionControlMetrics(failed);
    expect(afterFail.qaPassRate).toBeCloseTo(2 / 3);
    expect(afterFail.recentFailures).toHaveLength(1);
    expect(afterFail.activeAgents).toBe(2); // Ada working again, Rex reviewing

    const merged = mergePullRequest(ready, 'pr-login').snapshot;
    expect(missionControlMetrics(merged)).toMatchObject({ successfulMerges: 1, openPullRequests: 0, activeAgents: 0 });
  });

  it('does not mutate the snapshot', () => {
    const s = busySnapshot();
    const copy = structuredClone(s);
    missionControlMetrics(s, 1);
    expect(s).toEqual(copy);
  });
});
