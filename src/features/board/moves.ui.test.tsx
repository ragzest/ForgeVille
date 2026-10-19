import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { presenceOf } from '../../domain/index.ts';
import { INITIAL_INTERACTION, interactionStore } from '../../store/interaction.ts';
import { INITIAL_NAVIGATION, navigationStore } from '../../store/navigation.ts';
import { WorkflowProvider } from '../../store/WorkflowProvider.tsx';
import { createWorkflowStore, type WorkflowStore } from '../../store/workflowStore.ts';
import { floorBoard, wallNotes } from '../../world/screens/board.ts';
import { screenModel } from '../../world/screens/screenModel.ts';
import { InteractionPanel } from '../navigation/InteractionPanel.tsx';
import { TwoDView } from '../navigation/TwoDView.tsx';
import { BOARD_TARGET } from './openBoard.ts';
import { moveOptions } from './moves.ts';

/** The mock service on its default scenario, with the board open on one task. */
function openOn(taskId: string): WorkflowStore {
  const store = createWorkflowStore();
  navigationStore.setState({ selectedTaskId: taskId });
  render(
    <WorkflowProvider store={store}>
      <TwoDView />
      <InteractionPanel />
    </WorkflowProvider>,
  );
  act(() => {
    interactionStore.getState().activate(BOARD_TARGET);
  });
  return store;
}

const detail = () => screen.getByRole('region', { name: /^LN-\d · / });
const column = (store: WorkflowStore, id: string) => store.getState().snapshot.tasks.find((t) => t.id === id)?.column;

beforeEach(() => {
  Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => null });
  interactionStore.setState(INITIAL_INTERACTION);
  navigationStore.setState(INITIAL_NAVIGATION);
});

describe('task detail', () => {
  it('shows description, dependencies, assignee, column, and the pull request', () => {
    openOn('task-ln-4');
    const d = detail();
    expect(d).toHaveTextContent('Keep saved articles readable without a connection');
    expect(d).toHaveTextContent('LN-3 Sync API for saved articles · In Progress (not merged yet)');
    expect(d).toHaveTextContent('Chen');
    expect(d).toHaveTextContent('In Progress');
    expect(d).toHaveTextContent('None yet'); // no pull request yet
  });

  it('names a linked pull request', () => {
    openOn('task-ln-1');
    expect(detail()).toHaveTextContent('#1 · ');
    expect(detail()).toHaveTextContent('(merged)');
  });
});

describe('simulated moves', () => {
  it('offers only the legal next columns as moves', () => {
    openOn('task-ln-2'); // In Progress
    const legal = within(detail()).getByRole('group', { name: 'Legal moves' });
    expect(within(legal).getAllByRole('button').map((b) => b.textContent)).toEqual(['Move to In Review', 'Move to Blocked']);
  });

  it('a legal move changes the column everywhere at once', async () => {
    const user = userEvent.setup();
    const store = openOn('task-ln-2');
    expect(presenceOf(store.getState().snapshot, 'agent-ada')).toBe('working');

    await user.click(within(detail()).getByRole('button', { name: 'Move to In Review' }));

    const snapshot = store.getState().snapshot;
    expect(column(store, 'task-ln-2')).toBe('in_review');
    expect(screen.getByRole('status')).toHaveTextContent('LN-2 moved from In Progress to In Review.');
    // The open detail, the overlay column, and the 2D list.
    expect(detail()).toHaveTextContent('In Review');
    const overlay = screen.getByRole('dialog', { name: 'Kanban board' });
    expect(within(within(overlay).getByRole('region', { name: /^In Review ·/ })).getByRole('button', { name: /LN-2/ })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Board' })).getByText('LN-2').closest('.two-d-column')).toHaveTextContent('In Review');
    // Desk presence and the monitor banner follow.
    expect(presenceOf(snapshot, 'agent-ada')).toBe('awaiting_review');
    expect(screenModel(snapshot, 'agent-ada').banner?.text).toBe('AWAITING REVIEW');
    // The wall model has the card in the new column, still outlined.
    const wall = floorBoard(snapshot, 'workshop').columns.find((c) => c.column === 'in_review');
    if (!wall) throw new Error('no column');
    expect(wallNotes(wall, 'task-ln-2').notes.find((n) => n.card.taskId === 'task-ln-2')?.selected).toBe(true);
    // The next legal moves come from the new column.
    expect(within(within(detail()).getByRole('group', { name: 'Legal moves' })).getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Move to QA',
      'Move to Blocked',
    ]);
  });

  it('an illegal move shows the domain reason and changes nothing', async () => {
    const user = userEvent.setup();
    const store = openOn('task-ln-2');
    const before = store.getState().snapshot;

    await user.click(within(detail()).getByText('Try a move the rules refuse'));
    await user.click(within(detail()).getByRole('button', { name: 'Try Merged' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Not moved: LN-2 can only be merged through its pull request.');
    expect(store.getState().snapshot).toBe(before);
    expect(store.getState().lastResult?.ok).toBe(false);
  });

  it('a blocked task can only go back where it came from', async () => {
    const user = userEvent.setup();
    const store = openOn('task-ln-4');
    await user.click(within(detail()).getByRole('button', { name: 'Move to Blocked' }));
    expect(column(store, 'task-ln-4')).toBe('blocked');

    const legal = within(detail()).getByRole('group', { name: 'Legal moves' });
    expect(within(legal).getAllByRole('button').map((b) => b.textContent)).toEqual(['Move to In Progress']);
    await user.click(within(detail()).getByRole('button', { name: 'Try Ready' }));
    expect(screen.getByRole('alert')).toHaveTextContent('LN-4 can only leave Blocked back to In Progress.');
  });
});

describe('moveOptions', () => {
  it('splits every other column by the domain check', () => {
    const store = createWorkflowStore();
    const options = moveOptions(store.getState().snapshot, 'task-ln-5'); // Ready
    expect(options.map((o) => o.to)).not.toContain('ready');
    expect(options.filter((o) => o.legal).map((o) => o.to)).toEqual(['in_progress']);
    expect(options.find((o) => o.to === 'qa')?.reason).toBe('LN-5 is Ready; it cannot move to QA.');
  });

  it('is empty for an unknown task', () => {
    expect(moveOptions(createWorkflowStore().getState().snapshot, 'task-none')).toEqual([]);
  });
});
