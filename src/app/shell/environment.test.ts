import { describe, expect, it, vi } from 'vitest';
import { detectWebGL, prefersReducedMotion } from './environment.ts';

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
