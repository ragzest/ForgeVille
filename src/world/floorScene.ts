import { createContext, useContext } from 'react';
import type { Floor } from './building.ts';
import type { ThemeMaterials } from './materials.ts';

/** What every mesh on the current floor needs to know. Provided by `FloorSceneProvider`. */
export interface FloorScene {
  readonly floor: Floor;
  readonly materials: ThemeMaterials;
  /** False on vacant floors: furniture renders but nothing opens a panel. */
  readonly interactive: boolean;
  readonly reducedMotion: boolean;
}

export const FloorSceneContext = createContext<FloorScene | null>(null);

/** The current floor, its theme materials, and whether objects are interactive. */
export function useFloorScene(): FloorScene {
  const scene = useContext(FloorSceneContext);
  if (!scene) throw new Error('useFloorScene must be used inside FloorSceneProvider');
  return scene;
}
