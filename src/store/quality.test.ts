import { describe, expect, it } from 'vitest';
import { QUALITY_STORAGE_KEY, type KeyValueStorage } from '../world/quality.ts';
import { createQualityStore, effectiveTier } from './quality.ts';

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

describe('quality store', () => {
  it('starts on Medium, or on the stored setting', () => {
    expect(effectiveTier(createQualityStore(memoryStorage()).getState())).toBe('medium');
    expect(createQualityStore(memoryStorage({ [QUALITY_STORAGE_KEY]: 'low' })).getState().setting).toBe('low');
  });

  it('keeps the chosen setting in storage', () => {
    const storage = memoryStorage();
    const store = createQualityStore(storage);
    store.getState().setSetting('high');
    expect(storage.data[QUALITY_STORAGE_KEY]).toBe('high');
    expect(effectiveTier(store.getState())).toBe('high');
  });

  it('on Auto, starts on High and drops one tier per slow spell, with a notice', () => {
    const store = createQualityStore(memoryStorage());
    store.getState().setSetting('auto');
    expect(effectiveTier(store.getState())).toBe('high');

    store.getState().dropAutoTier();
    expect(effectiveTier(store.getState())).toBe('medium');
    expect(store.getState().notice?.message).toBe('The office was running slowly, so Auto dropped graphics to Medium.');

    store.getState().dropAutoTier();
    expect(effectiveTier(store.getState())).toBe('low');
    const seq = store.getState().notice?.seq;

    // Nothing below Low, and no new notice.
    store.getState().dropAutoTier();
    expect(effectiveTier(store.getState())).toBe('low');
    expect(store.getState().notice?.seq).toBe(seq);

    store.getState().dismissNotice();
    expect(store.getState().notice).toBeNull();
  });

  it('never drops a tier the visitor picked by hand', () => {
    const store = createQualityStore(memoryStorage());
    store.getState().setSetting('high');
    store.getState().dropAutoTier();
    expect(effectiveTier(store.getState())).toBe('high');
    expect(store.getState().notice).toBeNull();
  });

  it('starts Auto from the top again when it is chosen again', () => {
    const store = createQualityStore(memoryStorage());
    store.getState().setSetting('auto');
    store.getState().dropAutoTier();
    store.getState().setSetting('medium');
    store.getState().setSetting('auto');
    expect(effectiveTier(store.getState())).toBe('high');
    expect(store.getState().notice).toBeNull();
  });
});
