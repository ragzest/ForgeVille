import { describe, expect, it } from 'vitest';
import { TASK_COLUMNS } from '../../domain/index.ts';
import { minimalSnapshot } from '../../domain/fixtures/minimalSnapshot.ts';
import { buildScenario } from '../../services/mock/scenarios.ts';
import { COLUMN_NOTE, boardColumns, floorBoard } from './board.ts';
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
    expect(home.columns.flatMap((c) => c.cards)).toHaveLength(snapshot.tasks.length);

    const vacant = floorBoard(snapshot, 'ember-forge');
    expect(vacant.occupied).toBe(false);
    expect(vacant.columns.flatMap((c) => c.cards)).toHaveLength(0);
  });
});
