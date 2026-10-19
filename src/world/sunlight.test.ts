import { describe, expect, it } from 'vitest';
import { FLOOR_THEMES } from '../ui/themes.ts';
import { skyAtHour } from './dayCycle.ts';
import { FLOOR } from './layout.ts';
import { clipToRect, patchTriangles, sunPatches } from './sunlight.ts';

describe('sunlight patches', () => {
  it('throws patches on the floor on day floors, inside the room', () => {
    for (const id of ['workshop', 'greenhouse', 'ember-forge'] as const) {
      const patches = sunPatches(FLOOR_THEMES[id].sky.sunPosition);
      expect(patches.length, id).toBeGreaterThan(0);
      for (const poly of patches) {
        expect(poly.length).toBeGreaterThanOrEqual(3);
        for (const p of poly) {
          expect(Math.abs(p.x)).toBeLessThanOrEqual(FLOOR.width / 2);
          expect(Math.abs(p.z)).toBeLessThanOrEqual(FLOOR.depth / 2);
        }
      }
    }
  });

  it('has no strength at night, even where the moon would cast a shape', () => {
    expect(FLOOR_THEMES['night-studio'].sky.sunPatch).toBe(0);
    expect(skyAtHour(1).sunPatch).toBe(0);
    expect(FLOOR_THEMES.workshop.sky.sunPatch).toBeGreaterThan(0);
  });

  it('only lights windows the sun shines into', () => {
    // A sun due south, high up: light heads north, so only the south window lets it in.
    const patches = sunPatches([0, 10, 10]);
    expect(patches).toHaveLength(1);
    for (const p of patches[0] ?? []) expect(p.z).toBeGreaterThan(0);
  });

  it('casts nothing when the sun is on the horizon', () => {
    expect(sunPatches([10, 0.5, 0])).toEqual([]);
  });

  it('moves the patches as the sun moves', () => {
    expect(sunPatches(skyAtHour(9).sunPosition)).not.toEqual(sunPatches(skyAtHour(16).sunPosition));
  });

  it('clips a polygon to a rectangle', () => {
    const clipped = clipToRect(
      [
        { x: -2, z: -2 },
        { x: 2, z: -2 },
        { x: 2, z: 2 },
        { x: -2, z: 2 },
      ],
      -1,
      1,
      -1,
      3,
    );
    expect(clipped.map((p) => [p.x, p.z]).sort()).toEqual(
      [
        [-1, -1],
        [1, -1],
        [1, 2],
        [-1, 2],
      ].sort(),
    );
    expect(clipToRect([{ x: 5, z: 5 }, { x: 6, z: 5 }, { x: 6, z: 6 }], -1, 1, -1, 1)).toEqual([]);
  });

  it('fans each patch into triangles at the given height', () => {
    const tris = patchTriangles([[{ x: 0, z: 0 }, { x: 1, z: 0 }, { x: 1, z: 1 }, { x: 0, z: 1 }]], 0.01);
    expect(tris).toHaveLength(2 * 3 * 3);
    for (let i = 1; i < tris.length; i += 3) expect(tris[i]).toBe(0.01);
  });
});
