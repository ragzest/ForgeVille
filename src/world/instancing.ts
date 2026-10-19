import { Euler, Matrix4, Quaternion, Vector3, type Material } from 'three';
import { wantsOutline, type GeometryName } from './materials.ts';
import { isSmallProp } from './quality.ts';

/**
 * Repeated props (chairs, plants, monitor bodies) drawn as instanced meshes.
 * A prop is a recipe of parts; each placement of it adds one instance per
 * part. Parts that share geometry, material, and shadow flags across every
 * placement become one batch, so twenty chairs cost a handful of draw calls.
 */

export type Vec3 = readonly [number, number, number];

/** One solid of a prop, in the prop's own space. Mirrors `<Solid>`'s props. */
export interface Part {
  readonly geometry?: GeometryName;
  readonly material: Material;
  readonly position?: Vec3;
  readonly scale?: Vec3;
  readonly rotation?: Vec3;
  /** Ink outline; on by default for lit materials, never for glows. */
  readonly outline?: boolean;
  readonly castShadow?: boolean;
  readonly receiveShadow?: boolean;
}

/** Where one copy of a prop stands: on the floor plan, turned about y, uniformly scaled. */
export interface Placement {
  readonly position: Vec3;
  readonly rotationY?: number;
  readonly scale?: number;
}

export interface PlacedProp {
  readonly placement: Placement;
  readonly parts: readonly Part[];
}

export interface Batch {
  readonly key: string;
  readonly geometry: GeometryName;
  readonly material: Material;
  readonly castShadow: boolean;
  readonly receiveShadow: boolean;
  /** One world matrix per instance. */
  readonly matrices: readonly Matrix4[];
  /** The instances that carry an ink outline (a subset of `matrices`). */
  readonly outlined: readonly Matrix4[];
}

const ZERO: Vec3 = [0, 0, 0];
const ONE: Vec3 = [1, 1, 1];

export function placementMatrix({ position, rotationY = 0, scale = 1 }: Placement): Matrix4 {
  return new Matrix4().compose(
    new Vector3(...position),
    new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), rotationY),
    new Vector3(scale, scale, scale),
  );
}

export function partMatrix({ position = ZERO, rotation = ZERO, scale = ONE }: Part): Matrix4 {
  return new Matrix4().compose(new Vector3(...position), new Quaternion().setFromEuler(new Euler(...rotation)), new Vector3(...scale));
}

/** Groups every part of every placed prop into batches, in first-seen order. */
export function batchParts(props: readonly PlacedProp[], smallPropOutlines: boolean): Batch[] {
  const batches = new Map<string, { key: string; geometry: GeometryName; material: Material; castShadow: boolean; receiveShadow: boolean; matrices: Matrix4[]; outlined: Matrix4[] }>();
  for (const { placement, parts } of props) {
    const base = placementMatrix(placement);
    const s = placement.scale ?? 1;
    for (const part of parts) {
      const geometry = part.geometry ?? 'box';
      const castShadow = part.castShadow ?? true;
      const receiveShadow = part.receiveShadow ?? true;
      const key = `${geometry}|${part.material.uuid}|${String(castShadow)}|${String(receiveShadow)}`;
      let batch = batches.get(key);
      if (!batch) {
        batch = { key, geometry, material: part.material, castShadow, receiveShadow, matrices: [], outlined: [] };
        batches.set(key, batch);
      }
      const matrix = base.clone().multiply(partMatrix(part));
      batch.matrices.push(matrix);
      const scale = part.scale ?? ONE;
      const worldScale: Vec3 = [scale[0] * s, scale[1] * s, scale[2] * s];
      const inked = (part.outline ?? wantsOutline(part.material)) && (smallPropOutlines || !isSmallProp(worldScale));
      if (inked) batch.outlined.push(matrix);
    }
  }
  return [...batches.values()];
}
