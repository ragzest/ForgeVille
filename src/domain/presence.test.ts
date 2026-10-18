import { describe, expect, it } from 'vitest';
import { minimalSnapshot } from './fixtures/minimalSnapshot.ts';
import { agentPresence, CELEBRATION_MS, isCelebrating, presenceInputFor, presenceOf } from './presence.ts';
import type { AgentSession, SessionState, Task, TaskColumn, WorkflowSnapshot } from './types.ts';

const base = minimalSnapshot();
const fixtureTask = base.tasks[0];
const fixtureSession = base.sessions[0];
if (!fixtureTask || !fixtureSession) throw new Error('fixture incomplete');

const task = (column: TaskColumn): Task => ({ ...fixtureTask, column });
const session = (state: SessionState): AgentSession => ({ ...fixtureSession, state });

describe('agentPresence', () => {
  it('is working with a running session on an in-progress task', () => {
    expect(agentPresence({ session: session('running'), task: task('in_progress'), isActiveReviewer: false })).toBe(
      'working',
    );
  });

  it.each<SessionState>(['paused', 'interrupted', 'completed'])('is idle when the session is %s', (state) => {
    expect(agentPresence({ session: session(state), task: task('in_progress'), isActiveReviewer: false })).toBe(
      'idle',
    );
  });

  it('is idle with no session or no task', () => {
    expect(agentPresence({ session: null, task: task('in_progress'), isActiveReviewer: false })).toBe('idle');
    expect(agentPresence({ session: session('running'), task: null, isActiveReviewer: false })).toBe('idle');
    expect(agentPresence({ session: session('running'), task: task('ready'), isActiveReviewer: false })).toBe('idle');
  });

  it('is blocked when the assigned task is blocked, with or without a session', () => {
    expect(agentPresence({ session: session('running'), task: task('blocked'), isActiveReviewer: false })).toBe(
      'blocked',
    );
    expect(agentPresence({ session: null, task: task('blocked'), isActiveReviewer: false })).toBe('blocked');
  });

  it.each<TaskColumn>(['in_review', 'qa'])('is awaiting_review when the task is %s', (column) => {
    expect(agentPresence({ session: session('running'), task: task(column), isActiveReviewer: false })).toBe(
      'awaiting_review',
    );
  });

  it('is reviewing when the agent is the active reviewer, ahead of its own task state', () => {
    expect(agentPresence({ session: null, task: null, isActiveReviewer: true })).toBe('reviewing');
    expect(agentPresence({ session: session('running'), task: task('blocked'), isActiveReviewer: true })).toBe(
      'reviewing',
    );
  });
});

describe('presenceOf a snapshot', () => {
  it('reads author and reviewer from the fixture', () => {
    // Ada's task is in review; Rex reviews the open pull request.
    expect(presenceOf(base, 'agent-ada')).toBe('awaiting_review');
    expect(presenceOf(base, 'agent-rex')).toBe('reviewing');
  });

  it('stops reviewing once the pull request is no longer open', () => {
    const merged: WorkflowSnapshot = {
      ...base,
      pullRequests: base.pullRequests.map((pr) => ({ ...pr, state: 'merged' })),
    };
    expect(presenceOf(merged, 'agent-rex')).toBe('idle');
  });

  it('ignores merged tasks when picking the assigned task', () => {
    const done: WorkflowSnapshot = { ...base, tasks: base.tasks.map((t) => ({ ...t, column: 'merged' })) };
    expect(presenceInputFor(done, 'agent-ada').task).toBeNull();
    expect(presenceOf(done, 'agent-ada')).toBe('idle');
  });

  it('is idle for an agent with nothing assigned', () => {
    expect(presenceOf(base, 'agent-unknown')).toBe('idle');
  });
});

describe('isCelebrating', () => {
  const mergedAt = '2026-01-05T10:00:00.000Z';
  const withMerge: WorkflowSnapshot = {
    ...base,
    clock: { now: mergedAt },
    events: [
      ...base.events,
      {
        id: 'event-merge',
        timestamp: mergedAt,
        type: 'pull_request_merged',
        message: 'Merged #1.',
        links: { agentId: 'agent-ada', pullRequestId: 'pr-login' },
      },
    ],
  };
  const later = (ms: number) => new Date(Date.parse(mergedAt) + ms).toISOString();

  it('is true right after a merge for the named agent only', () => {
    expect(isCelebrating(withMerge, 'agent-ada')).toBe(true);
    expect(isCelebrating(withMerge, 'agent-rex')).toBe(false);
  });

  it('expires on the scenario clock', () => {
    expect(isCelebrating(withMerge, 'agent-ada', later(CELEBRATION_MS - 1))).toBe(true);
    expect(isCelebrating(withMerge, 'agent-ada', later(CELEBRATION_MS))).toBe(false);
  });

  it('is false without a merge event and does not change presence', () => {
    expect(isCelebrating(base, 'agent-ada')).toBe(false);
    expect(presenceOf(withMerge, 'agent-ada')).toBe(presenceOf(base, 'agent-ada'));
  });
});
