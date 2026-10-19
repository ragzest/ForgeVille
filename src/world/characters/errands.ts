import type { Timestamp } from '../../domain/index.ts';
import { COFFEE_CART, MEETING_TABLE, type Point2 } from '../layout.ts';

/**
 * Small errands idle agents run between tasks: a coffee, a stretch, a chat at
 * the meeting table. Each one leaves the chair and comes back to it. The plan
 * is seeded from the agent id and the scenario clock, never `Math.random`, so
 * the same agent at the same scenario time always does the same thing.
 *
 * Presentation only: an errand moves a mesh. It never changes presence, and a
 * panel never sees it.
 */

export type ErrandKind = 'coffee' | 'stretch' | 'chat';

export const ERRAND_KINDS: readonly ErrandKind[] = ['coffee', 'stretch', 'chat'];

/** Walking pace, metres per second. */
export const WALK_SPEED = 1.1;

export interface ErrandPlan {
  readonly kind: ErrandKind;
  /** Seconds between the starts of two errands. */
  readonly period: number;
  /** Seconds into each period when the agent gets up. Never 0, so a new plan starts seated. */
  readonly start: number;
  /** Seconds spent at the spot. */
  readonly dwell: number;
  /** Chair to spot, through the aisles. Walked in reverse on the way back. */
  readonly path: readonly Point2[];
  /** Heading at the spot, as a yaw (0 faces north, towards the desks' monitors). */
  readonly facing: number;
}

export type ErrandStage = 'out' | 'there' | 'back';

/** Where the agent is and what it is doing at one moment of an errand. */
export interface ErrandFrame {
  readonly kind: ErrandKind;
  readonly stage: ErrandStage;
  readonly position: Point2;
  readonly yaw: number;
  /** 0–1 through the current stage. */
  readonly progress: number;
}

/** Where an agent sits: on the chair just south of its desk slot. */
export function seatOf(slot: Point2): Point2 {
  return { x: slot.x, z: slot.z + 0.75 };
}

/** Where agents stand for a coffee: in front of the cart, facing it. */
export const COFFEE_SPOT: Point2 = { x: COFFEE_CART.center.x, z: COFFEE_CART.center.z - 0.75 };
/** Where agents stand for a chat: at the east side of the meeting table. */
export const CHAT_SPOT: Point2 = { x: MEETING_TABLE.center.x + 2.4, z: MEETING_TABLE.center.z - 0.9 };

/** East–west aisle between the two desk rows, and the one south of the back row. */
const MID_AISLE_Z = -0.85;
const SOUTH_AISLE_Z = 2.3;
/** North–south gaps between back-row desks, for front-row agents to get through. */
const ROW_GAPS_X: readonly number[] = [-5.9, -2.875, 0, 3.05];
/** Front-row seats sit north of the middle aisle. */
const FRONT_ROW_SEAT_Z = MID_AISLE_Z;

/** Yaw that faces along (dx, dz). The character's front is -z. */
export function yawToward(dx: number, dz: number): number {
  return Math.atan2(-dx, -dz);
}

