import { describe, expect, it } from 'vitest';
import { COLUMN_LABELS, TASK_COLUMNS } from '../../domain/index.ts';
import { minimalSnapshot } from '../../domain/fixtures/minimalSnapshot.ts';
import { buildScenario } from '../../services/mock/scenarios.ts';
import { COLUMN_NOTE, EMPTY_COLUMN_COPY, boardColumns, floorBoard, wallNotes } from './board.ts';
import { boardColumns as wallColumns } from './displays.ts';

describe('board view model', () => {
  it('has the seven domain columns in order, each with note colours', () => {
    const columns = boardColumns(minimalSnapshot());
    expect(columns.map((c) => c.label)).toEqual(['Backlog', 'Ready', 'In Progress', 'In Review', 'QA', 'Blocked', 'Merged']);
    expect(columns.map((c) => c.column)).toEqual([...TASK_COLUMNS]);
    for (const c of columns) expect(COLUMN_NOTE[c.column].note).toMatch(/^#/);
  });

  it('gives each card issue id, title, assignee, priority, and status', () => {
    const card = boardColumns(minimalSnapshot()).find((c) => c.column === 'in_review')?.cards[0];
    expect(card).toEqual({
      taskId: 'task-login',
      issueKey: 'FV-1',
      title: 'Add login screen',
      assignee: 'Ada',
      priority: 'high',
      status: 'In Review',
    });
  });

  it('says where a blocked card came from, and names unassigned cards', () => {
    const blocked = boardColumns(buildScenario('agent-blocked'))
      .find((c) => c.column === 'blocked')
      ?.cards.find((c) => c.issueKey === 'LN-4');
    expect(blocked?.status).toBe('Blocked (from In Progress)');

    const base = minimalSnapshot();
    const unassigned = boardColumns({ ...base, tasks: base.tasks.map((t) => ({ ...t, assigneeId: null })) });
    expect(unassigned.find((c) => c.column === 'in_review')?.cards[0]?.assignee).toBe('Unassigned');
  });

  it('is the same model the whiteboard paints', () => {
    const snapshot = buildScenario('feature-in-progress');
    expect(wallColumns(snapshot)).toEqual(boardColumns(snapshot));
  });

  it('shows the occupying project on its floor and an empty board on a vacant one', () => {
    const snapshot = buildScenario('feature-in-progress');
    const home = floorBoard(snapshot, 'workshop');
    expect(home.occupied).toBe(true);
    expect(home.heading).toBe('Lantern · task board');
    expect(home.columns.flatMap((c) => c.cards)).toHaveLength(snapshot.tasks.filter((t) => t.projectId === 'project-lantern').length);

    const upstairs = floorBoard(snapshot, 'greenhouse');
    expect(upstairs.heading).toBe('Sprout · task board');
    expect(upstairs.columns.flatMap((c) => c.cards.map((card) => card.issueKey)).sort()).toEqual(['SP-1', 'SP-2', 'SP-3', 'SP-4']);

    const vacant = floorBoard(snapshot, 'ember-forge');
    expect(vacant.occupied).toBe(false);
    expect(vacant.columns.flatMap((c) => c.cards)).toHaveLength(0);
  });
});

describe('whiteboard notes', () => {
  it('marks the selected card and counts the notes that do not fit', () => {
    const base = minimalSnapshot();
    const first = base.tasks[0];
    if (!first) throw new Error('fixture has a task');
    const many = Array.from({ length: 6 }, (_, i) => ({ ...first, id: `t${String(i)}`, issueKey: `FV-${String(i)}` }));
    const col = boardColumns({ ...base, tasks: many }).find((c) => c.column === 'in_review');
    if (!col) throw new Error('no column');
    const { notes, more } = wallNotes(col, 't2');
    expect(notes).toHaveLength(4);
    expect(more).toBe(2);
    expect(notes.filter((n) => n.selected).map((n) => n.card.taskId)).toEqual(['t2']);
    expect(wallNotes(col, null).notes.some((n) => n.selected)).toBe(false);
  });
});

describe('empty column copy', () => {
  it('names its column, so it reads on its own', () => {
    for (const column of TASK_COLUMNS) {
      expect(EMPTY_COLUMN_COPY[column], column).toContain(COLUMN_LABELS[column]);
    }
  });
});
