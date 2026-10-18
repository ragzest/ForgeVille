import { describe, expect, it } from 'vitest';
import { FLOOR, TRAVEL_ZONES, overviewHeight, overviewTurned, playerColliders, zoneById } from '../layout.ts';
import { isBlocked, moveVector, yawToward } from './movement.ts';

describe('yawToward', () => {
  it('faces the target', () => {
    for (const to of [{ x: 0, z: -5 }, { x: 3, z: 0 }, { x: -2, z: 4 }, { x: 1, z: 1 }]) {
      const v = moveVector({ forward: 1, strafe: 0, run: false }, yawToward({ x: 0, z: 0 }, to));
      const len = Math.hypot(to.x, to.z);
      expect(v.dx / Math.hypot(v.dx, v.dz)).toBeCloseTo(to.x / len);
      expect(v.dz / Math.hypot(v.dx, v.dz)).toBeCloseTo(to.z / len);
    }
  });
});

describe('zone travel', () => {
  it('offers the six zones from the story, each with a free anchor', () => {
    expect(TRAVEL_ZONES).toEqual(['reception', 'desks', 'qa', 'board', 'status', 'meeting']);
    const colliders = playerColliders();
    for (const id of TRAVEL_ZONES) {
      const { anchor } = zoneById(id);
      expect(isBlocked(anchor.x, anchor.z, colliders), id).toBe(false);
    }
  });
});

describe('overviewHeight', () => {
  const fits = (fov: number, aspect: number) => {
    const h = overviewHeight(fov, aspect);
    const halfDown = h * Math.tan((fov * Math.PI) / 360);
    const halfAcross = halfDown * aspect;
    // Portrait screens show the floor turned, so its long side runs down the screen.
    const [across, down] = overviewTurned(aspect) ? [FLOOR.depth, FLOOR.width] : [FLOOR.width, FLOOR.depth];
    return halfDown >= down / 2 && halfAcross >= across / 2;
  };

  it('fits the whole floor on wide, square, and narrow screens', () => {
    for (const aspect of [2.2, 1.6, 1, 0.5]) expect(fits(70, aspect), String(aspect)).toBe(true);
  });

  it('turns on portrait screens so the floor is not tiny', () => {
    expect(overviewTurned(0.46)).toBe(true);
    expect(overviewTurned(1.6)).toBe(false);
    // Turned, a phone-shaped screen needs far less height than an unturned view would.
    const unturned = (24 / 2) / (Math.tan((70 * Math.PI) / 360) * 0.46) * 1.08;
    expect(overviewHeight(70, 0.46)).toBeLessThan(unturned * 0.7);
  });
});