/** 32-bit FNV-1a hash of a string. */
export function hashString(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A small seeded generator (mulberry32): the same seed always gives the same sequence in [0, 1). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dedupe(points: readonly Point2[]): Point2[] {
  return points.filter((p, i) => {
    const prev = points[i - 1];
    return !prev || Math.hypot(p.x - prev.x, p.z - prev.z) > 1e-3;
  });
}

/** Chair to the spot for an errand, keeping to the aisles. */
export function errandPath(kind: ErrandKind, slot: Point2): Point2[] {
  const seat = seatOf(slot);
  if (kind === 'stretch') return [seat, { x: seat.x, z: seat.z + 0.4 }];
  const toAisle: Point2[] = [seat];
  if (seat.z < FRONT_ROW_SEAT_Z) {
    // Front row: into the middle aisle, along to the nearest gap, then south.
    const gap = ROW_GAPS_X.reduce((best, x) => (Math.abs(x - seat.x) < Math.abs(best - seat.x) ? x : best));
    toAisle.push({ x: seat.x, z: MID_AISLE_Z }, { x: gap, z: MID_AISLE_Z }, { x: gap, z: SOUTH_AISLE_Z });
  } else {
    toAisle.push({ x: seat.x, z: SOUTH_AISLE_Z });
  }
  const spot = kind === 'coffee' ? COFFEE_SPOT : CHAT_SPOT;
  return dedupe([...toAisle, { x: spot.x, z: SOUTH_AISLE_Z }, spot]);
}

export function pathLength(path: readonly Point2[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    if (a && b) total += Math.hypot(b.x - a.x, b.z - a.z);
  }
  return total;
}

/** Point and heading a distance along a path. */
export function alongPath(path: readonly Point2[], distance: number): { position: Point2; yaw: number } {
  let left = Math.max(0, distance);
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    if (!a || !b) continue;
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    if (left <= length || i === path.length - 1) {
      const t = length === 0 ? 1 : Math.min(1, left / length);
      return { position: { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }, yaw: yawToward(b.x - a.x, b.z - a.z) };
    }
    left -= length;
  }
  const only = path[0] ?? { x: 0, z: 0 };
  return { position: only, yaw: 0 };
}

/** Seconds an errand takes, from getting up to sitting down again. */
export function errandDuration(plan: Pick<ErrandPlan, 'path' | 'dwell'>): number {
  return (2 * pathLength(plan.path)) / WALK_SPEED + plan.dwell;
}

/**
 * The errand an idle agent runs, seeded from its id and the scenario clock.
 * Every `period` seconds it gets up at `start`, does `kind`, and sits back down.
 */
export function errandPlan(agentId: string, slot: Point2, clock: Timestamp): ErrandPlan {
  const random = seededRandom(hashString(`${agentId}|${clock}`));
  const kind = ERRAND_KINDS[Math.floor(random() * ERRAND_KINDS.length)] ?? 'stretch';
  const path = errandPath(kind, slot);
  const dwell = kind === 'stretch' ? 3.5 + random() * 1.5 : 5 + random() * 4;
  const busy = errandDuration({ path, dwell });
  // Most of the time is spent at the desk: an errand every 35–60 s plus its own length.
  const period = busy + 35 + random() * 25;
  const start = 4 + random() * (period - busy - 8);
  const spot = path[path.length - 1] ?? seatOf(slot);
  const facing =
    kind === 'coffee'
      ? yawToward(0, 1)
      : kind === 'chat'
        ? yawToward(MEETING_TABLE.center.x - spot.x, MEETING_TABLE.center.z - spot.z)
        : 0;
  return { kind, period, start, dwell, path, facing };
}

/**
 * What the agent is doing `t` seconds after the plan was adopted, or null when
 * it is in its chair. At t = 0 every plan is seated.
 */
export function errandAt(plan: ErrandPlan, t: number): ErrandFrame | null {
  if (t < 0) return null;
  const into = (t % plan.period) - plan.start;
  const walk = pathLength(plan.path) / WALK_SPEED;
  if (into < 0 || into >= 2 * walk + plan.dwell) return null;
  const length = pathLength(plan.path);
  if (into < walk) {
    const { position, yaw } = alongPath(plan.path, (into / walk) * length);
    return { kind: plan.kind, stage: 'out', position, yaw, progress: into / walk };
  }
  if (into < walk + plan.dwell) {
    const position = plan.path[plan.path.length - 1] ?? { x: 0, z: 0 };
    return { kind: plan.kind, stage: 'there', position, yaw: plan.facing, progress: (into - walk) / plan.dwell };
  }
  const back = (into - walk - plan.dwell) / walk;
  const reversed = [...plan.path].reverse();
  const { position, yaw } = alongPath(reversed, back * length);
  return { kind: plan.kind, stage: 'back', position, yaw, progress: back };
}
