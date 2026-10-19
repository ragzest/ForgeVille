/**
 * Graphics quality tiers. Presentation only: a tier changes how the office is
 * drawn, never what it shows. The visitor picks Low, Medium, High, or Auto;
 * Auto starts on High and steps down one tier at a time while the frame rate
 * stays low.
 */

export type QualityTier = 'low' | 'medium' | 'high';
export type QualitySetting = QualityTier | 'auto';

export const QUALITY_TIERS: readonly QualityTier[] = ['low', 'medium', 'high'];
export const QUALITY_SETTINGS: readonly QualitySetting[] = ['auto', 'low', 'medium', 'high'];

/** Medium is today's look, so a first visit changes nothing. */
export const DEFAULT_QUALITY: QualitySetting = 'medium';
/** Where Auto starts before it has measured anything. */
export const AUTO_START: QualityTier = 'high';

export const QUALITY_LABELS: Readonly<Record<QualitySetting, string>> = {
  auto: 'Auto',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export const QUALITY_HINTS: Readonly<Record<QualitySetting, string>> = {
  auto: 'Starts on High and steps down if the office gets choppy',
  low: 'Fewer outlines, softer shadows, standard pixel density',
  medium: 'The usual look',
  high: 'Screens and lamps glow softly',
};

export interface TierRules {
  /** Ink outlines on small props (mugs, books, monitor stands). */
  readonly smallPropOutlines: boolean;
  /** Sun shadow map size, in texels per side. */
  readonly shadowMapSize: number;
  /** Device pixel ratio: fixed, or a [min, max] range. */
  readonly dpr: number | readonly [number, number];
  /** Selective glow on screens and lamps. */
  readonly glow: boolean;
}

export const TIER_RULES: Readonly<Record<QualityTier, TierRules>> = {
  low: { smallPropOutlines: false, shadowMapSize: 1024, dpr: 1, glow: false },
  medium: { smallPropOutlines: true, shadowMapSize: 2048, dpr: [1, 2], glow: false },
  high: { smallPropOutlines: true, shadowMapSize: 2048, dpr: [1, 2], glow: true },
};

/** One tier down, or null when already on Low. */
export function lowerTier(tier: QualityTier): QualityTier | null {
  const i = QUALITY_TIERS.indexOf(tier);
  return i > 0 ? (QUALITY_TIERS[i - 1] ?? null) : null;
}

export function isQualitySetting(value: unknown): value is QualitySetting {
  return typeof value === 'string' && (QUALITY_SETTINGS as readonly string[]).includes(value);
}

/** A part counts as a small prop when its longest side is under this many metres. */
export const SMALL_PROP_SIZE = 0.35;

/** Whether a mesh of this (local) scale is a small prop. */
export function isSmallProp(scale: readonly [number, number, number]): boolean {
  return Math.max(Math.abs(scale[0]), Math.abs(scale[1]), Math.abs(scale[2])) < SMALL_PROP_SIZE;
}

// ---------------------------------------------------------------------------
// Persistence. Storage can be missing or throw (private windows, blocked site
// data); the setting then simply lasts for this visit.

export const QUALITY_STORAGE_KEY = 'forgeville.quality';

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function readQualitySetting(storage: KeyValueStorage | null | undefined): QualitySetting {
  try {
    const stored = storage?.getItem(QUALITY_STORAGE_KEY);
    return isQualitySetting(stored) ? stored : DEFAULT_QUALITY;
  } catch {
    return DEFAULT_QUALITY;
  }
}

export function writeQualitySetting(storage: KeyValueStorage | null | undefined, setting: QualitySetting): void {
  try {
    storage?.setItem(QUALITY_STORAGE_KEY, setting);
  } catch {
    // Kept in memory only.
  }
}

// ---------------------------------------------------------------------------
// Auto: watch the frame rate.

export const AUTO_MIN_FPS = 45;
export const AUTO_LOW_SECONDS = 3;
/** Frame rate is measured over windows this long, so one slow frame does not count. */
const SAMPLE_SECONDS = 0.5;
/** Longer gaps mean the tab was hidden or the page was busy loading; they reset the watch. */
const MAX_FRAME_SECONDS = 1;

export interface FrameRateWatch {
  /**
   * Feed one frame's duration in seconds. Returns true when the frame rate
   * has stayed under the threshold for long enough; the watch then starts over.
   */
  frame(delta: number): boolean;
  reset(): void;
}

export function createFrameRateWatch(minFps = AUTO_MIN_FPS, lowSeconds = AUTO_LOW_SECONDS): FrameRateWatch {
  let sampleTime = 0;
  let sampleFrames = 0;
  let lowFor = 0;
  const reset = () => {
    sampleTime = 0;
    sampleFrames = 0;
    lowFor = 0;
  };
  return {
    reset,
    frame(delta) {
      if (!(delta > 0) || delta > MAX_FRAME_SECONDS) {
        reset();
        return false;
      }
      sampleTime += delta;
      sampleFrames += 1;
      if (sampleTime < SAMPLE_SECONDS) return false;
      const fps = sampleFrames / sampleTime;
      if (fps < minFps) lowFor += sampleTime;
      else lowFor = 0;
      sampleTime = 0;
      sampleFrames = 0;
      if (lowFor >= lowSeconds) {
        lowFor = 0;
        return true;
      }
      return false;
    },
  };
}

// ---------------------------------------------------------------------------
// Monitor repaints, throttled by distance from the camera.

/** Monitors farther than this keep their last picture until the camera comes closer. */
export const REPAINT_MAX_DISTANCE = 16;
/** Closer than this, a monitor repaints as soon as its model changes. */
const REPAINT_NEAR = 6;
/** The longest wait, just inside the cut-off. */
const REPAINT_SLOWEST = 2;

/** Seconds a monitor waits before repainting a changed screen; Infinity means not at all. */
export function repaintDelay(distance: number): number {
  if (distance > REPAINT_MAX_DISTANCE) return Infinity;
  if (distance <= REPAINT_NEAR) return 0;
  return ((distance - REPAINT_NEAR) / (REPAINT_MAX_DISTANCE - REPAINT_NEAR)) * REPAINT_SLOWEST;
}

/** `?debug=perf` turns on the frame-time readout (dev builds only). */
export function wantsPerfReadout(search: string): boolean {
  return new URLSearchParams(search).getAll('debug').some((v) => v.split(',').includes('perf'));
}
