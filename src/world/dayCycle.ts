import type { Timestamp } from '../domain/index.ts';
import type { FloorTheme, SkySettings } from '../ui/themes.ts';

/**
 * "Follow the clock": the sky outside a floor follows the scenario clock
 * through five keyframes instead of holding the floor's signature mood.
 * Pure data, so it can be tested without WebGL. Reads the clock; never moves it.
 */

export type SkyPhase = 'night' | 'dawn' | 'noon' | 'golden-hour' | 'dusk';

export interface SkyKeyframe {
  readonly phase: SkyPhase;
  /** Hour of the day (UTC, like every clock in the demo) when this keyframe is exact. */
  readonly hour: number;
  readonly sky: SkySettings;
}

const NIGHT: SkySettings = {
  zenith: '#0d1638',
  horizon: '#2a3a78',
  fog: '#1d2850',
  fogNear: 25,
  fogFar: 75,
  sun: '#8fa6ff',
  sunIntensity: 0.5,
  sunPosition: [8, 14, -6],
  hemiSky: '#ffe2b8',
  hemiGround: '#3a3560',
  hemiIntensity: 1,
  ambient: 0.3,
  exposure: 1.1,
  stars: true,
  lampsOn: true,
  screenGlow: 0.6,
  sunPatch: 0,
  outdoorShade: 0.2,
};

/**
 * Night → dawn → noon → golden hour → dusk → night. Night holds from 22:00
 * to 04:30 so the small hours stay dark.
 */
export const SKY_KEYFRAMES: readonly SkyKeyframe[] = [
  { phase: 'night', hour: 4.5, sky: NIGHT },
  {
    phase: 'dawn',
    hour: 7,
    sky: {
      zenith: '#7fb2e8',
      horizon: '#ffc9a8',
      fog: '#f3d9c8',
      fogNear: 28,
      fogFar: 85,
      sun: '#ffd2a8',
      sunIntensity: 1.2,
      sunPosition: [15, 5, 9],
      hemiSky: '#fff0e0',
      hemiGround: '#8a7462',
      hemiIntensity: 0.9,
      ambient: 0.2,
      exposure: 1,
      stars: false,
      lampsOn: false,
      screenGlow: 0.3,
      sunPatch: 0.26,
      outdoorShade: 0.85,
    },
  },
  {
    phase: 'noon',
    hour: 12.5,
    sky: {
      zenith: '#5fb8f2',
      horizon: '#d6f0ff',
      fog: '#e8f4ee',
      fogNear: 35,
      fogFar: 100,
      sun: '#ffffff',
      sunIntensity: 1.7,
      sunPosition: [4, 20, 9],
      hemiSky: '#f4fff6',
      hemiGround: '#8a9a6a',
      hemiIntensity: 1,
      ambient: 0.2,
      exposure: 1.02,
      stars: false,
      lampsOn: false,
      screenGlow: 0.2,
      sunPatch: 0.28,
      outdoorShade: 1,
    },
  },
  {
    phase: 'golden-hour',
    hour: 17.5,
    sky: {
      zenith: '#3b4a8c',
      horizon: '#ff9a6a',
      fog: '#f0a77e',
      fogNear: 30,
      fogFar: 85,
      sun: '#ffab73',
      sunIntensity: 1.45,
      sunPosition: [-12, 8, 9],
      hemiSky: '#ffd8b8',
      hemiGround: '#6a4a3a',
      hemiIntensity: 0.95,
      ambient: 0.22,
      exposure: 1,
      stars: false,
      lampsOn: true,
      screenGlow: 0.4,
      sunPatch: 0.34,
      outdoorShade: 0.95,
    },
  },
  {
    phase: 'dusk',
    hour: 20,
    sky: {
      zenith: '#24285e',
      horizon: '#c06a7a',
      fog: '#6a5070',
      fogNear: 27,
      fogFar: 80,
      sun: '#ff8f7a',
      sunIntensity: 0.8,
      sunPosition: [-14, 3, 7],
      hemiSky: '#ffd0c0',
      hemiGround: '#4a3a50',
      hemiIntensity: 0.95,
      ambient: 0.26,
      exposure: 1.05,
      stars: false,
      lampsOn: true,
      screenGlow: 0.5,
      sunPatch: 0.08,
      outdoorShade: 0.5,
    },
  },
  { phase: 'night', hour: 22, sky: NIGHT },
];

/** How much of the floor's own palette stays in the clock-driven sky, so floors still differ. */
export const FLOOR_TINT = 0.2;

