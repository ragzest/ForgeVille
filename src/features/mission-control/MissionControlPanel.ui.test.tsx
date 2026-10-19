import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SCENARIO_IDS, missionControlMetrics, type WorkflowSnapshot } from '../../domain/index.ts';
import { minimalSnapshot } from '../../domain/fixtures/minimalSnapshot.ts';
import { INITIAL_INTERACTION, interactionStore } from '../../store/interaction.ts';
import { INITIAL_NAVIGATION, navigationStore } from '../../store/navigation.ts';
import { WorkflowProvider } from '../../store/WorkflowProvider.tsx';
import { createWorkflowStore, type WorkflowStore } from '../../store/workflowStore.ts';
import { floorSnapshot } from '../../world/building.ts';
import { statusTiles } from '../../world/screens/displays.ts';
import { InteractionPanel } from '../navigation/InteractionPanel.tsx';
import { NavigationToolbar } from '../navigation/NavigationToolbar.tsx';
import { TwoDView } from '../navigation/TwoDView.tsx';
import { STATUS_TARGET } from './missionControl.ts';

function storeWith(snapshot: WorkflowSnapshot): WorkflowStore {
  const store = createWorkflowStore();
  store.setState({ snapshot });
  return store;
}

function openOverlay(store: WorkflowStore) {
  render(
    <WorkflowProvider store={store}>
      <InteractionPanel />
    </WorkflowProvider>,
  );
  act(() => {
    interactionStore.getState().activate(STATUS_TARGET);
  });
  return screen.getByRole('dialog', { name: 'Mission control' });
}

function scenarioStore(id: (typeof SCENARIO_IDS)[number]): WorkflowStore {
  const store = createWorkflowStore();
  store.getState().loadScenario(id);
  return store;
}

const tile = (panel: HTMLElement, key: string) => {
  const el = panel.querySelector<HTMLElement>(`[data-metric="${key}"]`);
  if (!el) throw new Error(`No tile ${key}`);
  return el;
};
const value = (panel: HTMLElement, key: string) => tile(panel, key).querySelector('.mission-tile-value')?.textContent ?? '';
/** The value without its decorative icon. */
const number = (panel: HTMLElement, key: string) => value(panel, key).replace(/^\D+/, '');

/** Swaps window.matchMedia so NARROW_QUERY matches or not. */
function setNarrow(narrow: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: narrow,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  });
}

beforeEach(() => {
  Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => null });
  interactionStore.setState(INITIAL_INTERACTION);
  navigationStore.setState(INITIAL_NAVIGATION);
});

afterEach(() => {
  // jsdom has no matchMedia of its own.
  Reflect.deleteProperty(window, 'matchMedia');
});

describe('mission control, minimal fixture', () => {
  it('shows all eight numbers from missionControlMetrics', () => {
    const snapshot = minimalSnapshot();
    const panel = openOverlay(storeWith(snapshot));
    const m = missionControlMetrics(snapshot);
    const labels = within(within(panel).getByRole('list', { name: 'Building metrics' }))
      .getAllByRole('listitem')
      .map((li) => li.querySelector('.mission-tile-label')?.textContent);
    expect(labels).toEqual([
      'Projects',
      'Active agents',
      'Queued tasks',
      'Open PRs',
      'Blocked tasks',
      'Merges',
      'Recent failures',
      'QA pass rate',
    ]);
    expect(number(panel, 'totalProjects')).toBe(String(m.totalProjects));
    expect(number(panel, 'activeAgents')).toBe(String(m.activeAgents));
    expect(number(panel, 'queuedTasks')).toBe(String(m.queuedTasks));
    expect(number(panel, 'openPullRequests')).toBe(String(m.openPullRequests));
    expect(number(panel, 'blockedTasks')).toBe(String(m.blockedTasks));
    expect(number(panel, 'successfulMerges')).toBe(String(m.successfulMerges));
    expect(number(panel, 'recentFailures')).toBe(String(m.recentFailures.length));
    expect(number(panel, 'qaPassRate')).toBe('100%');
    expect(tile(panel, 'blockedTasks')).toHaveTextContent('Nothing blocked');
  });

  it('lists the events with timestamps and messages', () => {
    const panel = openOverlay(storeWith(minimalSnapshot()));
    const events = within(within(panel).getByRole('list', { name: 'Recent events' })).getAllByRole('listitem');
    expect(events).toHaveLength(1);
    expect(events[0]).toHaveTextContent('09:55Ada opened pull request #1 for FV-1.');
    expect(events[0]?.querySelector('time')).toHaveAttribute('datetime', '2026-01-05T09:55:00.000Z');
  });

  it('changes the rendered numbers when the snapshot changes', () => {
    const store = storeWith(minimalSnapshot());
    const panel = openOverlay(store);
    expect(number(panel, 'blockedTasks')).toBe('0');
    expect(number(panel, 'successfulMerges')).toBe('0');
    expect(number(panel, 'totalProjects')).toBe('1');

    act(() => {
      const s = store.getState().snapshot;
      store.setState({
        snapshot: {
          ...s,
          projects: [...s.projects, { id: 'project-two', name: 'Second', description: 'Another team.' }],
          tasks: s.tasks.map((t) => ({ ...t, column: 'blocked' as const })),
          pullRequests: s.pullRequests.map((pr) => ({ ...pr, state: 'merged' as const })),
          events: [
            ...s.events,
            { id: 'event-late', timestamp: '2026-01-05T10:30:00.000Z', type: 'task_blocked', message: 'FV-1 is blocked.', links: {} },
          ],
        },
      });
    });

    expect(number(panel, 'blockedTasks')).toBe('1');
    expect(tile(panel, 'blockedTasks')).toHaveTextContent('Needs attention');
    expect(number(panel, 'successfulMerges')).toBe('1');
    expect(number(panel, 'openPullRequests')).toBe('0');
    expect(number(panel, 'totalProjects')).toBe('2');
    const first = within(within(panel).getByRole('list', { name: 'Recent events' })).getAllByRole('listitem')[0];
    expect(first).toHaveTextContent('10:30⛔ Blocked FV-1 is blocked.');
  });
});

