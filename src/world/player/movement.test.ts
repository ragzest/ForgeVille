import { describe, expect, it } from 'vitest';
import {
  FLOOR,
  LANDMARKS,
  PLAYER_SPAWN,
  deskAssignments,
  playerColliders,
  zoneById,
} from '../layout.ts';
import { AGENTS } from '../../services/mock/seed.ts';
import { NO_INPUT, type MoveInput } from './input.ts';
import {
  MAX_PITCH,
  PLAYER_RADIUS,
  RUN_SPEED,
  WALK_SPEED,
  circleHitsBox,
  isBlocked,
  look,
  moveVector,
  stepPlayer,
  type PlayerPose,
} from './movement.ts';

const forward: MoveInput = { forward: 1, strafe: 0, run: false };
const at = (x: number, z: number, yaw = 0): PlayerPose => ({ x, z, yaw, pitch: 0 });

/** Runs `seconds` of frames at 60 fps. */
function walk(pose: PlayerPose, input: MoveInput, seconds: number, colliders = playerColliders()): PlayerPose {
  let p = pose;
  for (let t = 0; t < seconds; t += 1 / 60) p = stepPlayer(p, input, 1 / 60, colliders);
  return p;
}

describe('moveVector', () => {
  it('moves forward along the facing direction', () => {
    const north = moveVector(forward, 0);
    expect(north.dx).toBeCloseTo(0);
    expect(north.dz).toBeCloseTo(-WALK_SPEED);

    const west = moveVector(forward, Math.PI / 2);
    expect(west.dx).toBeCloseTo(-WALK_SPEED);
    expect(west.dz).toBeCloseTo(0);
  });

  it('strafes right and runs faster', () => {
    const right = moveVector({ forward: 0, strafe: 1, run: false }, 0);
    expect(right.dx).toBeCloseTo(WALK_SPEED);
    expect(moveVector({ ...forward, run: true }, 0).dz).toBeCloseTo(-RUN_SPEED);
  });

  it('does not move faster diagonally', () => {
    const v = moveVector({ forward: 1, strafe: 1, run: false }, 0.3);
    expect(Math.hypot(v.dx, v.dz)).toBeCloseTo(WALK_SPEED);
    expect(moveVector(NO_INPUT, 1)).toEqual({ dx: 0, dz: 0 });
  });
});

describe('collisions', () => {
  const box = { minX: 0, maxX: 1, minZ: 0, maxZ: 1 };

  it('detects a circle overlapping a box', () => {
    expect(circleHitsBox(0.5, 0.5, 0.3, box)).toBe(true);
    expect(circleHitsBox(1.2, 0.5, 0.3, box)).toBe(true);
    expect(circleHitsBox(1.4, 0.5, 0.3, box)).toBe(false);
    expect(circleHitsBox(1.25, 1.25, 0.3, box)).toBe(false); // corner gap
  });

  it('stops at a wall and slides along it', () => {
    const wall = [{ minX: -10, maxX: 10, minZ: -1, maxZ: 0 }];
    // Walking north-west into a wall running east-west: z stops, x keeps going.
    const end = walk(at(0, 2, Math.PI / 4), forward, 3, wall);
    expect(end.z).toBeGreaterThanOrEqual(PLAYER_RADIUS - 0.001);
    expect(end.z).toBeLessThan(0.5);
    expect(end.x).toBeLessThan(-2);
  });

  it('keeps speed at low frame rates but cannot tunnel through thin walls', () => {
    const slowFrame = stepPlayer(at(0, 10), forward, 0.2, []);
    expect(slowFrame.z).toBeCloseTo(10 - WALK_SPEED * 0.2);

    const thin = [{ minX: -10, maxX: 10, minZ: -0.05, maxZ: 0 }];
    const end = stepPlayer(at(0, 0.4), { ...forward, run: true }, 2, thin);
    expect(end.z).toBeGreaterThan(0);
  });

  it('moves at most a quarter second after a long pause', () => {
    const end = stepPlayer(at(0, 10), forward, 5, []);
    expect(end.z).toBeCloseTo(10 - WALK_SPEED * 0.25);
  });
});

describe('office colliders', () => {
  const colliders = playerColliders();

  it('spawns the player on open floor', () => {
    expect(isBlocked(PLAYER_SPAWN.x, PLAYER_SPAWN.z, colliders)).toBe(false);
  });

  it('keeps every approach spot reachable for interaction', () => {
    for (const p of [...deskAssignments(AGENTS).map((d) => d.approach), ...LANDMARKS.map((l) => l.approach)]) {
      expect(isBlocked(p.x, p.z, colliders), JSON.stringify(p)).toBe(false);
    }
    for (const id of ['reception', 'desks', 'qa', 'board', 'status', 'meeting'] as const) {
      const { anchor } = zoneById(id);
      expect(isBlocked(anchor.x, anchor.z, colliders), id).toBe(false);
    }
  });

  it('keeps the player inside the room however long they walk', () => {
    for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2, 0.7, 2.4]) {
      const end = walk(at(PLAYER_SPAWN.x, PLAYER_SPAWN.z, yaw), { ...forward, run: true }, 8, colliders);
      expect(Math.abs(end.x)).toBeLessThan(FLOOR.width / 2);
      expect(Math.abs(end.z)).toBeLessThan(FLOOR.depth / 2);
      expect(isBlocked(end.x, end.z, colliders)).toBe(false);
    }
  });

  it('stops at a desk', () => {
    // Walk north from the aisle behind Ada's desk straight into her chair and desk.
    const ada = deskAssignments(AGENTS)[0];
    if (!ada) throw new Error('no desk');
    const end = walk(at(ada.approach.x, ada.approach.z), forward, 3, colliders);
    expect(end.z).toBeGreaterThan(ada.slot.z);
  });

  it('can walk from the entrance to the Kanban board', () => {
    // West along the open south aisle, then north up the west aisle.
    let p = walk(at(PLAYER_SPAWN.x, 3.2, Math.PI / 2), forward, 4.5, colliders);
    p = walk({ ...p, yaw: 0 }, forward, 2.5, colliders);
    const board = zoneById('board').anchor;
    expect(Math.hypot(p.x - board.x, p.z - board.z)).toBeLessThan(2.5);
  });
});

describe('look', () => {
  it('turns with the mouse and clamps pitch so the view never flips', () => {
    const turned = look(at(0, 0), 100, 0);
    expect(turned.yaw).toBeLessThan(0);
    expect(look(at(0, 0), 0, -100000).pitch).toBe(MAX_PITCH);
    expect(look(at(0, 0), 0, 100000).pitch).toBe(-MAX_PITCH);
  });
});
