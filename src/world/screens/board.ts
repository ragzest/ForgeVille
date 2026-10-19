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

/**
 * What an empty column says, in the board panel and the 2D view. Each line
 * names the column, so it still reads on its own to a screen reader.
 */
export const EMPTY_COLUMN_COPY: Readonly<Record<TaskColumn, string>> = {
  backlog: 'Backlog is clear. No ideas waiting.',
  ready: 'Nothing in Ready. No task is waiting to be picked up.',
  in_progress: 'Nothing in In Progress. No one is mid-task.',
  in_review: 'Nothing in In Review. No pull request needs eyes.',
  qa: 'Nothing in QA. The test bench is quiet.',
  blocked: 'Nothing in Blocked. Every agent can keep going.',
  merged: 'Nothing in Merged yet. The first merge lands here.',
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

export interface WallNote {
  readonly card: BoardCard;
  /** Outlined on the wall: the overlay's selected card. */
  readonly selected: boolean;
}

/** The notes the whiteboard paints for one column, with the selected one marked, and how many did not fit. */
export function wallNotes(column: BoardColumn, selected: TaskId | null): { notes: WallNote[]; more: number } {
  return {
    notes: column.cards.slice(0, WALL_NOTES).map((card) => ({ card, selected: card.taskId === selected })),
    more: Math.max(0, column.cards.length - WALL_NOTES),
  };
}
