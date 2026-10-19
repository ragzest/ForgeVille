import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../app/App.tsx';
import type { ShellEnvironment } from '../../app/shell/environment.ts';
import { SCENARIOS } from '../../services/mock/index.ts';
import { INITIAL_INTERACTION, interactionStore } from '../../store/interaction.ts';
import { INITIAL_NAVIGATION, navigationStore } from '../../store/navigation.ts';
import type { OfficeCanvasProps } from '../../world/OfficeCanvas.tsx';
import { BOARD_TARGET } from '../board/openBoard.ts';
import { QA_TARGET } from '../qa/openQa.ts';

// jsdom has no WebGL: a stand-in canvas reports ready straight away.
vi.mock('../../world/OfficeCanvas.tsx', () => {
  function FakeCanvas({ onReady }: OfficeCanvasProps) {
    useEffect(() => {
      onReady();
    }, [onReady]);
    return <div data-testid="fake-canvas" />;
  }
  return { default: FakeCanvas, OfficeCanvas: FakeCanvas };
});

function startApp(search: string) {
  const replaceSearch = vi.fn<(search: string) => void>();
  const environment: ShellEnvironment = {
    search,
    detectWebGL: () => true,
    prefersReducedMotion: () => false,
    replaceSearch,
  };
  const view = render(<App environment={environment} />);
  return { ...view, replaceSearch };
}

async function whenReady(container: HTMLElement) {
  await waitFor(() => {
    expect(container.querySelector('[data-shell-status="ready"]')).not.toBeNull();
  });
}

const switcher = () => screen.getByRole('combobox', { name: 'Scenario' });

beforeEach(() => {
  Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => null });
  interactionStore.setState(INITIAL_INTERACTION);
  navigationStore.setState(INITIAL_NAVIGATION);
});

afterEach(() => {
  interactionStore.setState(INITIAL_INTERACTION);
  navigationStore.setState(INITIAL_NAVIGATION);
});

describe('scenario switcher', () => {
  it('lists the five scenarios by name and shows the one from the URL', async () => {
    const { container } = startApp('?scenario=agent-blocked');
    await whenReady(container);
    const options = within(switcher()).getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(SCENARIOS.map((s) => s.title));
    expect(switcher()).toHaveValue('agent-blocked');
  });

  it('deep-links the failing scenario: the QA panel names the failed check', async () => {
    const { container } = startApp('?scenario=qa-failure');
    await whenReady(container);
    act(() => {
      interactionStore.getState().activate(QA_TARGET);
    });
    const panel = screen.getByRole('dialog', { name: 'QA screen' });
    expect(within(panel).getByRole('list', { name: 'Merge blocked because' })).toHaveTextContent('Browser tests failed');
  });

  it('switching loads the scenario, rewrites the URL, and keeps the floor', async () => {
    const user = userEvent.setup();
    const { container, replaceSearch } = startApp('?shell=ok&scenario=review-and-qa-pass');
    await whenReady(container);
    act(() => {
      navigationStore.getState().goToFloor('greenhouse');
    });

    await user.selectOptions(switcher(), 'Successful merge');

    expect(switcher()).toHaveValue('successful-merge');
    expect(replaceSearch).toHaveBeenLastCalledWith('?shell=ok&scenario=successful-merge');
    expect(navigationStore.getState().floor).toBe('greenhouse');
  });

  it('an open QA panel repaints from the new snapshot and drops its old message', async () => {
    const user = userEvent.setup();
    const { container } = startApp('?scenario=review-and-qa-pass');
    await whenReady(container);
    act(() => {
      interactionStore.getState().activate(QA_TARGET);
    });
    let panel = screen.getByRole('dialog', { name: 'QA screen' });
    await user.click(within(panel).getByRole('button', { name: 'Merge' }));
    expect(within(panel).getByRole('status')).toHaveTextContent('merged');

    await user.selectOptions(switcher(), 'QA failure');

    panel = screen.getByRole('dialog', { name: 'QA screen' });
    expect(within(panel).queryByRole('status')).not.toBeInTheDocument();
    expect(within(panel).getByRole('list', { name: 'Checks' })).toHaveTextContent('Browser tests✕ Failed');
  });

  it('an open board shows the new scenario, with no copy of the old tasks', async () => {
    const user = userEvent.setup();
    const { container } = startApp('?scenario=feature-in-progress');
    await whenReady(container);
    act(() => {
      interactionStore.getState().activate(BOARD_TARGET);
    });
    const blocked = () =>
      within(screen.getByRole('dialog', { name: BOARD_TARGET.label })).getByRole('region', { name: /^Blocked ·/ });
    expect(within(blocked()).queryByRole('button', { name: /LN-4/ })).not.toBeInTheDocument();

    await user.selectOptions(switcher(), 'Agent blocked');

    expect(within(blocked()).getByRole('button', { name: /LN-4/ })).toBeInTheDocument();
  });
});

describe('unknown scenario id', () => {
  it('falls back to the default scenario and shows a dismissible notice', async () => {
    const user = userEvent.setup();
    const { container } = startApp('?scenario=nope');
    await whenReady(container);
    const notice = screen.getByTestId('scenario-notice');
    expect(notice).toHaveTextContent('There is no scenario called nope. Showing Feature in progress instead.');
    expect(switcher()).toHaveValue('feature-in-progress');
    expect(notice).not.toContainElement(document.activeElement as HTMLElement);

    await user.click(within(notice).getByRole('button', { name: 'Dismiss notice' }));
    expect(screen.queryByText(/There is no scenario called/)).not.toBeInTheDocument();
  });

  it('clears the notice once the user picks a scenario', async () => {
    const user = userEvent.setup();
    const { container } = startApp('?scenario=nope');
    await whenReady(container);
    await user.selectOptions(switcher(), 'QA failure');
    expect(screen.queryByText(/There is no scenario called/)).not.toBeInTheDocument();
  });
});
