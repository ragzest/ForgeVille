import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  IcosahedronGeometry,
  MeshStandardMaterial,
  PlaneGeometry,
  Shape,
  SphereGeometry,
  TorusGeometry,
} from 'three';
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
  skin: new MeshStandardMaterial({ color: COLORS.skin, roughness: 0.8 }),
  trousers: new MeshStandardMaterial({ color: COLORS.charcoal, roughness: 0.9 }),
  markDanger: new MeshStandardMaterial({ color: COLORS.danger, emissive: COLORS.danger, emissiveIntensity: 0.25 }),
  markAmber: new MeshStandardMaterial({ color: COLORS.amber, emissive: COLORS.amber, emissiveIntensity: 0.25 }),
  markReview: new MeshStandardMaterial({ color: COLORS.review, emissive: COLORS.review, emissiveIntensity: 0.25 }),
  markSuccess: new MeshStandardMaterial({ color: COLORS.mint, emissive: COLORS.emerald, emissiveIntensity: 0.35 }),
  markLight: new MeshStandardMaterial({ color: COLORS.ivory }),
} as const;

const shirtCache = new Map<string, MeshStandardMaterial>();

/** One shared shirt material per colour. */
export function shirtMaterial(color: string): MeshStandardMaterial {
  let material = shirtCache.get(color);
  if (!material) {
    material = new MeshStandardMaterial({ color, roughness: 0.85 });
    shirtCache.set(color, material);
  }
  return material;
}

function starShape(points = 5, outer = 0.5, inner = 0.22): Shape {
  const shape = new Shape();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2;
    const [x, y] = [Math.cos(a) * r, Math.sin(a) * r];
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

export const GEOMETRIES = {
  /** 1×1×1 box; meshes scale it to size. */
  box: new BoxGeometry(1, 1, 1),
  /** 1×1 plane lying flat after a -90° x rotation. */
  plane: new PlaneGeometry(1, 1),
  /** Unit-height cylinder, radius 0.5. */
  cylinder: new CylinderGeometry(0.5, 0.5, 1, 16),
  /** Low-poly blob for foliage, radius 0.5. */
  blob: new IcosahedronGeometry(0.5, 0),
  sphere: new SphereGeometry(0.5, 16, 12),
  /** Unit-height cone, radius 0.5. */
  cone: new ConeGeometry(0.5, 1, 12),
  /** Flat octagon facing +z, radius 0.5: a stop sign. */
  octagon: new CylinderGeometry(0.5, 0.5, 0.08, 8).rotateX(Math.PI / 2).rotateZ(Math.PI / 8),
  /** Ring facing +z, outer radius ~0.5. */
  ring: new TorusGeometry(0.4, 0.09, 8, 24),
  /** Five-point star facing +z, radius 0.5. */
  star: new ExtrudeGeometry(starShape(), { depth: 0.08, bevelEnabled: false }),
} as const;
