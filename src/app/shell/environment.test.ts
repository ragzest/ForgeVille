import { describe, expect, it, vi } from 'vitest';
import { detectWebGL, prefersReducedMotion, replaceSearch, watchReducedMotion } from './environment.ts';

function fakeDocument(getContext: (id: string) => unknown): Document {
  return { createElement: () => ({ getContext }) } as unknown as Document;
}

describe('detectWebGL', () => {
  it('is true when a webgl2 context exists', () => {
    expect(detectWebGL(fakeDocument((id) => (id === 'webgl2' ? {} : null)))).toBe(true);
  });

  it('falls back to webgl1', () => {
    expect(detectWebGL(fakeDocument((id) => (id === 'webgl' ? {} : null)))).toBe(true);
  });

  it('is false when no context can be created', () => {
    expect(detectWebGL(fakeDocument(() => null))).toBe(false);
  });

  it('is false when getContext throws', () => {
    expect(
      detectWebGL(
        fakeDocument(() => {
          throw new Error('blocked');
        }),
      ),
    ).toBe(false);
  });
});

describe('prefersReducedMotion', () => {
  it('reads the media query', () => {
    const matchMedia = vi.fn(() => ({ matches: true }));
    expect(prefersReducedMotion({ matchMedia } as unknown as Window)).toBe(true);
    expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  });

  it('is false when matchMedia is missing', () => {
    expect(prefersReducedMotion({} as unknown as Window)).toBe(false);
  });
});

describe('watchReducedMotion', () => {
  it('reports changes to the media query until unsubscribed', () => {
    const query = {
      addEventListener: vi.fn<(type: string, listener: (event: { matches: boolean }) => void) => void>(),
      removeEventListener: vi.fn(),
    };
    const onChange = vi.fn();
    const stop = watchReducedMotion(onChange, { matchMedia: () => query } as unknown as Window);
    const [type, listener] = query.addEventListener.mock.calls[0] ?? [];
    expect(type).toBe('change');
    listener?.({ matches: true });
    expect(onChange).toHaveBeenCalledWith(true);
    stop();
    expect(query.removeEventListener).toHaveBeenCalledWith('change', listener);
  });

  it('is a no-op when matchMedia is missing', () => {
    expect(() => {
      watchReducedMotion(() => undefined, {} as unknown as Window)();
    }).not.toThrow();
  });
});

describe('replaceSearch', () => {
  it('swaps the query string in place, keeping the path, hash, and history state', () => {
    const replaceState = vi.fn();
    const win = { location: { pathname: '/office', hash: '#top' }, history: { state: { n: 1 }, replaceState } };
    replaceSearch('?scenario=qa-failure', win as unknown as Window);
    expect(replaceState).toHaveBeenCalledWith({ n: 1 }, '', '/office?scenario=qa-failure#top');
  });
});
