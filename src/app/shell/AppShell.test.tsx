import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { OfficeCanvasProps } from '../../world/OfficeCanvas.tsx';
import { App } from '../App.tsx';
import type { ShellEnvironment } from './environment.ts';

// jsdom has no WebGL, so the 3D canvas is replaced by a stand-in whose behaviour each test picks.
const canvas = vi.hoisted((): { behaviour: 'ready' | 'pending' | 'crash' } => ({ behaviour: 'ready' }));

vi.mock('../../world/OfficeCanvas.tsx', () => {
  function FakeCanvas({ onReady }: OfficeCanvasProps) {
    if (canvas.behaviour === 'crash') throw new Error('WebGL context lost');
    useEffect(() => {
      if (canvas.behaviour === 'ready') onReady();
    }, [onReady]);
    return <div data-testid="fake-canvas" />;
  }
  return { default: FakeCanvas, OfficeCanvas: FakeCanvas };
});

afterEach(() => {
  canvas.behaviour = 'ready';
});

function env(overrides: Partial<ShellEnvironment> = {}): ShellEnvironment {
  return {
    search: '',
    detectWebGL: () => true,
    prefersReducedMotion: () => false,
    ...overrides,
  };
}

describe('AppShell', () => {
  it('shows a loading state on the initial render', () => {
    const html = renderToStaticMarkup(<App environment={env()} />);
    expect(html).toContain('data-shell-status="loading"');
    expect(html).toContain('Starting ForgeVille');
  });

  it('becomes ready with a main landmark and an empty overlay container', async () => {
    const { container } = render(<App environment={env()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Starting ForgeVille');
    expect(await screen.findByRole('region', { name: 'Office' })).toBeInTheDocument();
    await waitFor(() => {
      expect(container.querySelector('[data-shell-status="ready"]')).not.toBeNull();
    });
    expect(screen.getByTestId('fake-canvas')).toBeInTheDocument();
    expect(screen.queryByText('Starting ForgeVille…')).not.toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();

    const overlays = screen.getByTestId('overlay-root');
    expect(overlays).toBeEmptyDOMElement();
    expect(overlays).not.toHaveAttribute('tabindex');
    expect(screen.getByRole('main')).not.toContainElement(overlays);
  });

  it('keeps the loading state until the canvas has mounted', async () => {
    canvas.behaviour = 'pending';
    const { container } = render(<App environment={env()} />);

    expect(await screen.findByTestId('fake-canvas')).toBeInTheDocument();
    expect(container.querySelector('[data-shell-status="loading"]')).not.toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Starting ForgeVille');
  });

  it('turns a canvas crash into the error state, and retry boots again', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined); // React logs the caught error
    canvas.behaviour = 'crash';
    const user = userEvent.setup();
    const { container } = render(<App environment={env()} />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('The 3D office stopped: WebGL context lost');

    canvas.behaviour = 'ready';
    await user.click(within(alert).getByRole('button', { name: 'Retry' }));
    await waitFor(() => {
      expect(container.querySelector('[data-shell-status="ready"]')).not.toBeNull();
    });
  });

  it('shows the forced error and recovers on retry', async () => {
    const user = userEvent.setup();
    render(<App environment={env({ search: '?shell=error' })} />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('The office could not start.');

    await user.click(within(alert).getByRole('button', { name: 'Retry' }));

    expect(await screen.findByRole('region', { name: 'Office' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the no-WebGL message with Team and Board regions', async () => {
    render(<App environment={env({ detectWebGL: () => false })} />);
    expect(await screen.findByRole('heading', { name: 'The 3D office cannot start' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Team' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Board' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Office' })).not.toBeInTheDocument();
  });

  it('reads the reduced-motion preference once and exposes it', async () => {
    const user = userEvent.setup();
    const prefersReducedMotion = vi.fn(() => true);
    const { container } = render(<App environment={env({ search: '?shell=error', prefersReducedMotion })} />);

    await user.click(await screen.findByRole('button', { name: 'Retry' }));
    await screen.findByRole('region', { name: 'Office' });

    expect(container.querySelector('[data-reduced-motion="true"]')).not.toBeNull();
    expect(prefersReducedMotion).toHaveBeenCalledTimes(1);
  });
});
