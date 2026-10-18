import type { ShellEnvironment } from './environment.ts';

export type ShellStatus = 'loading' | 'ready' | 'no-webgl' | 'error';

/** Status after boot finishes. `loading` is only the initial render. */
export type BootResult =
  | { status: 'ready' }
  | { status: 'no-webgl' }
  | { status: 'error'; message: string };

export const FORCED_ERROR_MESSAGE = 'The office could not start.';

/**
 * Test-only query flags:
 * - `?shell=error` forces the fatal error state on the first attempt.
 * - `?webgl=off` behaves as if WebGL is unavailable.
 */
export function bootShell(env: Pick<ShellEnvironment, 'search' | 'detectWebGL'>, attempt: number): BootResult {
  const params = new URLSearchParams(env.search);

  // Retry clears a forced error so the retry path can be exercised.
  if (params.get('shell') === 'error' && attempt === 0) {
    return { status: 'error', message: FORCED_ERROR_MESSAGE };
  }

  const webglAllowed = params.get('webgl') !== 'off';
  try {
    return webglAllowed && env.detectWebGL() ? { status: 'ready' } : { status: 'no-webgl' };
  } catch {
    return { status: 'no-webgl' };
  }
}
