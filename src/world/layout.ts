import type { Box2 } from './player/movement.ts';

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
    // Runs to the south wall so the elevator lobby belongs to reception.
    center: { x: 8.5, z: 5.5 },
    size: { width: 6, depth: 5 },
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

export type WallSide = 'north' | 'south' | 'east' | 'west';

export interface WallWindow {
  readonly wall: WallSide;
  /** Position along the wall: x for the north and south walls, z for east and west. */
  readonly offset: number;
  readonly width: number;
}

export const WINDOWS: readonly WallWindow[] = [
  { wall: 'north', offset: -6, width: 3.2 },
  { wall: 'north', offset: -1.5, width: 3.2 },
  { wall: 'north', offset: 3, width: 3.2 },
  { wall: 'east', offset: -4.5, width: 2.6 },
  { wall: 'west', offset: 5.5, width: 2.6 },
  { wall: 'south', offset: -8, width: 2.6 },
];

/** Window glass spans this height band on the wall. */
export const WINDOW_SILL = 0.8;
export const WINDOW_HEIGHT = 1.65;

/** Inner length of a wall. North and south walls also cover the corners. */
export function wallLength(side: WallSide): number {
  return side === 'north' || side === 'south' ? FLOOR.width + WALL.thickness * 2 : FLOOR.depth;
}

export interface WallPiece {
  /** Start and end along the wall, centred on its middle. */
  readonly from: number;
  readonly to: number;
  readonly bottom: number;
  readonly top: number;
}

/** Splits a wall into solid pieces around its window openings: piers, sills, and lintels. */
export function wallPieces(side: WallSide): WallPiece[] {
  const length = wallLength(side);
  const top = WINDOW_SILL + WINDOW_HEIGHT;
  const openings = WINDOWS.filter((w) => w.wall === side)
    .map((w) => ({ from: w.offset - w.width / 2, to: w.offset + w.width / 2 }))
    .sort((a, b) => a.from - b.from);
  const pieces: WallPiece[] = [];
  let cursor = -length / 2;
  for (const o of openings) {
    if (o.from > cursor) pieces.push({ from: cursor, to: o.from, bottom: 0, top: WALL.height });
    pieces.push({ from: o.from, to: o.to, bottom: 0, top: WINDOW_SILL });
    pieces.push({ from: o.from, to: o.to, bottom: top, top: WALL.height });
    cursor = o.to;
  }
  if (cursor < length / 2) pieces.push({ from: cursor, to: length / 2, bottom: 0, top: WALL.height });
  return pieces;
}

/** Ceiling lamps: panels on the ceiling, and warm pools of light when a floor's lamps are on. */
export const CEILING_LAMPS: readonly Point2[] = [
  { x: -5.7, z: -2.8 },
  { x: 0, z: -2.8 },
  { x: -2.85, z: 0.4 },
  { x: 8.5, z: -4.5 },
  { x: 8.5, z: 4 },
  { x: -8, z: 5.5 },
  { x: -1, z: 5 },
  { x: -9.5, z: -2 },
];

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

// ---------------------------------------------------------------------------
// Furniture. Positions are footprint centres on the floor; `rotationY` turns
// an item about its centre (0 = facing north, towards -z).

export interface Footprint {
  readonly center: Point2;
  readonly width: number;
  readonly depth: number;
}

/** Desk top size. A chair sits on the south side, so a desk's footprint runs deeper. */
export const DESK = { width: 1.6, depth: 0.8, height: 0.75 } as const;
/** Desk plus chair, measured from the desk's centre: 0.4 north, 1.1 south. */
export const DESK_FOOTPRINT = { width: DESK.width, north: 0.4, south: 1.1 } as const;

/**
 * Seven desk slots in two rows inside the desks zone, all facing north.
 * 1.25 m clear between neighbours and 1.7 m between rows.
 */
export const DESK_SLOTS: readonly Point2[] = [
  { x: -5.7, z: -2.8 },
  { x: -2.85, z: -2.8 },
  { x: 0, z: -2.8 },
  { x: 2.85, z: -2.8 },
  { x: -4.3, z: 0.4 },
  { x: -1.45, z: 0.4 },
  { x: 1.4, z: 0.4 },
];

export const DESK_COUNT = DESK_SLOTS.length;

