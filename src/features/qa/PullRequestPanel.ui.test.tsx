import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ScenarioId } from '../../domain/index.ts';
import { INITIAL_INTERACTION, interactionStore } from '../../store/interaction.ts';
import { INITIAL_NAVIGATION, navigationStore } from '../../store/navigation.ts';
import { WorkflowProvider } from '../../store/WorkflowProvider.tsx';
import { createWorkflowStore } from '../../store/workflowStore.ts';
import { CHECK_STATUS, qaDisplay } from '../../world/screens/qa.ts';
import { InteractionPanel } from '../navigation/InteractionPanel.tsx';
import { NavigationToolbar } from '../navigation/NavigationToolbar.tsx';
import { TwoDView } from '../navigation/TwoDView.tsx';
import { QA_TARGET } from './openQa.ts';

function openPanel(scenario: ScenarioId) {
  const store = createWorkflowStore();
  store.getState().loadScenario(scenario);
  render(
    <WorkflowProvider store={store}>
      <InteractionPanel />
    </WorkflowProvider>,
  );
  act(() => {
    interactionStore.getState().activate(QA_TARGET);
  });
  return { store, panel: screen.getByRole('dialog', { name: 'QA screen' }) };
}

const checks = (panel: HTMLElement) =>
  within(within(panel).getByRole('list', { name: 'Checks' }))
    .getAllByRole('listitem')
    .map((li) => li.textContent);

beforeEach(() => {
  Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => null });
  interactionStore.setState(INITIAL_INTERACTION);
  navigationStore.setState(INITIAL_NAVIGATION);
});

describe('pull-request panel, passing scenario', () => {
  it('shows the pull request, its branches, people, and passing checks', () => {
    const { panel } = openPanel('review-and-qa-pass');
    expect(panel).toHaveTextContent('#2 Add-to-list button on article cards');
    expect(panel).toHaveTextContent('feature/add-to-list → main');
    expect(panel).toHaveTextContent('AuthorAda');
    expect(panel).toHaveTextContent('ReviewerFern');
    expect(panel).toHaveTextContent('✓ Approved');
    expect(checks(panel)).toEqual(['Unit tests✓ Passed', 'Build✓ Passed', 'Browser tests✓ Passed']);
  });

  it('lists the timeline, findings, labelled screenshot placeholders, and an open merge', () => {
    const { panel } = openPanel('review-and-qa-pass');
    const timeline = within(within(panel).getByRole('list', { name: 'Test-run timeline' })).getAllByRole('listitem');
    expect(timeline.map((li) => li.querySelector('strong')?.textContent)).toEqual(['Unit tests', 'Build', 'Browser tests']);
    expect(within(panel).getByRole('list', { name: 'Review findings' })).toHaveTextContent(
      'Non-blocking Consider an aria-pressed state on the button.',
    );
    expect(within(panel).getAllByText(/^Simulated screenshot/)).toHaveLength(2);
    expect(panel).toHaveTextContent('The merge policy would allow this merge.');
    expect(within(panel).queryByRole('list', { name: 'Merge blocked because' })).not.toBeInTheDocument();
  });

  it('shows merge and request-changes buttons, disabled with the reason until S07-02', () => {
    const { panel } = openPanel('review-and-qa-pass');
    for (const name of ['Merge', 'Request changes']) {
      expect(within(panel).getByRole('button', { name })).toBeDisabled();
      expect(within(panel).getByRole('button', { name })).toHaveAccessibleDescription('Merge and request changes arrive with S07-02.');
    }
  });
});

