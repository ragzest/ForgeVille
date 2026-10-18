import { describe, expect, expectTypeOf, it } from 'vitest';
import type { CommandResult, WorkflowPort } from '../services/ports.ts';
import { minimalSnapshot } from './fixtures/minimalSnapshot.ts';
import {
  REQUIRED_CHECKS,
  SCENARIO_IDS,
  TASK_COLUMNS,
  type Agent,
  type EventLinks,
  type ScenarioId,
  type TaskColumn,
  type TranscriptLine,
  type WorkflowSnapshot,
} from './index.ts';

/** Every id the snapshot refers to must exist in it. */
function danglingReferences(s: WorkflowSnapshot): string[] {
  const ids = (items: readonly { id: string }[]) => new Set(items.map((item) => item.id));
  const projects = ids(s.projects);
  const agents = ids(s.agents);
  const tasks = ids(s.tasks);
  const sessions = ids(s.sessions);
  const pullRequests = ids(s.pullRequests);
  const testRuns = ids(s.testRuns);

  const problems: string[] = [];
  const need = (set: Set<string>, id: string | null | undefined, where: string) => {
    if (id != null && !set.has(id)) problems.push(`${where} -> ${id}`);
  };

  for (const a of s.agents) need(projects, a.projectId, `agent ${a.id}.projectId`);
  for (const t of s.tasks) {
    need(projects, t.projectId, `task ${t.id}.projectId`);
    need(agents, t.assigneeId, `task ${t.id}.assigneeId`);
    need(pullRequests, t.pullRequestId, `task ${t.id}.pullRequestId`);
    for (const dep of t.dependsOn) need(tasks, dep, `task ${t.id}.dependsOn`);
  }
  for (const se of s.sessions) {
    need(agents, se.agentId, `session ${se.id}.agentId`);
    need(tasks, se.taskId, `session ${se.id}.taskId`);
  }
  for (const pr of s.pullRequests) {
    need(projects, pr.projectId, `pr ${pr.id}.projectId`);
    need(tasks, pr.taskId, `pr ${pr.id}.taskId`);
    need(agents, pr.authorId, `pr ${pr.id}.authorId`);
    need(agents, pr.reviewerId, `pr ${pr.id}.reviewerId`);
  }
  for (const run of s.testRuns) need(pullRequests, run.pullRequestId, `run ${run.id}.pullRequestId`);
  for (const r of s.reviewReports) {
    need(pullRequests, r.pullRequestId, `review ${r.id}.pullRequestId`);
    need(agents, r.reviewerId, `review ${r.id}.reviewerId`);
  }
  for (const e of s.events) {
    const where = `event ${e.id}.links`;
    need(projects, e.links.projectId, where);
    need(agents, e.links.agentId, where);
    need(tasks, e.links.taskId, where);
    need(sessions, e.links.sessionId, where);
    need(pullRequests, e.links.pullRequestId, where);
    need(testRuns, e.links.testRunId, where);
  }
  return problems;
}

describe('minimal snapshot fixture', () => {
  it('contains every entity type', () => {
    const s = minimalSnapshot();
    expect(s.projects).not.toHaveLength(0);
    expect(s.agents).not.toHaveLength(0);
    expect(s.tasks).not.toHaveLength(0);
    expect(s.sessions).not.toHaveLength(0);
    expect(s.pullRequests).not.toHaveLength(0);
    expect(s.testRuns).not.toHaveLength(0);
    expect(s.reviewReports).not.toHaveLength(0);
    expect(s.events).not.toHaveLength(0);
  });

  it('has no dangling id references', () => {
    expect(danglingReferences(minimalSnapshot())).toEqual([]);
  });

  it('catches a dangling reference', () => {
    const s = minimalSnapshot();
    const broken: WorkflowSnapshot = {
      ...s,
      tasks: s.tasks.map((t) => ({ ...t, assigneeId: 'agent-missing' })),
    };
    expect(danglingReferences(broken)).toEqual(['task task-login.assigneeId -> agent-missing']);
  });

  it('uses valid ISO timestamps', () => {
    const s = minimalSnapshot();
    const stamps = [
      s.clock.now,
      ...s.sessions.flatMap((se) => [se.startedAt, se.lastActivityAt, ...se.transcript.map((l) => l.timestamp)]),
      ...s.events.map((e) => e.timestamp),
    ];
    for (const stamp of stamps) {
      expect(new Date(stamp).toISOString()).toBe(stamp);
    }
  });

  it('returns a fresh copy each call', () => {
    expect(minimalSnapshot()).toEqual(minimalSnapshot());
    expect(minimalSnapshot()).not.toBe(minimalSnapshot());
  });
});

describe('domain type contracts', () => {
  it('has exactly the seven task columns, in board order', () => {
    expect(TASK_COLUMNS).toEqual(['backlog', 'ready', 'in_progress', 'in_review', 'qa', 'blocked', 'merged']);
    expectTypeOf<(typeof TASK_COLUMNS)[number]>().toEqualTypeOf<TaskColumn>();
  });

  it('lists the five scenarios and three required checks', () => {
    expect(SCENARIO_IDS).toHaveLength(5);
    expectTypeOf<(typeof SCENARIO_IDS)[number]>().toEqualTypeOf<ScenarioId>();
    expect(REQUIRED_CHECKS).toEqual(['unit', 'build', 'browser']);
  });

  it('keeps runtime and model as plain labels', () => {
    expectTypeOf<Agent['runtimeLabel']>().toEqualTypeOf<string>();
    expectTypeOf<Agent['modelLabel']>().toEqualTypeOf<string>();
  });

  it('limits transcript streams to stdout and system', () => {
    expectTypeOf<TranscriptLine['stream']>().toEqualTypeOf<'stdout' | 'system'>();
    // @ts-expect-error -- stderr is not a transcript stream
    const bad: TranscriptLine = { timestamp: '2026-01-05T10:00:00.000Z', stream: 'stderr', text: 'x' };
    expect(bad).toBeDefined();
  });

  it('gives events id, timestamp, type, message, and links', () => {
    const [event] = minimalSnapshot().events;
    expect(Object.keys(event ?? {}).sort()).toEqual(['id', 'links', 'message', 'timestamp', 'type']);
    expectTypeOf<EventLinks>().toHaveProperty('pullRequestId');
  });

  it('narrows CommandResult on ok', () => {
    const snapshot = minimalSnapshot();
    const results: CommandResult[] = [
      { ok: true, snapshot },
      { ok: false, reason: 'Not allowed.', snapshot },
    ];
    const reasons = results.flatMap((r) => (r.ok ? [] : [r.reason]));
    expect(reasons).toEqual(['Not allowed.']);
    expectTypeOf<Extract<CommandResult, { ok: false }>['reason']>().toEqualTypeOf<string>();
  });

  it('matches the WorkflowPort shape from architecture.md', () => {
    expectTypeOf<WorkflowPort['moveTask']>().parameters.toEqualTypeOf<[taskId: string, to: TaskColumn]>();
    expectTypeOf<WorkflowPort['loadScenario']>().returns.toEqualTypeOf<WorkflowSnapshot>();
    expectTypeOf<WorkflowPort['requestChanges']>().parameters.toEqualTypeOf<
      [pullRequestId: string, findingId?: string | undefined]
    >();
    expectTypeOf<WorkflowPort['mergePullRequest']>().returns.toEqualTypeOf<CommandResult>();
  });
});
