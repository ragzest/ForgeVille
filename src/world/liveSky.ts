import { createContext, useContext } from 'react';
import { Color, Vector3 } from 'three';
import type { SkySettings } from '../ui/themes.ts';

/**
 * The sky as currently drawn. When the target sky changes (the clock moved, or
 * "Follow the clock" was switched), these values ease towards it over a second
 * or so; under reduced motion, or on a new floor, they jump straight there.
 * The sky dome, fog, lights, and sunlight patches read it every frame.
 */
export interface LiveSky {
  readonly zenith: Color;
  readonly horizon: Color;
  readonly fog: Color;
  readonly sun: Color;
  readonly hemiSky: Color;
  readonly hemiGround: Color;
  /** Unit vector towards the sun. */
  readonly sunDir: Vector3;
  sunDistance: number;
  fogNear: number;
  fogFar: number;
  sunIntensity: number;
  hemiIntensity: number;
  ambient: number;
  exposure: number;
  sunPatch: number;
  outdoorShade: number;
}

/** How fast the sky catches up with its target, per second. About 1.5 s to settle. */
export const SKY_EASE_RATE = 3;

const COLOR_KEYS = ['zenith', 'horizon', 'fog', 'sun', 'hemiSky', 'hemiGround'] as const;
const NUMBER_KEYS = ['fogNear', 'fogFar', 'sunIntensity', 'hemiIntensity', 'ambient', 'exposure', 'sunPatch', 'outdoorShade'] as const;

export function liveSkyFrom(sky: SkySettings): LiveSky {
  const position = new Vector3(...sky.sunPosition);
  return {
    zenith: new Color(sky.zenith),
    horizon: new Color(sky.horizon),
    fog: new Color(sky.fog),
    sun: new Color(sky.sun),
    hemiSky: new Color(sky.hemiSky),
    hemiGround: new Color(sky.hemiGround),
    sunDir: position.clone().normalize(),
    sunDistance: position.length(),
    fogNear: sky.fogNear,
    fogFar: sky.fogFar,
    sunIntensity: sky.sunIntensity,
    hemiIntensity: sky.hemiIntensity,
    ambient: sky.ambient,
    exposure: sky.exposure,
    sunPatch: sky.sunPatch,
    outdoorShade: sky.outdoorShade,
  };
}

const TARGET = new Color();
const TARGET_DIR = new Vector3();

/** Moves `live` a fraction `k` (0–1) of the way to `target`. `k` = 1 snaps. */
export function stepLiveSky(live: LiveSky, target: SkySettings, k: number): void {
  for (const key of COLOR_KEYS) live[key].lerp(TARGET.set(target[key]), k);
  for (const key of NUMBER_KEYS) live[key] += (target[key] - live[key]) * k;
  TARGET_DIR.set(...target.sunPosition);
  live.sunDistance += (TARGET_DIR.length() - live.sunDistance) * k;
  live.sunDir.lerp(TARGET_DIR.normalize(), k).normalize();
}

export const LiveSkyContext = createContext<LiveSky | null>(null);

export function useLiveSky(): LiveSky {
  const live = useContext(LiveSkyContext);
  if (!live) throw new Error('useLiveSky must be used inside LiveSkyProvider (LiveSkyProvider.tsx)');
  return live;
}

