import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { minimalSnapshot } from '../../domain/fixtures/minimalSnapshot.ts';
import { INITIAL_INTERACTION, interactionStore } from '../../store/interaction.ts';
import { INITIAL_NAVIGATION, navigationStore } from '../../store/navigation.ts';
import { WorkflowProvider } from '../../store/WorkflowProvider.tsx';
import { createWorkflowStore } from '../../store/workflowStore.ts';
import { InteractionPanel } from '../navigation/InteractionPanel.tsx';
import { TwoDView } from '../navigation/TwoDView.tsx';
import { useInteractionKeys } from '../navigation/useInteractionKeys.ts';

function Harness({ withRoster = false }: { withRoster?: boolean }) {
  useInteractionKeys();
  return (
    <>
      {withRoster && <TwoDView />}
      <InteractionPanel />
    </>
  );
}

function renderWithFixture(withRoster = false) {
  const store = createWorkflowStore();
  store.setState({ snapshot: minimalSnapshot() });
  render(
    <WorkflowProvider store={store}>
      <Harness withRoster={withRoster} />
    </WorkflowProvider>,
  );
}

function openAda() {
  act(() => {
    interactionStore.getState().activate({ id: 'desk:agent-ada', label: "Ada's desk" });
  });
  return screen.getByRole('dialog', { name: "Ada's desk" });
}

beforeEach(() => {
  // jsdom leaves this undefined; browsers report null when nothing is locked.
  Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => null });
  interactionStore.setState(INITIAL_INTERACTION);
  navigationStore.setState(INITIAL_NAVIGATION);
});

describe('DeskPanel', () => {
  it('shows the agent, their issue, branch, labels, and the mock usage label', () => {
    renderWithFixture();
    const panel = openAda();

    expect(panel).toHaveTextContent('Ada');
    expect(panel).toHaveTextContent('Developer');
    expect(panel).toHaveTextContent('Add login screen');
    expect(within(panel).getByText('FV-1')).toBeInTheDocument();
    expect(within(panel).getByText('feature/login')).toBeInTheDocument();
    expect(panel).toHaveTextContent('Claude Code');
    expect(panel).toHaveTextContent('Opus');
    expect(panel).toHaveTextContent('fox');
    expect(panel).toHaveTextContent('Awaiting review');
    expect(panel).toHaveTextContent('09:55 (5 min ago)');
    expect(panel).toHaveTextContent('Simulated, running');
    expect(within(panel).getByText('Mock estimate')).toBeInTheDocument();
    expect(panel).toHaveTextContent('12,000 tokens · $0.40');
    expect(within(panel).getByRole('listitem')).toHaveTextContent('Ada opened pull request #1 for FV-1.');
  });

  it('hides usage entirely when the agent has no mock estimate', () => {
    renderWithFixture();
    act(() => {
      interactionStore.getState().activate({ id: 'desk:agent-rex', label: "Rex's desk" });
    });
    const panel = screen.getByRole('dialog', { name: "Rex's desk" });
    expect(panel).not.toHaveTextContent('Mock estimate');
    expect(panel).not.toHaveTextContent('tokens');
    expect(panel).toHaveTextContent('No assigned task');
    expect(panel).toHaveTextContent('No events for Rex yet.');
    expect(screen.getByRole('button', { name: 'Inspect task' })).toBeDisabled();
  });

  it('shows every action, with a visible reason on the disabled session commands', () => {
    renderWithFixture();
    openAda();
    const actions = within(screen.getByRole('group', { name: 'Desk actions' })).getAllByRole('button');
    expect(actions.map((b) => b.textContent)).toEqual(['Inspect task', 'Open terminal', 'Pause', 'Resume', 'Interrupt']);

    expect(screen.getByRole('button', { name: 'Open terminal' })).toBeEnabled();
    for (const name of ['Pause', 'Resume', 'Interrupt']) {
      expect(screen.getByRole('button', { name })).toBeDisabled();
      expect(screen.getByRole('button', { name })).toHaveAccessibleDescription(
        'Pause, resume, and interrupt arrive with S05-03.',
      );
    }
    expect(screen.getByText('Pause, resume, and interrupt arrive with S05-03.')).toBeVisible();
  });

  it('Inspect task selects the task and shows its title and column', async () => {
    const user = userEvent.setup();
    renderWithFixture();
    openAda();

    await user.click(screen.getByRole('button', { name: 'Inspect task' }));
    expect(navigationStore.getState().selectedTaskId).toBe('task-login');
    expect(screen.getByRole('status')).toHaveTextContent('Selected for the board: FV-1 Add login screen · In Review');
  });

  it('closes with the close button and with Escape', async () => {
    const user = userEvent.setup();
    renderWithFixture();
    openAda();
    await user.click(screen.getByRole('button', { name: 'Close panel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    openAda();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('says so when the desk names an unknown agent', () => {
    renderWithFixture();
    act(() => {
      interactionStore.getState().activate({ id: 'desk:agent-ghost', label: "Ghost's desk" });
    });
    expect(screen.getByRole('dialog')).toHaveTextContent('No agent has id agent-ghost in this scenario.');
  });
});

describe('2D roster', () => {
  it('opens the same desk panel for the same agent id', async () => {
    const user = userEvent.setup();
    renderWithFixture(true);

    await user.click(screen.getByRole('button', { name: "Open Ada's desk" }));
    expect(interactionStore.getState().open).toEqual({ id: 'desk:agent-ada', label: "Ada's desk" });
    const panel = screen.getByRole('dialog', { name: "Ada's desk" });
    expect(panel).toHaveTextContent('desk:agent-ada');
    expect(screen.getByRole('button', { name: "Open Ada's desk" })).toHaveAttribute('aria-pressed', 'true');
  });

  it('highlights the inspected task on the 2D board', async () => {
    const user = userEvent.setup();
    renderWithFixture(true);
    await user.click(screen.getByRole('button', { name: "Open Ada's desk" }));
    await user.click(screen.getByRole('button', { name: 'Inspect task' }));

    const board = screen.getByRole('region', { name: 'Board' });
    expect(within(board).getByText('FV-1').closest('li')).toHaveClass('is-selected');
  });
});
