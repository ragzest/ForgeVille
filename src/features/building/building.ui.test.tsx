import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { INITIAL_INTERACTION, interactionStore } from '../../store/interaction.ts';
import { INITIAL_NAVIGATION, navigationStore } from '../../store/navigation.ts';
import { WorkflowProvider } from '../../store/WorkflowProvider.tsx';
import { createWorkflowStore } from '../../store/workflowStore.ts';
import { interactionTargets } from '../../world/interaction.ts';
import { VACANT_FLOOR_LANDMARKS } from '../../world/layout.ts';
import { InteractionPanel } from '../navigation/InteractionPanel.tsx';
import { NavigationToolbar } from '../navigation/NavigationToolbar.tsx';
import { TwoDView } from '../navigation/TwoDView.tsx';

function renderBuilding({ twoD = false }: { twoD?: boolean } = {}) {
  render(
    <WorkflowProvider store={createWorkflowStore()}>
      <NavigationToolbar webgl />
      {twoD && <TwoDView />}
      <InteractionPanel />
    </WorkflowProvider>,
  );
}

beforeEach(() => {
  interactionStore.setState(INITIAL_INTERACTION);
  navigationStore.setState(INITIAL_NAVIGATION);
});

describe('floors and the elevator', () => {
  it('starts on the ground floor, where the project team works', () => {
    renderBuilding();
    const floors = screen.getByRole('group', { name: 'Floor' });
    expect(within(floors).getAllByRole('button')).toHaveLength(4);
    expect(within(floors).getByRole('button', { name: 'Floor 1 · Workshop' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('switches floors from the toolbar and closes a stale panel', async () => {
    const user = userEvent.setup();
    renderBuilding();
    act(() => {
      interactionStore.getState().activate({ id: 'board', label: 'Kanban board' });
    });
    await user.click(screen.getByRole('button', { name: 'Floor 3 · Night Studio' }));
    expect(navigationStore.getState().floor).toBe('night-studio');
    expect(screen.getByRole('button', { name: 'Floor 3 · Night Studio' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('lists every floor in the elevator with who works there', async () => {
    const user = userEvent.setup();
    renderBuilding();
    act(() => {
      interactionStore.getState().activate({ id: 'elevator', label: 'Elevator' });
    });
    const panel = screen.getByRole('dialog', { name: 'Elevator' });
    const floors = within(panel).getAllByRole('listitem');
    expect(floors).toHaveLength(4);
    // Top floor first, like an elevator panel.
    expect(floors[0]).toHaveTextContent('Ember Forge');
    expect(floors[3]).toHaveTextContent('Lantern team');
    expect(floors[0]).toHaveTextContent('Vacant');
    expect(floors[2]).toHaveTextContent('Sprout team');
    expect(within(panel).getByRole('button', { name: 'Floor 1 · Workshop, you are here' })).toBeDisabled();

    await user.click(within(panel).getByRole('button', { name: 'Go to Floor 2 · Greenhouse' }));
    expect(navigationStore.getState().floor).toBe('greenhouse');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('explains a vacant floor in the 2D view and offers the way back', async () => {
    const user = userEvent.setup();
    act(() => {
      navigationStore.getState().goToFloor('ember-forge');
    });
    renderBuilding({ twoD: true });
    expect(screen.getByText(/is vacant/)).toHaveTextContent('Floor 4 · Ember Forge is vacant');
    await user.click(screen.getByRole('button', { name: 'Go to Floor 1 · Workshop' }));
    expect(navigationStore.getState().floor).toBe('workshop');
    expect(screen.queryByText(/is vacant/)).not.toBeInTheDocument();
  });

  it("shows each occupied floor's live summary in the elevator", () => {
    const store = createWorkflowStore();
    store.getState().loadScenario('agent-blocked');
    render(
      <WorkflowProvider store={store}>
        <InteractionPanel />
      </WorkflowProvider>,
    );
    act(() => {
      interactionStore.getState().activate({ id: 'elevator', label: 'Elevator' });
    });
    const panel = screen.getByRole('dialog', { name: 'Elevator' });
    const summary = (floor: string) => panel.querySelector(`[data-floor-summary="${floor}"]`);
    expect(summary('workshop')).toHaveTextContent('2 active agents · ⛔ 1 blocked task');
    expect(summary('greenhouse')).toHaveTextContent('2 active agents · nothing blocked');
    expect(summary('night-studio')).toBeNull();
    // Live: a change in the snapshot shows up without reopening.
    act(() => {
      store.getState().moveTask('task-sp-2', 'blocked');
    });
    expect(summary('greenhouse')).toHaveTextContent('1 active agent · ⛔ 1 blocked task');
  });

  it("lists only the current floor's team in the 2D view", async () => {
    const user = userEvent.setup();
    renderBuilding({ twoD: true });
    const team = () => within(screen.getByRole('region', { name: 'Team' }));
    expect(team().getByText('Ada')).toBeInTheDocument();
    expect(team().queryByText('Hana')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Floor 2 · Greenhouse' }));
    expect(team().getByText('Sprout team · Floor 2 · Greenhouse')).toBeInTheDocument();
    expect(team().getAllByRole('listitem').map((li) => li.querySelector('strong')?.textContent)).toEqual(['Hana', 'Ivo', 'Juno', 'Kit']);
    expect(team().queryByText('Ada')).not.toBeInTheDocument();
    const board = within(screen.getByRole('region', { name: 'Board' }));
    expect(board.getByText('SP-1')).toBeInTheDocument();
    expect(board.queryByText('LN-2')).not.toBeInTheDocument();
  });

  it('offers the ride instead of a desk panel for someone on another floor', async () => {
    const user = userEvent.setup();
    renderBuilding();
    act(() => {
      interactionStore.getState().activate({ id: 'desk:agent-hana', label: "Hana's desk" });
    });
    const panel = screen.getByRole('dialog', { name: "Hana's desk" });
    expect(panel).toHaveTextContent('Hana works on Floor 2 · Greenhouse with the Sprout team. You are on Floor 1 · Workshop.');
    expect(within(panel).queryByText(/Agent id/)).not.toBeInTheDocument();

    await user.click(within(panel).getByRole('button', { name: 'Go to floor 2' }));
    expect(navigationStore.getState().floor).toBe('greenhouse');
    // On arrival the real desk panel opens.
    expect(screen.getByRole('dialog', { name: "Hana's desk" })).toHaveTextContent('Agent id');
  });

  it('offers only the elevator on a vacant floor', () => {
    expect(interactionTargets([], VACANT_FLOOR_LANDMARKS).map((t) => t.id)).toEqual(['elevator']);
    expect(interactionTargets([{ id: 'agent-ada', name: 'Ada' }]).map((t) => t.id)).toEqual(
      expect.arrayContaining(['desk:agent-ada', 'board', 'elevator']),
    );
  });
});