/** Hour of the day on the scenario clock, UTC, with minutes as a fraction. */
export function hourOfDay(clock: Timestamp): number {
  const d = new Date(clock);
  return d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Mixes two `#rrggbb` colours; `t` = 0 gives `a`. */
export function mixHex(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return `#${ca
    .map((v, i) => Math.round(v + ((cb[i] ?? v) - v) * t))
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`;
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Blends two skies. Booleans switch at the halfway point. */
export function mixSky(a: SkySettings, b: SkySettings, t: number): SkySettings {
  const pick = <T>(x: T, y: T) => (t < 0.5 ? x : y);
  return {
    zenith: mixHex(a.zenith, b.zenith, t),
    horizon: mixHex(a.horizon, b.horizon, t),
    fog: mixHex(a.fog, b.fog, t),
    fogNear: mix(a.fogNear, b.fogNear, t),
    fogFar: mix(a.fogFar, b.fogFar, t),
    sun: mixHex(a.sun, b.sun, t),
    sunIntensity: mix(a.sunIntensity, b.sunIntensity, t),
    sunPosition: [mix(a.sunPosition[0], b.sunPosition[0], t), mix(a.sunPosition[1], b.sunPosition[1], t), mix(a.sunPosition[2], b.sunPosition[2], t)],
    hemiSky: mixHex(a.hemiSky, b.hemiSky, t),
    hemiGround: mixHex(a.hemiGround, b.hemiGround, t),
    hemiIntensity: mix(a.hemiIntensity, b.hemiIntensity, t),
    ambient: mix(a.ambient, b.ambient, t),
    exposure: mix(a.exposure, b.exposure, t),
    stars: pick(a.stars, b.stars),
    lampsOn: pick(a.lampsOn, b.lampsOn),
    screenGlow: mix(a.screenGlow, b.screenGlow, t),
    sunPatch: mix(a.sunPatch, b.sunPatch, t),
    outdoorShade: mix(a.outdoorShade, b.outdoorShade, t),
  };
}

/** The two keyframes either side of an hour and how far between them it is. */
function bracket(hour: number): { from: SkyKeyframe; to: SkyKeyframe; t: number } {
  const frames = SKY_KEYFRAMES;
  const first = frames[0];
  const last = frames[frames.length - 1];
  if (!first || !last) throw new Error('SKY_KEYFRAMES is empty');
  // Wrap around midnight: from the last keyframe to the first one tomorrow.
  if (hour >= last.hour || hour < first.hour) {
    const span = first.hour + 24 - last.hour;
    const into = (hour >= last.hour ? hour : hour + 24) - last.hour;
    return { from: last, to: first, t: into / span };
  }
  for (let i = 0; i < frames.length - 1; i++) {
    const from = frames[i];
    const to = frames[i + 1];
    if (from && to && hour >= from.hour && hour < to.hour) return { from, to, t: (hour - from.hour) / (to.hour - from.hour) };
  }
  return { from: last, to: last, t: 0 };
}

/** Smooth in and out, so the sky lingers near each keyframe. */
const ease = (t: number) => t * t * (3 - 2 * t);

/** The sky for an hour of the day, between keyframes. */
export function skyAtHour(hour: number): SkySettings {
  const { from, to, t } = bracket(((hour % 24) + 24) % 24);
  return mixSky(from.sky, to.sky, ease(t));
}

/** The nearest keyframe's name, for labels and tests. */
export function skyPhase(clock: Timestamp): SkyPhase {
  const { from, to, t } = bracket(hourOfDay(clock));
  return t < 0.5 ? from.phase : to.phase;
}

/** Keeps a little of the floor's colours in a clock-driven sky. */
function tint(sky: SkySettings, floor: SkySettings): SkySettings {
  const keep = (key: 'zenith' | 'horizon' | 'fog' | 'hemiSky' | 'hemiGround') => mixHex(sky[key], floor[key], FLOOR_TINT);
  return { ...sky, zenith: keep('zenith'), horizon: keep('horizon'), fog: keep('fog'), hemiSky: keep('hemiSky'), hemiGround: keep('hemiGround') };
}

/**
 * The sky a floor shows: its signature mood, or, when following the clock,
 * the keyframed sky for the scenario time tinted with the floor's palette.
 */
export function floorSky(theme: FloorTheme, followClock: boolean, clock: Timestamp): SkySettings {
  if (!followClock) return theme.sky;
  return tint(skyAtHour(hourOfDay(clock)), theme.sky);
}