describe('mission control, demo scenarios', () => {
  it('names the failed check, with an icon and words, in the QA failure scenario', () => {
    const panel = openOverlay(scenarioStore('qa-failure'));
    expect(number(panel, 'recentFailures')).toBe('1');
    expect(value(panel, 'recentFailures')).toContain('✕');
    expect(tile(panel, 'recentFailures')).toHaveTextContent('Latest: Browser tests failed on Pull request #2');
    expect(number(panel, 'qaPassRate')).toBe('83%');
    expect(tile(panel, 'qaPassRate')).toHaveTextContent('Some checks failed');
    const first = within(within(panel).getByRole('list', { name: 'Recent events' })).getAllByRole('listitem')[0];
    expect(first).toHaveTextContent(/^09:49✕ Failed Browser tests failed/);
  });

  it('shows blocked work in words in the blocked scenario', () => {
    const panel = openOverlay(scenarioStore('agent-blocked'));
    expect(number(panel, 'blockedTasks')).toBe('1');
    expect(value(panel, 'blockedTasks')).toContain('⛔');
    expect(tile(panel, 'blockedTasks')).toHaveTextContent('Needs attention');
    expect(within(panel).getByRole('list', { name: 'Recent events' })).toHaveTextContent('⛔ Blocked LN-4 is blocked in In Progress.');
  });

  it('lists the newest events first, at most eight', () => {
    const store = scenarioStore('successful-merge');
    const panel = openOverlay(store);
    const times = within(within(panel).getByRole('list', { name: 'Recent events' }))
      .getAllByRole('listitem')
      .map((li) => li.querySelector('time')?.getAttribute('datetime') ?? '');
    expect(times.length).toBe(Math.min(8, store.getState().snapshot.events.length));
    expect([...times].sort().reverse()).toEqual(times);
  });

  it("agrees with the current floor's in-world status display in every scenario", () => {
    for (const id of SCENARIO_IDS) {
      const store = scenarioStore(id);
      const panel = openOverlay(store);
      const tiles = statusTiles(floorSnapshot(store.getState().snapshot, 'workshop'));
      expect(tiles).toHaveLength(4);
      const floor = within(panel).getByRole('list', { name: 'This floor' });
      for (const t of tiles) {
        expect(floor.querySelector(`[data-floor-metric="${t.label}"] .mission-tile-value`)?.textContent).toBe(t.value);
      }
      act(() => {
        interactionStore.getState().close();
      });
      document.body.innerHTML = '';
    }
  });

  it('labels the current floor apart from the building totals', () => {
    const store = scenarioStore('feature-in-progress');
    act(() => {
      navigationStore.getState().goToFloor('greenhouse');
    });
    const panel = openOverlay(store);
    expect(within(panel).getByRole('heading', { name: /This floor/ })).toHaveTextContent('This floor · Floor 2 · Greenhouse · Sprout team');
    expect(within(panel).getByRole('heading', { name: /Building/ })).toHaveTextContent('Building · all floors');
    const floor = within(panel).getByRole('list', { name: 'This floor' });
    expect(floor.querySelector('[data-floor-metric="Active agents"] .mission-tile-value')?.textContent).toBe('2');
    expect(number(panel, 'activeAgents')).toBe('5');
    expect(number(panel, 'totalProjects')).toBe('2');
  });

  it('says so on a vacant floor', () => {
    act(() => {
      navigationStore.getState().goToFloor('night-studio');
    });
    const panel = openOverlay(scenarioStore('feature-in-progress'));
    expect(within(panel).getByRole('heading', { name: /This floor/ })).toHaveTextContent('Floor 3 · Night Studio · vacant');
    expect(within(panel).queryByRole('list', { name: 'This floor' })).not.toBeInTheDocument();
  });

  it('opens a desk from the feed, offering the ride when the agent is upstairs', async () => {
    const user = userEvent.setup();
    const panel = openOverlay(scenarioStore('feature-in-progress'));
    await user.click(within(panel).getByRole('button', { name: "Open Hana's desk" }));
    const away = screen.getByRole('dialog', { name: "Hana's desk" });
    expect(within(away).getByRole('button', { name: 'Go to floor 2' })).toBeInTheDocument();
  });

  it('follows a merge from the QA panel', async () => {
    const user = userEvent.setup();
    const store = scenarioStore('review-and-qa-pass');
    let panel = openOverlay(store);
    expect(number(panel, 'successfulMerges')).toBe('1');
    act(() => {
      store.getState().mergePullRequest('pr-2');
    });
    panel = screen.getByRole('dialog', { name: 'Mission control' });
    expect(number(panel, 'successfulMerges')).toBe('2');
    expect(within(panel).getByRole('list', { name: 'Recent events' }).querySelector('li')).toHaveTextContent('★ Merged');
    await user.click(within(panel).getByRole('button', { name: 'Close panel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('mission control on a narrow viewport', () => {
  it('starts as a summary button that expands', async () => {
    setNarrow(true);
    const user = userEvent.setup();
    const panel = openOverlay(scenarioStore('agent-blocked'));
    const summary = within(panel).getByRole('button', { name: /active/ });
    expect(summary).toHaveAttribute('aria-expanded', 'false');
    expect(summary).toHaveTextContent('Building: 4 active · ⛔ 1 blocked · ✕ 0 failures');
    expect(within(panel).queryByRole('list', { name: 'Building metrics' })).not.toBeInTheDocument();
    // The close control stays visible while collapsed.
    expect(within(panel).getByRole('button', { name: 'Close panel' })).toBeVisible();

    await user.click(summary);
    expect(summary).toHaveAttribute('aria-expanded', 'true');
    expect(within(panel).getByRole('list', { name: 'Building metrics' })).toBeInTheDocument();
  });

  it('shows everything without a summary button on a wide viewport', () => {
    setNarrow(false);
    const panel = openOverlay(scenarioStore('agent-blocked'));
    expect(within(panel).queryByRole('button', { name: /active/ })).not.toBeInTheDocument();
    expect(within(panel).getByRole('list', { name: 'Building metrics' })).toBeInTheDocument();
  });
});

describe('opening mission control', () => {
  it('opens from the 2D status region, the status zone, and the toolbar', async () => {
    const user = userEvent.setup();
    const store = scenarioStore('agent-blocked');
    navigationStore.setState({ view: '2d' });
    render(
      <WorkflowProvider store={store}>
        <NavigationToolbar webgl />
        <TwoDView />
        <InteractionPanel />
      </WorkflowProvider>,
    );
    const region = screen.getByRole('region', { name: 'Project status' });
    expect(region).toHaveTextContent('Blocked 1');

    await user.click(within(region).getByRole('button', { name: 'Open mission control' }));
    expect(screen.getByRole('dialog', { name: 'Mission control' })).toBeInTheDocument();
    act(() => {
      interactionStore.getState().close();
    });

    await user.click(within(screen.getByRole('region', { name: 'Zones' })).getByRole('button', { name: 'Project status' }));
    expect(screen.getByRole('dialog', { name: 'Mission control' })).toBeInTheDocument();
    act(() => {
      interactionStore.getState().close();
    });

    await user.click(within(screen.getByRole('group', { name: 'Select zone' })).getByRole('button', { name: 'Project status' }));
    expect(screen.getByRole('dialog', { name: 'Mission control' })).toBeInTheDocument();
  });
});
