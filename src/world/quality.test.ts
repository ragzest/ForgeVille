import { describe, expect, it } from 'vitest';
import {
  DEFAULT_QUALITY,
  QUALITY_STORAGE_KEY,
  REPAINT_MAX_DISTANCE,
  TIER_RULES,
  createFrameRateWatch,
  isSmallProp,
  lowerTier,
  readQualitySetting,
  repaintDelay,
  wantsPerfReadout,
  writeQualitySetting,
  type KeyValueStorage,
} from './quality.ts';

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

const throwing: KeyValueStorage = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
};

/** Feeds `seconds` worth of frames at `fps`; true if the watch fired at any point. */
function run(watch: ReturnType<typeof createFrameRateWatch>, fps: number, seconds: number): boolean {
  let fired = false;
  for (let t = 0; t < seconds * fps; t++) fired = watch.frame(1 / fps) || fired;
  return fired;
}

describe('tiers', () => {
  it('match the story: Low trims, Medium is today, High adds glow', () => {
    expect(TIER_RULES.low).toEqual({ smallPropOutlines: false, shadowMapSize: 1024, dpr: 1, glow: false });
    expect(TIER_RULES.medium).toEqual({ smallPropOutlines: true, shadowMapSize: 2048, dpr: [1, 2], glow: false });
    expect(TIER_RULES.high.glow).toBe(true);
    expect(DEFAULT_QUALITY).toBe('medium');
  });

  it('step down one at a time and stop at Low', () => {
    expect(lowerTier('high')).toBe('medium');
    expect(lowerTier('medium')).toBe('low');
    expect(lowerTier('low')).toBeNull();
  });

  it('count a part as a small prop by its longest side', () => {
    expect(isSmallProp([0.09, 0.12, 0.09])).toBe(true); // a mug
    expect(isSmallProp([0.26, 0.04, 0.18])).toBe(true); // a book
    expect(isSmallProp([0.46, 0.03, 0.15])).toBe(false); // a keyboard
    expect(isSmallProp([1.6, 0.06, 0.8])).toBe(false); // a desk top
  });
});

describe('the stored setting', () => {
  it('defaults to Medium and reads back what was written', () => {
    const storage = memoryStorage();
    expect(readQualitySetting(storage)).toBe('medium');
    writeQualitySetting(storage, 'high');
    expect(storage.data[QUALITY_STORAGE_KEY]).toBe('high');
    expect(readQualitySetting(storage)).toBe('high');
  });

  it('ignores junk and survives storage that throws or is missing', () => {
    expect(readQualitySetting(memoryStorage({ [QUALITY_STORAGE_KEY]: 'ultra' }))).toBe('medium');
    expect(readQualitySetting(throwing)).toBe('medium');
    expect(readQualitySetting(null)).toBe('medium');
    expect(() => {
      writeQualitySetting(throwing, 'low');
    }).not.toThrow();
  });
});

describe('the Auto frame-rate watch', () => {
  it('fires after 3 seconds under 45 fps', () => {
    const watch = createFrameRateWatch();
    expect(run(watch, 30, 2.4)).toBe(false);
    expect(run(watch, 30, 1)).toBe(true);
  });

  it('never fires at a healthy frame rate', () => {
    expect(run(createFrameRateWatch(), 60, 20)).toBe(false);
    expect(run(createFrameRateWatch(), 46, 20)).toBe(false);
  });

  it('starts over when the frame rate recovers, and after it fires', () => {
    const watch = createFrameRateWatch();
    expect(run(watch, 30, 2.5)).toBe(false);
    expect(run(watch, 60, 1)).toBe(false);
    expect(run(watch, 30, 2.5)).toBe(false);
    expect(run(watch, 30, 1)).toBe(true);
    // Fired, so the next drop needs another 3 seconds.
    expect(run(watch, 30, 2.4)).toBe(false);
  });

  it('treats a long gap (hidden tab, loading) as a fresh start', () => {
    const watch = createFrameRateWatch();
    expect(run(watch, 30, 2.5)).toBe(false);
    expect(watch.frame(4)).toBe(false);
    expect(run(watch, 30, 2.5)).toBe(false);
  });
});

describe('monitor repaints', () => {
  it('are immediate up close, slower further away, and stop beyond 16 m', () => {
    expect(repaintDelay(2)).toBe(0);
    expect(repaintDelay(6)).toBe(0);
    expect(repaintDelay(10)).toBeGreaterThan(0);
    expect(repaintDelay(14)).toBeGreaterThan(repaintDelay(10));
    expect(repaintDelay(REPAINT_MAX_DISTANCE)).toBeLessThan(Infinity);
    expect(repaintDelay(16.01)).toBe(Infinity);
    expect(repaintDelay(40)).toBe(Infinity);
  });
});

describe('?debug=perf', () => {
  it('is read from the query string', () => {
    expect(wantsPerfReadout('?debug=perf')).toBe(true);
    expect(wantsPerfReadout('?scenario=qa-failure&debug=perf')).toBe(true);
    expect(wantsPerfReadout('?debug=other,perf')).toBe(true);
    expect(wantsPerfReadout('?debug=performance')).toBe(false);
    expect(wantsPerfReadout('')).toBe(false);
  });
});
