import { BoxGeometry, CylinderGeometry, IcosahedronGeometry, MeshStandardMaterial, PlaneGeometry } from 'three';
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
  wood: new MeshStandardMaterial({ color: COLORS.wood, roughness: 0.7 }),
  deskTop: new MeshStandardMaterial({ color: COLORS.deskTop, roughness: 0.6 }),
  fabric: new MeshStandardMaterial({ color: COLORS.forest, roughness: 0.9 }),
  metal: new MeshStandardMaterial({ color: COLORS.trim, roughness: 0.4, metalness: 0.3 }),
  screen: new MeshStandardMaterial({
    color: COLORS.screen,
    emissive: COLORS.screenGlow,
    emissiveIntensity: 0.25,
    roughness: 0.3,
  }),
  whiteboard: new MeshStandardMaterial({ color: COLORS.whiteboard, roughness: 0.4 }),
  pot: new MeshStandardMaterial({ color: COLORS.pot, roughness: 0.85 }),
  leaf: new MeshStandardMaterial({ color: COLORS.leaf, roughness: 0.8, flatShading: true }),
  leafDark: new MeshStandardMaterial({ color: COLORS.leafDark, roughness: 0.8, flatShading: true }),
} as const;

export const GEOMETRIES = {
  /** 1×1×1 box; meshes scale it to size. */
  box: new BoxGeometry(1, 1, 1),
  /** 1×1 plane lying flat after a -90° x rotation. */
  plane: new PlaneGeometry(1, 1),
  /** Unit-height cylinder, radius 0.5. */
  cylinder: new CylinderGeometry(0.5, 0.5, 1, 16),
  /** Low-poly blob for foliage, radius 0.5. */
  blob: new IcosahedronGeometry(0.5, 0),
} as const;
