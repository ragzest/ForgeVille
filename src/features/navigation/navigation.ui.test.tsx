import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ScenarioId } from '../../domain/index.ts';
import { INITIAL_NAVIGATION, navigationStore } from '../../store/navigation.ts';
import { WorkflowProvider } from '../../store/WorkflowProvider.tsx';
import { createWorkflowStore } from '../../store/workflowStore.ts';
import { ControlHint } from './ControlHint.tsx';
import { NavigationToolbar } from './NavigationToolbar.tsx';
import { TwoDView } from './TwoDView.tsx';

beforeEach(() => {
  navigationStore.setState(INITIAL_NAVIGATION);
});

describe('NavigationToolbar', () => {
  it('zone button sets the selected zone and sends the player there', async () => {
    const user = userEvent.setup();
    render(<NavigationToolbar webgl />);

    await user.click(screen.getByRole('button', { name: 'Kanban board' }));

    expect(navigationStore.getState().selectedZone).toBe('board');
    expect(navigationStore.getState().travel).toEqual({ zone: 'board', seq: 1 });
    expect(screen.getByRole('button', { name: 'Kanban board' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('offers all six zones and the three views', () => {
    render(<NavigationToolbar webgl />);
    const zones = within(screen.getByRole('group', { name: 'Go to zone' })).getAllByRole('button');
    expect(zones.map((b) => b.textContent)).toEqual([
      'Reception',
      'Developer desks',
      'QA lab',
      'Kanban board',
      'Project status',
      'Meeting area',
    ]);
    const views = within(screen.getByRole('group', { name: 'View' })).getAllByRole('button');
    expect(views.map((b) => b.textContent)).toEqual(['Walk', 'Overview', '2D view']);
  });

  it('switches views and marks the current one', async () => {
    const user = userEvent.setup();
    render(<NavigationToolbar webgl />);
    expect(screen.getByRole('button', { name: 'Walk' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Overview' }));
    expect(navigationStore.getState().view).toBe('overview');
    expect(screen.getByRole('button', { name: 'Overview' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: '2D view' }));
    expect(navigationStore.getState().view).toBe('2d');
  });

  it('in the 2D view, zone buttons select without travelling', async () => {
    const user = userEvent.setup();
    act(() => {
      navigationStore.getState().setView('2d');
    });
    render(<NavigationToolbar webgl />);
    await user.click(screen.getByRole('button', { name: 'QA lab' }));
    expect(navigationStore.getState()).toMatchObject({ selectedZone: 'qa', travel: null, view: '2d' });
  });

  it('without WebGL, only zone selection is offered', async () => {
    const user = userEvent.setup();
    render(<NavigationToolbar webgl={false} />);
    expect(screen.queryByRole('group', { name: 'View' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reception' }));
    expect(navigationStore.getState()).toMatchObject({ selectedZone: 'reception', travel: null });
  });

  it('is reachable from the keyboard', async () => {
    const user = userEvent.setup();
    render(<NavigationToolbar webgl />);
    await user.tab();
    expect(screen.getByRole('button', { name: 'Walk' })).toHaveFocus();
    await user.tab();
    await user.tab();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Reception' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(navigationStore.getState().selectedZone).toBe('reception');
  });
});

describe('TwoDView', () => {
  function renderWith(scenario: ScenarioId) {
    const store = createWorkflowStore();
    store.getState().loadScenario(scenario);
    return render(
      <WorkflowProvider store={store}>
        <TwoDView />
      </WorkflowProvider>,
    );
  }

  it('lists zones, the team with presence, and tasks by column from the snapshot', () => {
    renderWith('agent-blocked');
    const zones = screen.getByRole('region', { name: 'Zones' });
    expect(within(zones).getAllByRole('button')).toHaveLength(6);

    const team = screen.getByRole('region', { name: 'Team' });
    expect(within(team).getAllByRole('listitem')).toHaveLength(7);
    expect(within(team).getByText('Chen').closest('li')).toHaveTextContent('Blocked');
    expect(within(team).getByText('Bruno').closest('li')).toHaveTextContent('Working');

    const board = screen.getByRole('region', { name: 'Board' });
    expect(within(board).getByRole('heading', { name: /Blocked \(1\)/ })).toBeInTheDocument();
    expect(within(board).getByText('LN-4').closest('li')).toHaveTextContent('Offline cache for saved articles');
    expect(within(board).getByRole('heading', { name: /Merged \(1\)/ })).toBeInTheDocument();
  });

  it('zone button sets the selected zone', async () => {
    const user = userEvent.setup();
    renderWith('feature-in-progress');
    const button = within(screen.getByRole('region', { name: 'Zones' })).getByRole('button', { name: 'Developer desks' });
    await user.click(button);
    expect(navigationStore.getState().selectedZone).toBe('desks');
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('ControlHint in overview', () => {
  it('explains that movement is paused', () => {
    act(() => {
      navigationStore.getState().setView('overview');
    });
    render(<ControlHint />);
    expect(screen.getByText(/Overview: movement is paused/)).toBeInTheDocument();
  });
});

describe('Follow the clock', () => {
  it('is off by default and toggles the clock-driven sky', async () => {
    const user = userEvent.setup();
    render(<NavigationToolbar webgl />);
    const toggle = within(screen.getByRole('group', { name: 'Light' })).getByRole('button', { name: 'Follow the clock' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(navigationStore.getState().followClock).toBe(false);

    await user.click(toggle);
    expect(navigationStore.getState().followClock).toBe(true);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');

    await user.click(toggle);
    expect(navigationStore.getState().followClock).toBe(false);
  });

  it('is not offered without the 3D office', () => {
    render(<NavigationToolbar webgl={false} />);
    expect(screen.queryByRole('button', { name: 'Follow the clock' })).toBeNull();
  });
});
