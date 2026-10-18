import { describe, expect, it } from 'vitest';
import { bootShell, FORCED_ERROR_MESSAGE } from './boot.ts';

const withWebGL = (search: string, webgl = true) => ({ search, detectWebGL: () => webgl });

describe('bootShell', () => {
  it('is ready when WebGL is available', () => {
    expect(bootShell(withWebGL(''), 0)).toEqual({ status: 'ready' });
  });

  it('falls back to 2D when WebGL is unavailable', () => {
    expect(bootShell(withWebGL('', false), 0)).toEqual({ status: 'no-webgl' });
  });

  it('falls back to 2D when detection throws', () => {
    const env = {
      search: '',
      detectWebGL: () => {
        throw new Error('boom');
      },
    };
    expect(bootShell(env, 0)).toEqual({ status: 'no-webgl' });
  });

  it('honours ?webgl=off even when WebGL works', () => {
    expect(bootShell(withWebGL('?webgl=off'), 0)).toEqual({ status: 'no-webgl' });
  });

  it('forces an error on the first attempt with ?shell=error', () => {
    expect(bootShell(withWebGL('?shell=error'), 0)).toEqual({ status: 'error', message: FORCED_ERROR_MESSAGE });
  });

  it('lets a retry past the forced error', () => {
    expect(bootShell(withWebGL('?shell=error'), 1)).toEqual({ status: 'ready' });
  });
});
