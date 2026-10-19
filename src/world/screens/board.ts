import {
  COLUMN_LABELS,
  TASK_COLUMNS,
  type TaskColumn,
  type TaskId,
  type TaskPriority,
  type WorkflowSnapshot,
} from '../../domain/index.ts';
import { floorById, occupantOf, type FloorId } from '../building.ts';

/**
 * The Kanban board view model. The in-world whiteboard paints it and the board
 * overlay renders it, so the wall and the panel cannot disagree. Pure and free
 * of three.js, so panels can use it without loading the 3D bundle.
 */

/** Sticky-note colours per column: chip (header) and note (card). */
export const COLUMN_NOTE: Readonly<Record<TaskColumn, { chip: string; note: string }>> = {
  backlog: { chip: '#ffd166', note: '#fff3b0' },
  ready: { chip: '#80ed99', note: '#d8f9df' },
  in_progress: { chip: '#4cc9f0', note: '#cfeefd' },
  in_review: { chip: '#a99bff', note: '#e8e4ff' },
  qa: { chip: '#ff9f68', note: '#ffe3cf' },
  blocked: { chip: '#ff6b6b', note: '#ffd6d6' },
  merged: { chip: '#c77dff', note: '#eadcff' },
};

/** Notes the whiteboard has room for per column; the rest read "+N more". */
export const WALL_NOTES = 4;

export const PRIORITY_LABELS: Readonly<Record<TaskPriority, string>> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export interface BoardCard {
  readonly taskId: TaskId;
  readonly issueKey: string;
  readonly title: string;
  readonly assignee: string;
  readonly priority: TaskPriority;
  /** Status in words, e.g. "In Progress" or "Blocked (from QA)". */
  readonly status: string;
}

export interface BoardColumn {
  readonly column: TaskColumn;
  readonly label: string;
  readonly cards: readonly BoardCard[];
}

export function boardColumns(snapshot: WorkflowSnapshot): BoardColumn[] {
  const name = (id: string | null) => snapshot.agents.find((a) => a.id === id)?.name ?? 'Unassigned';
  return TASK_COLUMNS.map((column) => ({
    column,
    label: COLUMN_LABELS[column],
    cards: snapshot.tasks
      .filter((t) => t.column === column)
      .map((t) => ({
        taskId: t.id,
        issueKey: t.issueKey,
        title: t.title,
        assignee: name(t.assigneeId),
        priority: t.priority,
        status: t.blockedFrom ? `${COLUMN_LABELS[column]} (from ${COLUMN_LABELS[t.blockedFrom]})` : COLUMN_LABELS[column],
      })),
  }));
}

export interface FloorBoard {
  readonly heading: string;
  readonly columns: readonly BoardColumn[];
  /** False on a vacant floor: the board is empty and nobody works there. */
  readonly occupied: boolean;
}

/** The board on one floor: the occupying project's tasks, or an empty board on a vacant floor. */
export function floorBoard(snapshot: WorkflowSnapshot, floorId: FloorId): FloorBoard {
  const project = occupantOf(snapshot, floorId);
  if (!project) {
    return { heading: `${floorById(floorId).theme.name} · task board`, columns: boardColumns({ ...snapshot, tasks: [] }), occupied: false };
  }
  const tasks = snapshot.tasks.filter((t) => t.projectId === project.id);
  return { heading: `${project.name} · task board`, columns: boardColumns({ ...snapshot, tasks }), occupied: true };
}
