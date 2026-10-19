import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { isCelebrating, presenceOf, type ScenarioId } from '../../domain/index.ts';
import { INITIAL_INTERACTION, interactionStore } from '../../store/interaction.ts';
import { INITIAL_NAVIGATION, navigationStore } from '../../store/navigation.ts';
import { WorkflowProvider } from '../../store/WorkflowProvider.tsx';
import { createWorkflowStore, type WorkflowStore } from '../../store/workflowStore.ts';
import { characterModels } from '../../world/characters/models.ts';
import { statusTiles } from '../../world/screens/displays.ts';
import { qaDisplay } from '../../world/screens/qa.ts';
import { InteractionPanel } from '../navigation/InteractionPanel.tsx';
import { QA_TARGET } from './openQa.ts';

function openPanel(scenario: ScenarioId): { store: WorkflowStore; panel: HTMLElement } {
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

const pr2 = (store: WorkflowStore) => store.getState().snapshot.pullRequests.find((p) => p.id === 'pr-2');
const ln2 = (store: WorkflowStore) => store.getState().snapshot.tasks.find((t) => t.id === 'task-ln-2');

beforeEach(() => {
  Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => null });
  interactionStore.setState(INITIAL_INTERACTION);
  navigationStore.setState(INITIAL_NAVIGATION);
});

describe('merge, passing scenario', () => {
  it('merges through the policy and updates the panel, task, events, wall, and status display', async () => {
    const user = userEvent.setup();
    const { store, panel } = openPanel('review-and-qa-pass');
    const mergesBefore = statusTiles(store.getState().snapshot).find((t) => t.label === 'Merged')?.value;
    const eventsBefore = store.getState().snapshot.events.length;

    await user.click(within(panel).getByRole('button', { name: 'Merge' }));

    expect(store.getState().lastResult?.ok).toBe(true);
    expect(pr2(store)?.state).toBe('merged');
    expect(ln2(store)?.column).toBe('merged');
    const snapshot = store.getState().snapshot;
    expect(snapshot.events).toHaveLength(eventsBefore + 1);
    expect(snapshot.events.at(-1)?.type).toBe('pull_request_merged');

    expect(within(panel).getByRole('status')).toHaveTextContent('Pull request #2 merged; LN-2 is done.');
    expect(panel).toHaveTextContent('StateMerged');
    expect(panel).toHaveTextContent('LN-2 · Merged');

    // The QA wall and status display read the same snapshot.
    expect(qaDisplay(snapshot).heading).toBe('PR #2 · Add-to-list button on article cards (merged)');
    expect(Number(statusTiles(snapshot).find((t) => t.label === 'Merged')?.value)).toBe(Number(mergesBefore) + 1);
  });

  it("shows the author's existing celebration", async () => {
    const user = userEvent.setup();
    const { store, panel } = openPanel('review-and-qa-pass');
    await user.click(within(panel).getByRole('button', { name: 'Merge' }));

    const snapshot = store.getState().snapshot;
    expect(isCelebrating(snapshot, 'agent-ada')).toBe(true);
    const ada = characterModels(snapshot, false).find((c) => c.agentId === 'agent-ada');
    expect(ada?.look.mark).toBe('star');
    expect(ada?.look.label).toBe('Merged!');
    // Reduced motion keeps the star and label but drops the bounce.
    expect(characterModels(snapshot, true).find((c) => c.agentId === 'agent-ada')?.look.motion).toBe('none');
  });

  it('a second merge is refused with the reason', async () => {
    const user = userEvent.setup();
    const { store, panel } = openPanel('review-and-qa-pass');
    await user.click(within(panel).getByRole('button', { name: 'Merge' }));
    const after = store.getState().snapshot;

    await user.click(within(panel).getByRole('button', { name: 'Merge' }));
    expect(within(panel).getByRole('alert')).toHaveTextContent('Not merged:Pull request #2 is already merged.');
    expect(store.getState().snapshot).toBe(after);
  });
});

describe('merge, failing scenario', () => {
  it('stays reachable, says why it is blocked, and refuses with each reason', async () => {
    const user = userEvent.setup();
    const { store, panel } = openPanel('qa-failure');
    const before = store.getState().snapshot;
    const merge = within(panel).getByRole('button', { name: 'Merge' });
    expect(merge).toHaveAttribute('aria-disabled', 'true');
    expect(merge).toHaveAccessibleDescription(/LN-2 must be in QA to merge\..*Browser tests failed/);

    // Keyboard: tab to the button and press Enter.
    merge.focus();
    await user.keyboard('{Enter}');

    const alert = within(panel).getByRole('alert');
    expect(alert).toHaveTextContent('Not merged:');
    const reasons = within(alert).getAllByRole('listitem').map((li) => li.textContent);
    expect(reasons).toContain('LN-2 must be in QA to merge.');
    expect(reasons.some((r) => r.startsWith('Browser tests failed'))).toBe(true);
    expect(store.getState().snapshot).toBe(before);
    expect(pr2(store)?.state).toBe('open');
  });
});

describe('request changes', () => {
  it('adds a blocking finding and returns the task to In Progress', async () => {
    const user = userEvent.setup();
    const { store, panel } = openPanel('review-and-qa-pass');
    expect(ln2(store)?.column).toBe('qa');

    await user.click(within(panel).getByRole('button', { name: 'Request changes' }));

    expect(store.getState().lastResult?.ok).toBe(true);
    expect(ln2(store)?.column).toBe('in_progress');
    expect(within(panel).getByRole('status')).toHaveTextContent('Changes requested on Pull request #2: Reviewer requested changes.');
    const findings = within(panel).getByRole('list', { name: 'Review findings' });
    expect(findings).toHaveTextContent('Blocking Reviewer requested changes.');
    expect(panel).toHaveTextContent('✕ Changes requested');
    // Ada now owns the task again and is back at work.
    expect(presenceOf(store.getState().snapshot, 'agent-ada')).not.toBe('awaiting_review');
    // And the merge is now blocked by that finding.
    expect(within(panel).getByRole('list', { name: 'Merge blocked because' })).toHaveTextContent(
      'Unresolved blocking finding: Reviewer requested changes.',
    );
  });

  it('can turn an existing suggestion into a blocking finding', async () => {
    const user = userEvent.setup();
    const { panel } = openPanel('review-and-qa-pass');
    await user.click(within(panel).getByRole('button', { name: 'Make blocking' }));
    const findings = within(panel).getByRole('list', { name: 'Review findings' });
    expect(within(findings).getAllByRole('listitem')).toHaveLength(1);
    expect(findings).toHaveTextContent('Blocking Consider an aria-pressed state on the button.');
  });

  it('is refused on a merged pull request, with the reason shown up front', async () => {
    const user = userEvent.setup();
    const { store, panel } = openPanel('successful-merge');
    const before = store.getState().snapshot;
    const button = within(panel).getByRole('button', { name: 'Request changes' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAccessibleDescription('Request changes: Pull request #2 is merged.');

    await user.click(button);
    expect(within(panel).getByRole('alert')).toHaveTextContent('Pull request #2 is merged.');
    expect(store.getState().snapshot).toBe(before);
  });
});