/** Floor area a desk and its chair occupy. */
export function deskFootprint(slot: Point2): Footprint {
  const depth = DESK_FOOTPRINT.north + DESK_FOOTPRINT.south;
  return {
    center: { x: slot.x, z: slot.z - DESK_FOOTPRINT.north + depth / 2 },
    width: DESK_FOOTPRINT.width,
    depth,
  };
}

export interface DeskAssignment {
  /** Stable interactive id: `desk:{agentId}`. */
  readonly id: `desk:${string}`;
  readonly agentId: string;
  readonly slot: Point2;
  /** Where a visitor stands to use the desk: the aisle behind the chair. */
  readonly approach: Point2;
}

/**
 * Binds agents to desk slots in snapshot order. Agents beyond the desk count
 * get no desk in this milestone; the seed has exactly one agent per desk.
 */
export function deskAssignments(agents: readonly { readonly id: string }[]): DeskAssignment[] {
  return agents.slice(0, DESK_COUNT).flatMap((agent, i) => {
    const slot = DESK_SLOTS[i];
    if (!slot) return [];
    return [{ id: `desk:${agent.id}` as const, agentId: agent.id, slot, approach: { x: slot.x, z: slot.z + 1.45 } }];
  });
}

export type LandmarkId = 'board' | 'qa-screen' | 'status-display' | 'reception' | 'elevator';

export interface Landmark {
  /** Stable interactive id. */
  readonly id: LandmarkId;
  readonly label: string;
  readonly zone: ZoneId;
  readonly footprint: Footprint;
  /** Where a visitor stands to use it: within reach (see INTERACT_RADIUS). */
  readonly approach: Point2;
}

/** Interactive landmarks other than desks. */
export const LANDMARKS: readonly Landmark[] = [
  {
    id: 'board',
    label: 'Kanban board',
    zone: 'board',
    footprint: { center: { x: -11.74, z: -2 }, width: 0.1, depth: 4.2 },
    approach: { x: -10.5, z: -2 },
  },
  {
    id: 'qa-screen',
    label: 'QA screen',
    zone: 'qa',
    footprint: { center: { x: 8.5, z: -6.9 }, width: 2.4, depth: 0.1 },
    approach: { x: 8.5, z: -5.55 },
  },
  {
    id: 'status-display',
    label: 'Project status display',
    zone: 'status',
    footprint: { center: { x: -1, z: 6.8 }, width: 2.6, depth: 0.5 },
    approach: { x: -1, z: 5.6 },
  },
  {
    id: 'reception',
    label: 'Reception',
    zone: 'reception',
    footprint: { center: { x: 9.2, z: 5 }, width: 1, depth: 3 },
    approach: { x: 7.6, z: 5 },
  },
  {
    id: 'elevator',
    label: 'Elevator',
    zone: 'reception',
    footprint: { center: { x: 7, z: 7.85 }, width: 1.8, depth: 0.3 },
    approach: { x: 7, z: 6.8 },
  },
];

/** Landmarks that work on a vacant floor: only the elevator, so a visitor can always leave. */
export const VACANT_FLOOR_LANDMARKS: readonly LandmarkId[] = ['elevator'];

/** Every stable interactive id for a set of agents. */
export function interactiveIds(agents: readonly { readonly id: string }[]): string[] {
  return [...deskAssignments(agents).map((d) => d.id), ...LANDMARKS.map((l) => l.id)];
}

/** Non-interactive furniture with a floor footprint, for aisle checks. */
export const QA_STATIONS: readonly Point2[] = [
  { x: 7.2, z: -4.6 },
  { x: 9.8, z: -4.6 },
];
export const QA_STATION = { width: 1.8, depth: 0.8, height: 0.75 } as const;

export const MEETING_TABLE = { center: { x: -8, z: 5.5 }, radius: 1.1, height: 0.74, chairs: 6 } as const;

/** A coffee cart against the south wall, between the status display and reception. Idle agents walk here. */
export const COFFEE_CART = { center: { x: 3.9, z: 7.55 }, width: 0.9, depth: 0.5, height: 0.9 } as const;