describe('pull-request panel, failing scenario', () => {
  it('shows the failed browser check with icon, word, and reason', () => {
    const { panel } = openPanel('qa-failure');
    expect(checks(panel)).toEqual(['Unit tests✓ Passed', 'Build✓ Passed', 'Browser tests✕ Failed']);
    expect(panel).toHaveTextContent(/Why it failed: /);
  });

  it('lists why merge is blocked before anyone clicks merge', () => {
    const { panel } = openPanel('qa-failure');
    const reasons = within(panel).getByRole('list', { name: 'Merge blocked because' });
    expect(reasons).toHaveTextContent('LN-2 must be in QA to merge.');
    expect(reasons).toHaveTextContent(/Browser tests failed/);
    expect(panel).not.toHaveTextContent('The merge policy would allow this merge.');
  });
});

describe('pull-request panel, other cases', () => {
  it('uses the wall screen pull request and the same status icons and words', () => {
    for (const scenario of ['review-and-qa-pass', 'qa-failure'] as const) {
      const { store, panel } = openPanel(scenario);
      const wall = qaDisplay(store.getState().snapshot);
      expect(wall.heading).toBe('PR #2 · Add-to-list button on article cards');
      expect(panel).toHaveTextContent('#2 Add-to-list button on article cards');
      const rows = within(within(panel).getByRole('list', { name: 'Checks' })).getAllByRole('listitem');
      wall.rows.forEach((row, i) => {
        const word = CHECK_STATUS[row.status];
        expect(rows[i]).toHaveTextContent(`${row.label}${word.icon} ${word.text}`);
      });
      act(() => {
        interactionStore.getState().close();
      });
      document.body.innerHTML = '';
    }
  });

  it('shows a merged pull request as blocked from merging again', () => {
    const { panel } = openPanel('agent-blocked'); // only the merged PR #1
    expect(panel).toHaveTextContent('#1');
    expect(panel).toHaveTextContent('Merge is blocked:');
    expect(panel).toHaveTextContent('Pull request #1 is already merged.');
  });

  it('says so when there are no pull requests', () => {
    const store = createWorkflowStore();
    store.setState({ snapshot: { ...store.getState().snapshot, pullRequests: [] } });
    render(
      <WorkflowProvider store={store}>
        <InteractionPanel />
      </WorkflowProvider>,
    );
    act(() => {
      interactionStore.getState().activate(QA_TARGET);
    });
    expect(screen.getByRole('dialog')).toHaveTextContent('No pull requests yet.');
  });

  it('lets you switch between pull requests', async () => {
    const user = userEvent.setup();
    const { panel } = openPanel('review-and-qa-pass');
    await user.click(within(panel).getByRole('button', { name: '#1 · merged' }));
    expect(panel).toHaveTextContent('#1 Reading list data model');
    expect(panel).toHaveTextContent('Pull request #1 is already merged.');
  });
});

describe('opening the QA screen from the 2D view', () => {
  it('the QA lab region, the QA lab zone, and the toolbar all open it', async () => {
    const user = userEvent.setup();
    const store = createWorkflowStore();
    store.getState().loadScenario('qa-failure');
    navigationStore.setState({ view: '2d' });
    render(
      <WorkflowProvider store={store}>
        <NavigationToolbar webgl />
        <TwoDView />
        <InteractionPanel />
      </WorkflowProvider>,
    );
    const lab = screen.getByRole('region', { name: 'QA lab' });
    expect(lab).toHaveTextContent('PR #2');
    expect(lab).toHaveTextContent('Browser tests ✕ Failed');

    await user.click(within(lab).getByRole('button', { name: 'Open QA screen' }));
    expect(screen.getByRole('dialog', { name: 'QA screen' })).toBeInTheDocument();
    act(() => {
      interactionStore.getState().close();
    });

    await user.click(within(screen.getByRole('region', { name: 'Zones' })).getByRole('button', { name: 'QA lab' }));
    expect(screen.getByRole('dialog', { name: 'QA screen' })).toBeInTheDocument();
    act(() => {
      interactionStore.getState().close();
    });

    await user.click(within(screen.getByRole('group', { name: 'Select zone' })).getByRole('button', { name: 'QA lab' }));
    expect(screen.getByRole('dialog', { name: 'QA screen' })).toBeInTheDocument();
  });
});
