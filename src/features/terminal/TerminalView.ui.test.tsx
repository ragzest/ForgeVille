import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { PreferencesContext } from '../../app/shell/preferences.ts';
import { minimalSnapshot } from '../../domain/fixtures/minimalSnapshot.ts';
import type { WorkflowSnapshot } from '../../domain/index.ts';
import { INITIAL_INTERACTION, interactionStore } from '../../store/interaction.ts';
import { WorkflowProvider } from '../../store/WorkflowProvider.tsx';
import { createWorkflowStore } from '../../store/workflowStore.ts';
import { isKeyCaptureTarget } from '../../world/player/input.ts';
import { InteractionPanel } from '../navigation/InteractionPanel.tsx';
import { useInteractionKeys } from '../navigation/useInteractionKeys.ts';
import { TerminalView } from './TerminalView.tsx';

function renderTerminal(snapshot: WorkflowSnapshot, agentId = 'agent-ada', reducedMotion = false) {
  const store = createWorkflowStore();
  store.setState({ snapshot });
  return render(
    <PreferencesContext.Provider value={{ reducedMotion }}>
      <WorkflowProvider store={store}>
        <TerminalView agentId={agentId} />
      </WorkflowProvider>
    </PreferencesContext.Provider>,
  );
}

/** Ada with her task back in progress, so her session reads as working. */
function workingAda(): WorkflowSnapshot {
  const base = minimalSnapshot();
  return {
    ...base,
    tasks: base.tasks.map((t) => ({ ...t, column: 'in_progress' as const })),
    pullRequests: base.pullRequests.map((pr) => ({ ...pr, reviewerId: null })),
  };
}

beforeEach(() => {
  Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => null });
  interactionStore.setState(INITIAL_INTERACTION);
});

describe('TerminalView', () => {
  it('is labelled "Simulated session" in text and shows fixture lines with their times', () => {
    renderTerminal(minimalSnapshot());
    expect(screen.getByRole('region', { name: 'Simulated session' })).toBeInTheDocument();
    expect(screen.getByText('SIMULATED')).toBeInTheDocument();

    const log = screen.getByRole('log');
    const lines = within(log).getAllByRole('listitem');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toHaveTextContent('09:55Opened pull request #1.');
    expect(lines[0]).toHaveAttribute('data-kind', 'system');
    expect(lines[1]).toHaveAttribute('data-kind', 'output');
  });

  it('captures keys and takes focus, so WASD never reaches the player', () => {
    renderTerminal(minimalSnapshot());
    const region = screen.getByRole('region', { name: 'Simulated session' });
    expect(region).toHaveAttribute('data-captures-keys');
    expect(screen.getByRole('log')).toHaveFocus();
    expect(isKeyCaptureTarget(document.activeElement)).toBe(true);
  });

  it('shows the same banner as the monitor', () => {
    renderTerminal(minimalSnapshot()); // Ada is awaiting review in the fixture
    expect(screen.getByText('AWAITING REVIEW')).toBeInTheDocument();
  });

  it('blinks the cursor only while the session is running and the agent is working', () => {
    const { unmount } = renderTerminal(workingAda());
    expect(document.querySelector('.terminal-cursor')).toHaveClass('is-blinking');
    expect(screen.getByText(/Working on FV-1/)).toBeInTheDocument();
    unmount();

    renderTerminal(minimalSnapshot()); // awaiting review: not live
    expect(document.querySelector('.terminal-cursor')).not.toHaveClass('is-blinking');
  });

  it('keeps the cursor steady under reduced motion', () => {
    renderTerminal(workingAda(), 'agent-ada', true);
    const cursor = document.querySelector('.terminal-cursor');
    expect(cursor).toHaveAttribute('data-live', 'true');
    expect(cursor).not.toHaveClass('is-blinking');
  });

  it('shows explicit empty states', () => {
    const { unmount } = renderTerminal(minimalSnapshot(), 'agent-rex'); // no session at all
    expect(screen.getByRole('log')).toHaveTextContent('No simulated session for Rex. There is nothing to replay.');
    unmount();

    const base = minimalSnapshot();
    renderTerminal({ ...base, sessions: base.sessions.map((s) => ({ ...s, transcript: [] })) });
    expect(screen.getByRole('log')).toHaveTextContent('This simulated session has no transcript lines yet.');
  });

  it('never claims real execution', () => {
    renderTerminal(minimalSnapshot());
    expect(screen.getByText(/No shell or process runs, and no tests run on a real machine\./)).toBeInTheDocument();
  });
});

function DeskHarness() {
  useInteractionKeys();
  return <InteractionPanel />;
}

describe('desk panel terminal', () => {
  it('Open terminal swaps in the terminal; Back returns to the desk; closing resets it', async () => {
    const user = userEvent.setup();
    const store = createWorkflowStore();
    store.setState({ snapshot: minimalSnapshot() });
    render(
      <WorkflowProvider store={store}>
        <DeskHarness />
      </WorkflowProvider>,
    );
    act(() => {
      interactionStore.getState().activate({ id: 'desk:agent-ada', label: "Ada's desk" });
    });

    await user.click(screen.getByRole('button', { name: 'Open terminal' }));
    expect(interactionStore.getState().terminal).toBe(true);
    expect(screen.getByRole('dialog', { name: "Ada's desk" })).toContainElement(screen.getByRole('log'));

    // E while the terminal has focus does nothing; W is just a key press.
    await user.keyboard('ew');
    expect(screen.getByRole('log')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Back to desk' }));
    expect(interactionStore.getState().terminal).toBe(false);
    expect(screen.queryByRole('log')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open terminal' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(interactionStore.getState().terminal).toBe(false);
  });
});
