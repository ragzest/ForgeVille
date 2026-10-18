import { describe, expect, it } from 'vitest';
import { FLOOR, MIN_AISLE, OVERVIEW_CAMERA, WALL, WINDOW_HEIGHT, WINDOW_SILL, WINDOWS, ZONE_IDS, ZONES, zoneBounds, zoneById } from './layout.ts';

const inside = (p: { x: number; z: number }, b: ReturnType<typeof zoneBounds>) =>
  p.x > b.minX && p.x < b.maxX && p.z > b.minZ && p.z < b.maxZ;

describe('office layout', () => {
  it('reserves every zone id from design.md plus greenery, once each', () => {
    expect(ZONES.map((z) => z.id)).toEqual([...ZONE_IDS]);
    expect(ZONE_IDS).toEqual(expect.arrayContaining(['reception', 'desks', 'qa', 'board', 'status', 'meeting']));
    expect(ZONE_IDS).toHaveLength(7);
    for (const id of ZONE_IDS) expect(zoneById(id).label).toBeTruthy();
  });

  it('keeps every zone on the floor', () => {
    for (const zone of ZONES) {
      const b = zoneBounds(zone);
      expect(b.minX, zone.id).toBeGreaterThanOrEqual(-FLOOR.width / 2);
      expect(b.maxX, zone.id).toBeLessThanOrEqual(FLOOR.width / 2);
      expect(b.minZ, zone.id).toBeGreaterThanOrEqual(-FLOOR.depth / 2);
      expect(b.maxZ, zone.id).toBeLessThanOrEqual(FLOOR.depth / 2);
    }
  });

  it('leaves walkable aisles between zones', () => {
    for (const [i, a] of ZONES.entries()) {
      for (const b of ZONES.slice(i + 1)) {
        const ba = zoneBounds(a);
        const bb = zoneBounds(b);
        const gapX = Math.max(bb.minX - ba.maxX, ba.minX - bb.maxX);
        const gapZ = Math.max(bb.minZ - ba.maxZ, ba.minZ - bb.maxZ);
        expect(Math.max(gapX, gapZ), `${a.id} vs ${b.id}`).toBeGreaterThanOrEqual(MIN_AISLE);
      }
    }
  });

  it('puts each anchor on the floor and outside every other zone', () => {
    for (const zone of ZONES) {
      expect(Math.abs(zone.anchor.x), zone.id).toBeLessThan(FLOOR.width / 2);
      expect(Math.abs(zone.anchor.z), zone.id).toBeLessThan(FLOOR.depth / 2);
      for (const other of ZONES.filter((o) => o.id !== zone.id)) {
        expect(inside(zone.anchor, zoneBounds(other)), `${zone.id} anchor in ${other.id}`).toBe(false);
      }
    }
  });

  it('fits windows on their walls', () => {
    expect(WINDOW_SILL + WINDOW_HEIGHT).toBeLessThan(WALL.height);
    for (const w of WINDOWS) {
      const half = (w.wall === 'north' ? FLOOR.width : FLOOR.depth) / 2;
      expect(Math.abs(w.offset) + w.width / 2).toBeLessThanOrEqual(half);
    }
  });

  it('starts the camera above and outside the room', () => {
    const [x, y, z] = OVERVIEW_CAMERA.position;
    expect(y).toBeGreaterThan(WALL.height);
    expect(Math.abs(x) > FLOOR.width / 2 || Math.abs(z) > FLOOR.depth / 2).toBe(true);
  });
});
