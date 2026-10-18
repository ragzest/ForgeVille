/**
 * Office floor plan as data. Everything that places a zone, sign, or
 * interactable reads from here instead of hard-coding coordinates.
 *
 * Units: 1 unit = 1 metre. The floor sits on y = 0; +x is east, +z is south
 * (towards the camera). The entrance is on the south wall.
 *
 * Aisles between zones are at least 1.2 units, enough for a 0.6-radius
 * capsule (E04).
 */

export type ZoneId = 'reception' | 'desks' | 'qa' | 'board' | 'status' | 'meeting' | 'greenery';

/** Zone ids from design.md, plus `greenery` for its seventh area (plants, windows, decorations). */
export const ZONE_IDS = [
  'reception',
  'desks',
  'qa',
  'board',
  'status',
  'meeting',
  'greenery',
] as const satisfies readonly ZoneId[];

export interface Point2 {
  readonly x: number;
  readonly z: number;
}

export interface Zone {
  readonly id: ZoneId;
  readonly label: string;
  /** Centre of the zone's footprint on the floor. */
  readonly center: Point2;
  /** Footprint width (x) and depth (z). */
  readonly size: { readonly width: number; readonly depth: number };
  /** Where a visitor stands to use the zone; travel and hints target this. */
  readonly anchor: Point2;
}

export const FLOOR = { width: 24, depth: 16 } as const;
export const WALL = { height: 3, thickness: 0.2 } as const;

/** Minimum clear gap between zone footprints. */
export const MIN_AISLE = 1.2;

export const ZONES: readonly Zone[] = [
  {
    id: 'reception',
    label: 'Reception',
    center: { x: 8.5, z: 5 },
    size: { width: 6, depth: 4 },
    anchor: { x: 6.5, z: 5 },
  },
  {
    id: 'desks',
    label: 'Developer desks',
    center: { x: -1.5, z: -1 },
    size: { width: 11, depth: 6 },
    anchor: { x: -1.5, z: 3 },
  },
  {
    id: 'qa',
    label: 'QA lab',
    center: { x: 8.5, z: -4.5 },
    size: { width: 6, depth: 5 },
    anchor: { x: 8.5, z: -0.8 },
  },
  {
    id: 'board',
    label: 'Kanban board',
    center: { x: -10.6, z: -2 },
    size: { width: 2.4, depth: 5 },
    anchor: { x: -8.2, z: -2 },
  },
  {
    id: 'status',
    label: 'Project status',
    center: { x: -1, z: 6.5 },
    size: { width: 4, depth: 2 },
    anchor: { x: -1, z: 4.6 },
  },
  {
    id: 'meeting',
    label: 'Meeting area',
    center: { x: -8, z: 5.5 },
    size: { width: 6, depth: 4 },
    anchor: { x: -4.4, z: 5.5 },
  },
  {
    id: 'greenery',
    label: 'Plants and windows',
    center: { x: -1.5, z: -6.75 },
    size: { width: 11, depth: 1.5 },
    anchor: { x: -1.5, z: -5.2 },
  },
];

export interface WallWindow {
  readonly wall: 'north' | 'east';
  /** Position along the wall: x for the north wall, z for the east wall. */
  readonly offset: number;
  readonly width: number;
}

export const WINDOWS: readonly WallWindow[] = [
  { wall: 'north', offset: -6, width: 3 },
  { wall: 'north', offset: -1.5, width: 3 },
  { wall: 'north', offset: 3, width: 3 },
  { wall: 'east', offset: -4.5, width: 2.5 },
];

/** Window glass spans this height band on the wall. */
export const WINDOW_SILL = 0.9;
export const WINDOW_HEIGHT = 1.5;

/** Temporary camera that frames the whole floor until E04 adds player controls. */
export const OVERVIEW_CAMERA = {
  position: [0, 17, 17] as const,
  target: [0, 0, 0] as const,
  fov: 45,
};

export function zoneById(id: ZoneId): Zone {
  const zone = ZONES.find((z) => z.id === id);
  if (!zone) throw new Error(`Unknown zone ${id}`);
  return zone;
}

/** Axis-aligned footprint of a zone. */
export function zoneBounds(zone: Zone) {
  return {
    minX: zone.center.x - zone.size.width / 2,
    maxX: zone.center.x + zone.size.width / 2,
    minZ: zone.center.z - zone.size.depth / 2,
    maxZ: zone.center.z + zone.size.depth / 2,
  };
}
