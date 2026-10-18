import { describe, expect, it } from 'vitest';
import { AGENTS } from '../services/mock/seed.ts';
import {
  DESK_COUNT,
  DESK_SLOTS,
  FLOOR,
  LANDMARKS,
  MEETING_TABLE,
  MIN_AISLE,
  PLANTS,
  QA_STATION,
  QA_STATIONS,
  ZONE_IDS,
  ZONES,
  deskAssignments,
  deskFootprint,
  interactiveIds,
  zoneBounds,
  zoneById,
  type Footprint,
  type Point2,
} from './layout.ts';

const bounds = (f: Footprint) => ({
  minX: f.center.x - f.width / 2,
  maxX: f.center.x + f.width / 2,
  minZ: f.center.z - f.depth / 2,
  maxZ: f.center.z + f.depth / 2,
});
type Bounds = ReturnType<typeof bounds>;
const within = (inner: Bounds, outer: Bounds) =>
  inner.minX >= outer.minX && inner.maxX <= outer.maxX && inner.minZ >= outer.minZ && inner.maxZ <= outer.maxZ;
const contains = (b: Bounds, p: Point2) => p.x > b.minX && p.x < b.maxX && p.z > b.minZ && p.z < b.maxZ;
const gap = (a: Bounds, b: Bounds) => Math.max(b.minX - a.maxX, a.minX - b.maxX, b.minZ - a.maxZ, a.minZ - b.maxZ);

const deskBounds = DESK_SLOTS.map((slot) => bounds(deskFootprint(slot)));
const stationBounds = QA_STATIONS.map((c) => bounds({ center: { x: c.x, z: c.z + 0.35 }, width: QA_STATION.width, depth: QA_STATION.depth + 0.7 }));
const landmarkBounds = LANDMARKS.map((l) => bounds(l.footprint));
const tableBounds = bounds({
  center: MEETING_TABLE.center,
  width: (MEETING_TABLE.radius + 0.75) * 2,
  depth: (MEETING_TABLE.radius + 0.75) * 2,
});
const furniture = [...deskBounds, ...stationBounds, ...landmarkBounds, tableBounds];

describe('furniture layout', () => {
  it('lists every required zone and one desk per seeded agent', () => {
    expect(ZONES.map((z) => z.id)).toEqual([...ZONE_IDS]);
    expect(AGENTS).toHaveLength(DESK_COUNT);
    expect(DESK_COUNT).toBeGreaterThanOrEqual(6);
    expect(DESK_COUNT).toBeLessThanOrEqual(8);

    const desks = deskAssignments(AGENTS);
    expect(desks.map((d) => d.id)).toEqual(AGENTS.map((a) => `desk:${a.id}`));
    expect(new Set(desks.map((d) => d.slot)).size).toBe(DESK_COUNT);
  });

  it('gives extra agents no desk and fewer agents fewer desks', () => {
    const extra = [...AGENTS, { id: 'agent-extra' }];
    expect(deskAssignments(extra)).toHaveLength(DESK_COUNT);
    expect(deskAssignments(AGENTS.slice(0, 3)).map((d) => d.id)).toEqual([
      'desk:agent-ada',
      'desk:agent-bruno',
      'desk:agent-chen',
    ]);
  });

  it('has stable, unique interactive ids', () => {
    const ids = interactiveIds(AGENTS);
    expect(ids).toEqual(expect.arrayContaining(['board', 'qa-screen', 'status-display', 'reception', 'desk:agent-ada']));
    expect(new Set(ids).size).toBe(ids.length);
    expect(interactiveIds(AGENTS)).toEqual(ids);
  });

  it('keeps desks inside the desks zone with walkable gaps between them', () => {
    const zone = zoneBounds(zoneById('desks'));
    for (const [i, a] of deskBounds.entries()) {
      expect(within(a, zone), `desk ${String(i)}`).toBe(true);
      for (const b of deskBounds.slice(i + 1)) expect(gap(a, b)).toBeGreaterThanOrEqual(MIN_AISLE);
    }
  });

  it('places landmarks, QA stations, and the meeting table in their zones', () => {
    for (const l of LANDMARKS) expect(within(bounds(l.footprint), zoneBounds(zoneById(l.zone))), l.id).toBe(true);
    for (const s of stationBounds) expect(within(s, zoneBounds(zoneById('qa')))).toBe(true);
    expect(within(tableBounds, zoneBounds(zoneById('meeting')))).toBe(true);
    for (const [i, a] of stationBounds.entries()) {
      for (const b of stationBounds.slice(i + 1)) expect(gap(a, b)).toBeGreaterThan(0.5);
    }
  });

  it('puts every approach spot on open floor', () => {
    const approaches = [...deskAssignments(AGENTS).map((d) => d.approach), ...LANDMARKS.map((l) => l.approach)];
    for (const p of approaches) {
      expect(Math.abs(p.x)).toBeLessThan(FLOOR.width / 2 - 0.6);
      expect(Math.abs(p.z)).toBeLessThan(FLOOR.depth / 2 - 0.6);
      for (const f of furniture) expect(contains(f, p), JSON.stringify(p)).toBe(false);
    }
  });

  it('keeps plants on the floor and out of the furniture', () => {
    for (const p of PLANTS) {
      expect(Math.abs(p.x)).toBeLessThanOrEqual(FLOOR.width / 2);
      expect(Math.abs(p.z)).toBeLessThanOrEqual(FLOOR.depth / 2);
      for (const f of furniture) expect(contains(f, p), JSON.stringify(p)).toBe(false);
    }
  });
});
