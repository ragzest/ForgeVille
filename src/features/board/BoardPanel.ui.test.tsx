import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { minimalSnapshot } from '../../domain/fixtures/minimalSnapshot.ts';
import type { Task, WorkflowSnapshot } from '../../domain/index.ts';
import { INITIAL_INTERACTION, interactionStore } from '../../store/interaction.ts';
import { INITIAL_NAVIGATION, navigationStore } from '../../store/navigation.ts';
import { WorkflowProvider } from '../../store/WorkflowProvider.tsx';
import { createWorkflowStore, type WorkflowStore } from '../../store/workflowStore.ts';
import { COLUMN_NOTE, floorBoard } from '../../world/screens/board.ts';
import { InteractionPanel } from '../navigation/InteractionPanel.tsx';
import { NavigationToolbar } from '../navigation/NavigationToolbar.tsx';
import { TwoDView } from '../navigation/TwoDView.tsx';
import { BOARD_TARGET } from './openBoard.ts';

/** The fixture plus a second, unassigned backlog task: a two-task board. */
function twoTasks(): WorkflowSnapshot {
  const base = minimalSnapshot();
  const backlog: Task = {
    id: 'task-docs',
    projectId: 'project-forgeville',
    issueKey: 'FV-2',
    title: 'Write the README',
    description: 'How to run the app and its tests.',
    column: 'backlog',
    blockedFrom: null,
    assigneeId: null,
    priority: 'low',
    dependsOn: ['task-login'],
    branch: null,
    pullRequestId: null,
  };
  return { ...base, tasks: [...base.tasks, backlog] };
}

function renderBoard(withTwoD = false): WorkflowStore {
  const store = createWorkflowStore();
  store.setState({ snapshot: twoTasks() });
  render(
    <WorkflowProvider store={store}>
      {withTwoD && <TwoDView />}
      <InteractionPanel />
    </WorkflowProvider>,
  );
  act(() => {
    interactionStore.getState().activate(BOARD_TARGET);
  });
  return store;
}

const panel = () => screen.getByRole('dialog', { name: 'Kanban board' });
const column = (label: string) => within(panel()).getByRole('region', { name: new RegExp(`^${label} ·`) });

beforeEach(() => {
  Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => null });
  interactionStore.setState(INITIAL_INTERACTION);
  navigationStore.setState(INITIAL_NAVIGATION);
});

describe('BoardPanel', () => {
  it('shows all seven columns with both cards in the right places', () => {
    renderBoard();
    const headings = within(panel()).getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual([
      'Backlog · 1',
      'Ready · 0',
      'In Progress · 0',
      'In Review · 1',
      'QA · 0',
      'Blocked · 0',
      'Merged · 0',
    ]);

    const login = within(column('In Review')).getByRole('button');
    expect(login).toHaveTextContent('FV-1');
    expect(login).toHaveTextContent('Add login screen');
    expect(login).toHaveTextContent('Ada');
    expect(login).toHaveTextContent('High · In Review');

    const docs = within(column('Backlog')).getByRole('button');
    expect(docs).toHaveTextContent('FV-2Write the READMEUnassignedLow · Backlog');
  });

  it('labels empty columns instead of leaving a gap', () => {
    renderBoard();
    expect(column('Ready')).toHaveTextContent('Nothing in Ready. No task is waiting to be picked up.');
    expect(column('Merged')).toHaveTextContent('Nothing in Merged yet. The first merge lands here.');
  });

  it('uses the whiteboard note colours for each column', () => {
    renderBoard();
    expect(column('Blocked').style.getPropertyValue('--note')).toBe(COLUMN_NOTE.blocked.note);
    expect(column('Backlog').style.getPropertyValue('--chip')).toBe(COLUMN_NOTE.backlog.chip);
  });

  it('matches the wall model card for card', () => {
    renderBoard();
    const wall = floorBoard(twoTasks(), 'workshop');
    for (const col of wall.columns) {
      const keys = within(column(col.label))
        .queryAllByRole('button')
        .map((b) => b.querySelector('.board-note-key')?.textContent);
      expect(keys).toEqual(col.cards.map((c) => c.issueKey));
    }
  });

  it('updates the panel and the 2D board together when the store changes', () => {
    const store = renderBoard(true);
    const twoD = screen.getByRole('region', { name: 'Board' });
    const twoDColumn = (label: string) =>
      [...twoD.querySelectorAll('.two-d-column')].find((el) => el.querySelector('h3')?.textContent.startsWith(label));
    expect(twoDColumn('Merged')).toHaveTextContent('Nothing in Merged yet. The first merge lands here.');

    act(() => {
      const s = store.getState().snapshot;
      store.setState({ snapshot: { ...s, tasks: s.tasks.map((t) => (t.id === 'task-login' ? { ...t, column: 'merged' as const } : t)) } });
    });

    expect(within(column('Merged')).getByRole('button')).toHaveTextContent('FV-1');
    expect(column('In Review')).toHaveTextContent('Nothing in In Review. No pull request needs eyes.');
    expect(twoDColumn('Merged')).toHaveTextContent('FV-1');
    expect(twoDColumn('In Review')).toHaveTextContent('Nothing in In Review. No pull request needs eyes.');
  });

  it('selecting a card shows its detail and marks it on the 2D board', async () => {
    const user = userEvent.setup();
    renderBoard(true);
    await user.click(within(column('Backlog')).getByRole('button'));

    expect(navigationStore.getState().selectedTaskId).toBe('task-docs');
    const detail = within(panel()).getByRole('region', { name: 'FV-2 · Write the README' });
    expect(detail).toHaveTextContent('Depends on');
    expect(detail).toHaveTextContent('FV-1');
    expect(detail).toHaveTextContent('How to run the app and its tests.');
    expect(within(screen.getByRole('region', { name: 'Board' })).getByText('FV-2').closest('li')).toHaveClass('is-selected');

    // Clicking it again clears the selection.
    await user.click(within(column('Backlog')).getByRole('button'));
    expect(navigationStore.getState().selectedTaskId).toBeNull();
  });
});

describe('opening the board from the 2D view', () => {
  it('the Open board button and the board zone both open the overlay', async () => {
    const user = userEvent.setup();
    const store = createWorkflowStore();
    store.setState({ snapshot: twoTasks() });
    navigationStore.setState({ view: '2d' });
    render(
      <WorkflowProvider store={store}>
        <NavigationToolbar webgl />
        <TwoDView />
        <InteractionPanel />
      </WorkflowProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Open board' }));
    expect(panel()).toBeInTheDocument();
    act(() => {
      interactionStore.getState().close();
    });

    const zones = screen.getByRole('region', { name: 'Zones' });
    await user.click(within(zones).getByRole('button', { name: 'Kanban board' }));
    expect(panel()).toBeInTheDocument();
    act(() => {
      interactionStore.getState().close();
    });

    // The toolbar's zone button in 2D does the same.
    await user.click(within(screen.getByRole('group', { name: 'Select zone' })).getByRole('button', { name: 'Kanban board' }));
    expect(panel()).toBeInTheDocument();
  });
});
