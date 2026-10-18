import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../App.tsx';
import type { ShellEnvironment } from './environment.ts';

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
    expect(container.querySelector('[data-shell-status="ready"]')).not.toBeNull();
    expect(screen.getByRole('main')).toBeInTheDocument();

    const overlays = screen.getByTestId('overlay-root');
    expect(overlays).toBeEmptyDOMElement();
    expect(overlays).not.toHaveAttribute('tabindex');
    expect(screen.getByRole('main')).not.toContainElement(overlays);
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
