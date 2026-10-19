import { COLUMN_LABELS, TASK_COLUMNS, checkMove, type TaskColumn, type TaskId, type WorkflowSnapshot } from '../../domain/index.ts';

export interface MoveOption {
  readonly to: TaskColumn;
  readonly label: string;
  readonly legal: boolean;
  /** The domain's reason when the move is refused; empty when legal. */
  readonly reason: string;
}

/**
 * Every column a task could be asked to move to, split by the domain's own
 * `checkMove`. The UI never decides legality itself; the port still applies
 * (or refuses) the move.
 */
export function moveOptions(snapshot: WorkflowSnapshot, taskId: TaskId): MoveOption[] {
  const task = snapshot.tasks.find((t) => t.id === taskId);
  if (!task) return [];
  return TASK_COLUMNS.filter((to) => to !== task.column).map((to) => {
    const check = checkMove(snapshot, taskId, to);
    return { to, label: COLUMN_LABELS[to], legal: check.ok, reason: check.ok ? '' : check.reason };
  });
}
