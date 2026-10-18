import { appendEvent } from './events.ts';
import { refuse, succeed, type CommandOutcome } from './result.ts';
import type { BlockableColumn, Task, TaskColumn, TaskId, WorkflowSnapshot } from './types.ts';

export const COLUMN_LABELS: Readonly<Record<TaskColumn, string>> = {
  backlog: 'Backlog',
  ready: 'Ready',
  in_progress: 'In Progress',
  in_review: 'In Review',
  qa: 'QA',
  blocked: 'Blocked',
  merged: 'Merged',
};

/**
 * Forward moves `moveTask` accepts, one column at a time. `blocked` returns
 * only to `blockedFrom`. `merged` is reached only through `mergePullRequest`;
 * backward moves happen only through review and QA commands.
 */
const FORWARD: Readonly<Record<TaskColumn, readonly TaskColumn[]>> = {
  backlog: ['ready'],
  ready: ['in_progress'],
  in_progress: ['in_review', 'blocked'],
  in_review: ['qa', 'blocked'],
  qa: ['blocked'],
  blocked: [],
  merged: [],
};

export function isBlockable(column: TaskColumn): column is BlockableColumn {
  return column === 'in_progress' || column === 'in_review' || column === 'qa';
}

/** Columns this task may move to with `moveTask`. Ignores session state. */
export function nextColumns(task: Task): readonly TaskColumn[] {
  if (task.column === 'blocked') {
    return task.blockedFrom ? [task.blockedFrom] : [];
  }
  return FORWARD[task.column];
}

type MoveCheck = { readonly ok: true; readonly task: Task } | { readonly ok: false; readonly reason: string };

/** Why a move is refused, or the task it would apply to. Does not change anything. */
export function checkMove(snapshot: WorkflowSnapshot, taskId: TaskId, to: TaskColumn): MoveCheck {
  const task = snapshot.tasks.find((t) => t.id === taskId);
  if (!task) {
    return { ok: false, reason: `Task ${taskId} does not exist.` };
  }
  const from = task.column;
  const label = `${task.issueKey} is ${COLUMN_LABELS[from]}`;

  if (from === to) {
    return { ok: false, reason: `${label} already.` };
  }
  if (to === 'merged') {
    return { ok: false, reason: `${task.issueKey} can only be merged through its pull request.` };
  }
  if (from === 'merged') {
    return { ok: false, reason: `${task.issueKey} is already merged.` };
  }
  if (from === 'blocked' && to !== task.blockedFrom) {
    const back = task.blockedFrom ? COLUMN_LABELS[task.blockedFrom] : 'its previous column';
    return { ok: false, reason: `${task.issueKey} can only leave Blocked back to ${back}.` };
  }
  if (from !== 'blocked' && !FORWARD[from].includes(to)) {
    return { ok: false, reason: `${label}; it cannot move to ${COLUMN_LABELS[to]}.` };
  }

  const interrupted = snapshot.sessions.find(
    (s) => s.agentId === task.assigneeId && s.state === 'interrupted',
  );
  if (interrupted) {
    const name = snapshot.agents.find((a) => a.id === task.assigneeId)?.name ?? 'The assignee';
    return {
      ok: false,
      reason: `${name}'s session is interrupted. Resume it or reassign ${task.issueKey} first.`,
    };
  }

  return { ok: true, task };
}

/** Applies a legal move. Illegal moves return the input snapshot unchanged with a reason. */
export function moveTask(snapshot: WorkflowSnapshot, taskId: TaskId, to: TaskColumn): CommandOutcome {
  const check = checkMove(snapshot, taskId, to);
  if (!check.ok) {
    return refuse(snapshot, check.reason);
  }
  const { task } = check;
  const from = task.column;

  const blockedFrom: BlockableColumn | null = to === 'blocked' && isBlockable(from) ? from : null;
  const moved: Task = { ...task, column: to, blockedFrom };
  const withTask: WorkflowSnapshot = {
    ...snapshot,
    tasks: snapshot.tasks.map((t) => (t.id === task.id ? moved : t)),
  };

  const links = {
    projectId: task.projectId,
    taskId: task.id,
    ...(task.assigneeId ? { agentId: task.assigneeId } : {}),
  };
  const next =
    to === 'blocked'
      ? appendEvent(withTask, 'task_blocked', `${task.issueKey} is blocked in ${COLUMN_LABELS[from]}.`, links)
      : appendEvent(
          withTask,
          'task_moved',
          `${task.issueKey} moved from ${COLUMN_LABELS[from]} to ${COLUMN_LABELS[to]}.`,
          links,
        );

  return succeed(next);
}
