import { FLOOR, WINDOW_HEIGHT, WINDOW_SILL, WINDOWS, type Point2, type WallSide, type WallWindow } from './layout.ts';

/**
 * Fake sunlight: the shape each window's light throws on the floor, found by
 * casting the window's corners along the sun's direction to the floor plane.
 * Drawn as additive quads, so no extra light is needed. Pure geometry.
 */

/** Unit vector pointing into the room from each wall. */
const INWARD: Readonly<Record<WallSide, Point2>> = {
  north: { x: 0, z: 1 },
  south: { x: 0, z: -1 },
  west: { x: 1, z: 0 },
  east: { x: -1, z: 0 },
};

/** Below this sun elevation (sine of the angle) the patches stretch too far to read; none are drawn. */
export const MIN_SUN_HEIGHT = 0.12;

/** A window's glass corners on the inner wall face, as (x, y, z). */
function windowCorners(w: WallWindow): [number, number, number][] {
  const top = WINDOW_SILL + WINDOW_HEIGHT;
  const a = w.offset - w.width / 2;
  const b = w.offset + w.width / 2;
  const hz = FLOOR.depth / 2;
  const hx = FLOOR.width / 2;
  switch (w.wall) {
    case 'north':
      return [[a, WINDOW_SILL, -hz], [b, WINDOW_SILL, -hz], [b, top, -hz], [a, top, -hz]];
    case 'south':
      return [[a, WINDOW_SILL, hz], [b, WINDOW_SILL, hz], [b, top, hz], [a, top, hz]];
    case 'west':
      return [[-hx, WINDOW_SILL, a], [-hx, WINDOW_SILL, b], [-hx, top, b], [-hx, top, a]];
    case 'east':
      return [[hx, WINDOW_SILL, a], [hx, WINDOW_SILL, b], [hx, top, b], [hx, top, a]];
  }
}

/** Clips a convex polygon to an axis-aligned rectangle (Sutherland–Hodgman). */
export function clipToRect(poly: readonly Point2[], minX: number, maxX: number, minZ: number, maxZ: number): Point2[] {
  interface Edge { inside: (p: Point2) => boolean; cut: (p: Point2, q: Point2) => Point2 }
  const atX = (x: number) => (p: Point2, q: Point2) => ({ x, z: p.z + ((q.z - p.z) * (x - p.x)) / (q.x - p.x) });
  const atZ = (z: number) => (p: Point2, q: Point2) => ({ x: p.x + ((q.x - p.x) * (z - p.z)) / (q.z - p.z), z });
  const edges: Edge[] = [
    { inside: (p) => p.x >= minX, cut: atX(minX) },
    { inside: (p) => p.x <= maxX, cut: atX(maxX) },
    { inside: (p) => p.z >= minZ, cut: atZ(minZ) },
    { inside: (p) => p.z <= maxZ, cut: atZ(maxZ) },
  ];
  let out: Point2[] = [...poly];
  for (const edge of edges) {
    const input = out;
    out = [];
    input.forEach((p, i) => {
      const prev = input[(i + input.length - 1) % input.length] ?? p;
      if (edge.inside(p)) {
        if (!edge.inside(prev)) out.push(edge.cut(prev, p));
        out.push(p);
      } else if (edge.inside(prev)) {
        out.push(edge.cut(prev, p));
      }
    });
    if (out.length === 0) break;
  }
  return out;
}

/**
 * The floor patch of light for every window the sun shines through, given the
 * sun's position (a direction, as in the theme). Each patch is a convex
 * polygon in plan view, clipped to the room. Windows facing away get none.
 */
export function sunPatches(sunPosition: readonly [number, number, number]): Point2[][] {
  const [sx, sy, sz] = sunPosition;
  const length = Math.hypot(sx, sy, sz) || 1;
  const dir = { x: sx / length, y: sy / length, z: sz / length };
  if (dir.y < MIN_SUN_HEIGHT) return [];
  const margin = 0.05;
  return WINDOWS.flatMap((w) => {
    const inward = INWARD[w.wall];
    // Light travels away from the sun; it must head into the room.
    if (-(dir.x * inward.x + dir.z * inward.z) <= 0.02) return [];
    const floorHits = windowCorners(w).map(([x, y, z]) => ({ x: x - (dir.x * y) / dir.y, z: z - (dir.z * y) / dir.y }));
    const patch = clipToRect(floorHits, -FLOOR.width / 2 + margin, FLOOR.width / 2 - margin, -FLOOR.depth / 2 + margin, FLOOR.depth / 2 - margin);
    return patch.length >= 3 ? [patch] : [];
  });
}

/** Triangle-fan positions (x, y, z) for every patch, at height `y`. Winding varies, so draw both sides. */
export function patchTriangles(patches: readonly (readonly Point2[])[], y: number): number[] {
  const out: number[] = [];
  for (const poly of patches) {
    const first = poly[0];
    if (!first) continue;
    for (let i = 1; i < poly.length - 1; i++) {
      const b = poly[i];
      const c = poly[i + 1];
      if (!b || !c) continue;
      out.push(first.x, y, first.z, b.x, y, b.z, c.x, y, c.z);
    }
  }
  return out;
}
