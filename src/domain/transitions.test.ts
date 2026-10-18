import { describe, expect, it } from 'vitest';
import { minimalSnapshot } from './fixtures/minimalSnapshot.ts';
import { checkMove, moveTask, nextColumns } from './transitions.ts';
import type { BlockableColumn, SessionState, Task, TaskColumn, WorkflowSnapshot } from './types.ts';

const TASK_ID = 'task-login';

/** The minimal snapshot with its one task placed in a given column. */
function withTask(column: TaskColumn, blockedFrom: BlockableColumn | null = null): WorkflowSnapshot {
  const s = minimalSnapshot();
  return { ...s, tasks: s.tasks.map((t) => ({ ...t, column, blockedFrom })) };
}

function withSessionState(s: WorkflowSnapshot, state: SessionState): WorkflowSnapshot {
  return { ...s, sessions: s.sessions.map((se) => ({ ...se, state })) };
}

function taskIn(s: WorkflowSnapshot): Task {
  const task = s.tasks.find((t) => t.id === TASK_ID);
  if (!task) throw new Error('fixture task missing');
  return task;
}

describe('moveTask: valid moves', () => {
  const forward: [TaskColumn, TaskColumn][] = [
    ['backlog', 'ready'],
    ['ready', 'in_progress'],
    ['in_progress', 'in_review'],
    ['in_review', 'qa'],
  ];

  it.each(forward)('%s -> %s', (from, to) => {
    const before = withTask(from);
    const result = moveTask(before, TASK_ID, to);

    expect(result.ok).toBe(true);
    expect(taskIn(result.snapshot)).toMatchObject({ column: to, blockedFrom: null });
    expect(result.snapshot.events.at(-1)).toMatchObject({
      type: 'task_moved',
      timestamp: before.clock.now,
      links: { taskId: TASK_ID, agentId: 'agent-ada', projectId: 'project-forgeville' },
    });
    expect(result.snapshot.events).toHaveLength(before.events.length + 1);
  });

  it.each<BlockableColumn>(['in_progress', 'in_review', 'qa'])('%s -> blocked records blockedFrom', (from) => {
    const result = moveTask(withTask(from), TASK_ID, 'blocked');

    expect(result.ok).toBe(true);
    expect(taskIn(result.snapshot)).toMatchObject({ column: 'blocked', blockedFrom: from });
    expect(result.snapshot.events.at(-1)?.type).toBe('task_blocked');
  });

  it.each<BlockableColumn>(['in_progress', 'in_review', 'qa'])('blocked -> %s returns and clears blockedFrom', (back) => {
    const result = moveTask(withTask('blocked', back), TASK_ID, back);

    expect(result.ok).toBe(true);
    expect(taskIn(result.snapshot)).toMatchObject({ column: back, blockedFrom: null });
  });

  it('does not mutate the input snapshot', () => {
    const before = withTask('ready');
    const copy = structuredClone(before);
    moveTask(before, TASK_ID, 'in_progress');
    expect(before).toEqual(copy);
  });
});

describe('moveTask: invalid moves', () => {
  const cases: [string, WorkflowSnapshot, TaskColumn, RegExp][] = [
    ['backlog to merged', withTask('backlog'), 'merged', /only be merged through its pull request/],
    ['qa to merged', withTask('qa'), 'merged', /only be merged through its pull request/],
    ['blocked to the wrong column', withTask('blocked', 'in_review'), 'in_progress', /back to In Review/],
    ['skipping a column', withTask('ready'), 'qa', /cannot move to QA/],
    ['moving backwards', withTask('in_review'), 'in_progress', /cannot move to In Progress/],
    ['backlog to blocked', withTask('backlog'), 'blocked', /cannot move to Blocked/],
    ['to the same column', withTask('ready'), 'ready', /already/],
    ['out of merged', withTask('merged'), 'qa', /already merged/],
  ];

  it.each(cases)('refuses %s', (_name, before, to, reason) => {
    const result = moveTask(before, TASK_ID, to);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toMatch(reason);
    expect(result.snapshot).toBe(before);
  });

  it('refuses an unknown task', () => {
    const before = withTask('ready');
    const result = moveTask(before, 'task-nope', 'in_progress');
    expect(result).toEqual({ ok: false, reason: 'Task task-nope does not exist.', snapshot: before });
  });

  it('refuses a task whose assignee session is interrupted', () => {
    const before = withSessionState(withTask('in_progress'), 'interrupted');
    const result = moveTask(before, TASK_ID, 'in_review');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("Ada's session is interrupted. Resume it or reassign FV-1 first.");
    expect(result.snapshot).toBe(before);
  });

  it('allows the same move once the session is no longer interrupted', () => {
    const before = withSessionState(withTask('in_progress'), 'paused');
    expect(moveTask(before, TASK_ID, 'in_review').ok).toBe(true);
  });
});

describe('nextColumns and checkMove', () => {
  it('lists forward moves and the blocked return', () => {
    expect(nextColumns(taskIn(withTask('backlog')))).toEqual(['ready']);
    expect(nextColumns(taskIn(withTask('in_progress')))).toEqual(['in_review', 'blocked']);
    expect(nextColumns(taskIn(withTask('qa')))).toEqual(['blocked']);
    expect(nextColumns(taskIn(withTask('blocked', 'qa')))).toEqual(['qa']);
    expect(nextColumns(taskIn(withTask('merged')))).toEqual([]);
  });

  it('agrees with moveTask for every column pair', () => {
    const columns: TaskColumn[] = ['backlog', 'ready', 'in_progress', 'in_review', 'qa', 'merged'];
    for (const from of columns) {
      const s = withTask(from);
      for (const to of [...columns, 'blocked' as const]) {
        const legal = nextColumns(taskIn(s)).includes(to);
        expect(checkMove(s, TASK_ID, to).ok, `${from} -> ${to}`).toBe(legal);
      }
    }
  });
});
