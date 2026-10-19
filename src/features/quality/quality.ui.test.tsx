import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { qualityStore } from '../../store/quality.ts';
import { QUALITY_STORAGE_KEY } from '../../world/quality.ts';
import { QualityMenu } from './QualityMenu.tsx';
import { QualityToast, TOAST_MS } from './QualityToast.tsx';

beforeEach(() => {
  localStorage.clear();
  qualityStore.setState({ setting: 'medium', autoTier: 'high', notice: null });
});

describe('graphics settings popover', () => {
  it('shows the current tier and opens a popover with Auto and the three tiers', async () => {
    const user = userEvent.setup();
    render(<QualityMenu />);
    const button = screen.getByRole('button', { name: 'Graphics: Medium' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    const popover = screen.getByRole('dialog', { name: 'Graphics settings' });
    const options = within(popover).getAllByRole('radio');
    expect(options.map((o) => (o as HTMLInputElement).value)).toEqual(['auto', 'low', 'medium', 'high']);
    expect(within(popover).getByRole('radio', { name: /^Medium/ })).toBeChecked();
  });

  it('applies a choice at once and keeps it in localStorage', async () => {
    const user = userEvent.setup();
    render(<QualityMenu />);
    await user.click(screen.getByRole('button', { name: 'Graphics: Medium' }));
    await user.click(screen.getByRole('radio', { name: /^Low/ }));
    expect(qualityStore.getState().setting).toBe('low');
    expect(localStorage.getItem(QUALITY_STORAGE_KEY)).toBe('low');
    expect(screen.getByRole('button', { name: 'Graphics: Low' })).toBeInTheDocument();
  });

  it('on Auto, names the tier Auto is using', async () => {
    const user = userEvent.setup();
    render(<QualityMenu />);
    await user.click(screen.getByRole('button', { name: 'Graphics: Medium' }));
    await user.click(screen.getByRole('radio', { name: /^Auto/ }));
    expect(screen.getByRole('button', { name: 'Graphics: Auto · High' })).toBeInTheDocument();
    act(() => {
      qualityStore.getState().dropAutoTier();
    });
    expect(screen.getByRole('button', { name: 'Graphics: Auto · Medium' })).toBeInTheDocument();
  });

  it('closes on Escape, returning focus to the button, and on a click elsewhere', async () => {
    const user = userEvent.setup();
    render(
      <>
        <QualityMenu />
        <p>Elsewhere</p>
      </>,
    );
    const button = screen.getByRole('button', { name: 'Graphics: Medium' });
    await user.click(button);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(button).toHaveFocus();
    await user.click(button);
    await user.click(screen.getByText('Elsewhere'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('Auto drop toast', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('says so politely when Auto drops a tier, then goes away by itself', () => {
    vi.useFakeTimers();
    qualityStore.getState().setSetting('auto');
    render(<QualityToast />);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toBeEmptyDOMElement();
    act(() => {
      qualityStore.getState().dropAutoTier();
    });
    expect(region).toHaveTextContent('Auto dropped graphics to Medium');
    act(() => {
      vi.advanceTimersByTime(TOAST_MS);
    });
    expect(region).toBeEmptyDOMElement();
  });

  it('can be dismissed', async () => {
    const user = userEvent.setup();
    qualityStore.getState().setSetting('auto');
    render(<QualityToast />);
    act(() => {
      qualityStore.getState().dropAutoTier();
    });
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
});
