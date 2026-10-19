import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { minimalSnapshot } from '../../domain/fixtures/minimalSnapshot.ts';
import { pauseSession, presenceOf, refuse, type WorkflowSnapshot } from '../../domain/index.ts';
import type { WorkflowPort } from '../../services/ports.ts';
import { INITIAL_INTERACTION, interactionStore } from '../../store/interaction.ts';
import { WorkflowProvider } from '../../store/WorkflowProvider.tsx';
import { createWorkflowStore, type WorkflowStore } from '../../store/workflowStore.ts';
import { characterModels } from '../../world/characters/models.ts';
import { screenModel } from '../../world/screens/screenModel.ts';
import { InteractionPanel } from '../navigation/InteractionPanel.tsx';
import { sessionControls } from './deskDetails.ts';

/** A port over a fixture snapshot. Only the session commands are wired; the rest are spies. */
function fixturePort(initial: WorkflowSnapshot, overrides: Partial<WorkflowPort> = {}): WorkflowPort {
  let snapshot = initial;
  const notUsed = () => {
    throw new Error('not used in this test');
  };
  return {
    getSnapshot: () => snapshot,
    loadScenario: notUsed,
    moveTask: notUsed,
    requestChanges: notUsed,
    mergePullRequest: notUsed,
    pauseSession: (id) => {
      const result = pauseSession(snapshot, id);
      snapshot = result.snapshot;
      return result;
    },
    resumeSession: notUsed,
    interruptSession: notUsed,
    ...overrides,
  };
}

function openDesk(store: WorkflowStore, agentId: string, name: string) {
  render(
    <WorkflowProvider store={store}>
      <InteractionPanel />
    </WorkflowProvider>,
  );
  act(() => {
    interactionStore.getState().activate({ id: `desk:${agentId}`, label: `${name}'s desk` });
  });
  return screen.getByRole('dialog', { name: `${name}'s desk` });
}

beforeEach(() => {
  interactionStore.setState(INITIAL_INTERACTION);
});

describe('session commands in the desk panel', () => {
  it('Pause calls the port and shows the result', async () => {
    const user = userEvent.setup();
    const port = fixturePort(minimalSnapshot());
    const pause = vi.spyOn(port, 'pauseSession');
    const store = createWorkflowStore(port);
    const panel = openDesk(store, 'agent-ada', 'Ada');

    await user.click(within(panel).getByRole('button', { name: 'Pause' }));

    expect(pause).toHaveBeenCalledWith('session-ada-1');
    const result = store.getState().lastResult;
    expect(result?.ok).toBe(true);
    expect(store.getState().snapshot.sessions[0]?.state).toBe('paused');
    expect(screen.getByRole('status')).toHaveTextContent("Ada's simulated session was paused.");

    // Buttons follow the new state.
    expect(within(panel).getByRole('button', { name: 'Pause' })).toBeDisabled();
    expect(within(panel).getByRole('button', { name: 'Resume' })).toBeEnabled();
    expect(panel).toHaveTextContent('Pause needs a running session; this one is paused.');
    expect(panel).toHaveTextContent('Simulated, paused');
  });

  it('a refused command shows the reason and leaves the snapshot alone', async () => {
    const user = userEvent.setup();
    const initial = minimalSnapshot();
    const port = fixturePort(initial, {
      pauseSession: (id) => refuse(initial, `Session ${id} is busy in another tab.`),
    });
    const store = createWorkflowStore(port);
    const panel = openDesk(store, 'agent-ada', 'Ada');

    await user.click(within(panel).getByRole('button', { name: 'Pause' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Not done: Session session-ada-1 is busy in another tab.');
    expect(store.getState().snapshot).toBe(initial);
    expect(within(panel).getByRole('button', { name: 'Pause' })).toBeEnabled();
  });

  it('pausing a working agent stops them presenting as working, logs it, and changes the monitor', async () => {
    const user = userEvent.setup();
    const store = createWorkflowStore(); // the mock service, feature-in-progress
    expect(presenceOf(store.getState().snapshot, 'agent-ada')).toBe('working');
    const before = screenModel(store.getState().snapshot, 'agent-ada');
    expect(before.live).toBe(true);
    const pose = (snapshot: WorkflowSnapshot) => characterModels(snapshot, false).find((c) => c.agentId === 'agent-ada')?.look.pose;
    expect(pose(store.getState().snapshot)).toBe('typing');

    const panel = openDesk(store, 'agent-ada', 'Ada');
    await user.click(within(panel).getByRole('button', { name: 'Pause' }));

    const after = store.getState().snapshot;
    expect(presenceOf(after, 'agent-ada')).toBe('idle');
    expect(panel).toHaveTextContent('Idle');
    const session = after.sessions.filter((s) => s.agentId === 'agent-ada').at(-1);
    expect(session?.transcript.at(-1)).toMatchObject({ stream: 'system', text: 'Session paused by operator.' });
    expect(after.events.at(-1)?.type).toBe('session_paused');

    const monitor = screenModel(after, 'agent-ada');
    expect(monitor.banner?.text).toBe('SESSION PAUSED');
    expect(monitor.live).toBe(false);
    expect(monitor.lines.at(-1)?.text).toBe('Session paused by operator.');
    expect(pose(after)).toBe('leaning-back'); // the idle pose, through presence

    // Interrupt from paused, then resume back to working.
    await user.click(within(panel).getByRole('button', { name: 'Interrupt' }));
    expect(screenModel(store.getState().snapshot, 'agent-ada').banner?.text).toBe('SESSION INTERRUPTED');
    expect(within(panel).getByRole('button', { name: 'Interrupt' })).toBeDisabled();

    await user.click(within(panel).getByRole('button', { name: 'Resume' }));
    expect(presenceOf(store.getState().snapshot, 'agent-ada')).toBe('working');
    expect(screenModel(store.getState().snapshot, 'agent-ada').live).toBe(true);
    expect(within(panel).getByRole('button', { name: 'Resume' })).toBeDisabled();
  });
});

describe('sessionControls', () => {
  const session = minimalSnapshot().sessions[0];
  if (!session) throw new Error('fixture has a session');
  const enabled = (state: typeof session.state) =>
    sessionControls({ ...session, state }).map((c) => [c.command, c.enabled] as const);

  it('allows exactly the domain transitions for each state', () => {
    expect(enabled('running')).toEqual([['pause', true], ['resume', false], ['interrupt', true]]);
    expect(enabled('paused')).toEqual([['pause', false], ['resume', true], ['interrupt', true]]);
    expect(enabled('interrupted')).toEqual([['pause', false], ['resume', true], ['interrupt', false]]);
    expect(enabled('completed')).toEqual([['pause', false], ['resume', false], ['interrupt', false]]);
  });

  it('disables everything with a reason when there is no session', () => {
    const controls = sessionControls(null);
    expect(controls.every((c) => !c.enabled)).toBe(true);
    expect(controls[0]?.reason).toBe('Pause needs a simulated session; there is none.');
  });
});
