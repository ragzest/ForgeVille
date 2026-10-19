import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INITIAL_INTERACTION, interactionStore } from '../../store/interaction.ts';
import { InteractHint } from './InteractHint.tsx';
import { InteractionPanel } from './InteractionPanel.tsx';
import { useInteractionKeys } from './useInteractionKeys.ts';

function Harness() {
  useInteractionKeys();
  return (
    <>
      <InteractHint />
      <InteractionPanel />
      <input aria-label="Notes" />
    </>
  );
}

const board = { id: 'reception', label: 'Reception' };

function setLocked(el: Element | null) {
  Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => el });
  act(() => {
    document.dispatchEvent(new Event('pointerlockchange'));
  });
}

beforeEach(() => {
  interactionStore.setState(INITIAL_INTERACTION);
});

afterEach(() => {
  Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => null });
});

describe('interaction UI', () => {
  it('shows the hint with E and the label only when something is in reach', () => {
    render(<Harness />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    act(() => {
      interactionStore.getState().setFocused(board);
    });
    const hint = screen.getByRole('status');
    expect(hint).toHaveTextContent('E');
    expect(hint).toHaveTextContent('Reception');

    act(() => {
      interactionStore.getState().setFocused(null);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('E opens a placeholder panel with the object id, and the close button closes it', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    act(() => {
      interactionStore.getState().setFocused(board);
    });

    await user.keyboard('e');
    const panel = screen.getByRole('dialog', { name: 'Reception' });
    expect(panel).toHaveTextContent('reception');
    expect(screen.queryByRole('status')).not.toBeInTheDocument(); // hint hides while open

    await user.click(screen.getByRole('button', { name: 'Close panel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('E does nothing with no target, or while typing', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.keyboard('e');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    act(() => {
      interactionStore.getState().setFocused(board);
    });
    await user.click(screen.getByLabelText('Notes'));
    await user.keyboard('e');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Notes')).toHaveValue('e');
  });

  it('Escape closes the panel when the pointer is not locked', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    act(() => {
      interactionStore.getState().activate(board);
    });
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('the first Escape only unlocks; the next one closes', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    act(() => {
      interactionStore.getState().activate(board);
    });

    setLocked(document.body);
    await user.keyboard('{Escape}'); // the browser would unlock here
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    setLocked(null); // unlock lands just after
    await user.keyboard('{Escape}'); // same press, delivered late
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await new Promise((r) => setTimeout(r, 300));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