/** Potted plants: under the north windows and in a few corners. */
export const PLANTS: readonly Point2[] = [
  { x: -6.4, z: -6.9 },
  { x: -3.75, z: -6.9 },
  { x: 0.75, z: -6.9 },
  { x: 3.4, z: -6.9 },
  { x: -11.4, z: 7.4 },
  { x: 11.4, z: 7.4 },
  { x: 11.4, z: 1.8 },
  { x: -11.4, z: -7.4 },
  { x: 5.3, z: 7.3 },
];

// ---------------------------------------------------------------------------
// Player colliders: simple boxes in plan view. Perfect physics is not needed;
// these keep the player out of walls and large furniture.


const boxOf = (f: Footprint): Box2 => ({
  minX: f.center.x - f.width / 2,
  maxX: f.center.x + f.width / 2,
  minZ: f.center.z - f.depth / 2,
  maxZ: f.center.z + f.depth / 2,
});

/** Where the player starts: inside the south entrance, facing north into the room. */
export const PLAYER_SPAWN = { x: 3, z: 6.6, yaw: 0, pitch: -0.12 } as const;

/** Walls as thick boxes just outside the floor edge. */
const WALL_COLLIDERS: readonly Box2[] = [
  { minX: -FLOOR.width / 2 - 1, maxX: FLOOR.width / 2 + 1, minZ: -FLOOR.depth / 2 - 1, maxZ: -FLOOR.depth / 2 },
  { minX: -FLOOR.width / 2 - 1, maxX: FLOOR.width / 2 + 1, minZ: FLOOR.depth / 2, maxZ: FLOOR.depth / 2 + 1 },
  { minX: -FLOOR.width / 2 - 1, maxX: -FLOOR.width / 2, minZ: -FLOOR.depth / 2 - 1, maxZ: FLOOR.depth / 2 + 1 },
  { minX: FLOOR.width / 2, maxX: FLOOR.width / 2 + 1, minZ: -FLOOR.depth / 2 - 1, maxZ: FLOOR.depth / 2 + 1 },
];

/** Plant pots are small; a 0.5 m square is enough. */
const PLANT_SIZE = 0.5;

export function playerColliders(): Box2[] {
  const desks = DESK_SLOTS.map((slot) => boxOf(deskFootprint(slot)));
  const stations = QA_STATIONS.map((c) =>
    boxOf({ center: { x: c.x, z: c.z + 0.35 }, width: QA_STATION.width, depth: QA_STATION.depth + 0.7 }),
  );
  const landmarks = LANDMARKS.map((l) => boxOf(l.footprint));
  const table = MEETING_TABLE.radius + 0.7; // table plus chairs
  const meeting: Box2 = {
    minX: MEETING_TABLE.center.x - table,
    maxX: MEETING_TABLE.center.x + table,
    minZ: MEETING_TABLE.center.z - table,
    maxZ: MEETING_TABLE.center.z + table,
  };
  const plants = PLANTS.map((p) => boxOf({ center: p, width: PLANT_SIZE, depth: PLANT_SIZE }));
  const coffee = boxOf(COFFEE_CART);
  return [...WALL_COLLIDERS, ...desks, ...stations, ...landmarks, meeting, coffee, ...plants];
}

/** Zones offered for travel, in toolbar order. Greenery is decoration only. */
export const TRAVEL_ZONES = ['reception', 'desks', 'qa', 'board', 'status', 'meeting'] as const satisfies readonly ZoneId[];

/** Portrait screens turn the overview 90°, so the floor's long side runs down the screen. */
export function overviewTurned(aspect: number): boolean {
  return aspect < 1;
}

/**
 * Height for a straight-down overview camera that fits the whole floor,
 * given the camera's vertical field of view and the viewport aspect ratio.
 */
export function overviewHeight(fovDegrees: number, aspect: number, margin = 1.08): number {
  const tanHalf = Math.tan((fovDegrees * Math.PI) / 360);
  const turned = overviewTurned(aspect);
  // Floor extent that lands across (horizontal) and down (vertical) the screen.
  const across = turned ? FLOOR.depth : FLOOR.width;
  const down = turned ? FLOOR.width : FLOOR.depth;
  const forDown = down / 2 / tanHalf;
  const forAcross = across / 2 / (tanHalf * Math.max(aspect, 0.1));
  return Math.max(forDown, forAcross) * margin;
}
