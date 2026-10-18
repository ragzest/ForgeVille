import { BoxGeometry, MeshStandardMaterial, PlaneGeometry } from 'three';
import { COLORS } from '../ui/tokens.ts';

/**
 * Shared materials and geometries. Every wall, window, and floor mesh uses
 * these instances, scaled per mesh, so the scene creates each only once.
 */
export const MATERIALS = {
  floor: new MeshStandardMaterial({ color: COLORS.floor, roughness: 0.9 }),
  wall: new MeshStandardMaterial({ color: COLORS.wall, roughness: 0.95 }),
  trim: new MeshStandardMaterial({ color: COLORS.trim, roughness: 0.6 }),
  window: new MeshStandardMaterial({
    color: COLORS.glass,
    emissive: COLORS.sky,
    emissiveIntensity: 0.35,
    roughness: 0.1,
    transparent: true,
    opacity: 0.85,
  }),
  zoneRug: new MeshStandardMaterial({ color: COLORS.rug, roughness: 1 }),
  zoneEdge: new MeshStandardMaterial({ color: COLORS.forest, roughness: 0.8 }),
} as const;

export const GEOMETRIES = {
  /** 1×1×1 box; meshes scale it to size. */
  box: new BoxGeometry(1, 1, 1),
  /** 1×1 plane lying flat after a -90° x rotation. */
  plane: new PlaneGeometry(1, 1),
} as const;
