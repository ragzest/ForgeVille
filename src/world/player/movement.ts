import type { MoveInput } from './input.ts';

/**
 * Player motion on the floor plane. Pure, so it is tested without WebGL.
 * Units are metres and seconds; yaw 0 faces north (-z).
 */

export const WALK_SPEED = 2.6;
export const RUN_SPEED = 5.2;
/** Player capsule radius in plan view. */
export const PLAYER_RADIUS = 0.3;
export const EYE_HEIGHT = 1.6;
/** Look limits: never past straight up or down, so the view cannot flip. */
export const MAX_PITCH = 1.2;
export const LOOK_SENSITIVITY = 0.0022;
/** Longest stride per collision check, in seconds of movement. */
const SUBSTEP = 0.02;
/** Most movement a single frame may apply. */
const MAX_FRAME = 0.25;

export interface Box2 {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
}

export interface PlayerPose {
  x: number;
  z: number;
  /** Radians about +y; 0 faces -z. */
  yaw: number;
  /** Radians; positive looks up. */
  pitch: number;
}

/** True when a circle at (x, z) overlaps the box. */
export function circleHitsBox(x: number, z: number, radius: number, box: Box2): boolean {
  const nx = Math.max(box.minX, Math.min(x, box.maxX));
  const nz = Math.max(box.minZ, Math.min(z, box.maxZ));
  return (x - nx) ** 2 + (z - nz) ** 2 < radius ** 2;
}

export function isBlocked(x: number, z: number, colliders: readonly Box2[], radius = PLAYER_RADIUS): boolean {
  return colliders.some((box) => circleHitsBox(x, z, radius, box));
}

/** Velocity in world space for the given input and facing. */
export function moveVector(input: MoveInput, yaw: number): { dx: number; dz: number } {
  const length = Math.hypot(input.forward, input.strafe);
  if (length === 0) return { dx: 0, dz: 0 };
  const speed = input.run ? RUN_SPEED : WALK_SPEED;
  const f = input.forward / length;
  const s = input.strafe / length;
  // Forward is (-sin yaw, -cos yaw); right is (cos yaw, -sin yaw).
  return {
    dx: (-Math.sin(yaw) * f + Math.cos(yaw) * s) * speed,
    dz: (-Math.cos(yaw) * f - Math.sin(yaw) * s) * speed,
  };
}

/**
 * Advances the player by `dt` seconds. Each axis is tried separately, so the
 * player slides along a wall or desk instead of stopping dead.
 */
export function stepPlayer(pose: PlayerPose, input: MoveInput, dt: number, colliders: readonly Box2[]): PlayerPose {
  const { dx, dz } = moveVector(input, pose.yaw);
  if (dx === 0 && dz === 0) return pose;
  let { x, z } = pose;
  // Slow frames are split into small substeps so the player cannot tunnel
  // through thin walls; a very long gap (tab switch) moves at most MAX_FRAME.
  let remaining = Math.min(dt, MAX_FRAME);
  while (remaining > 0) {
    const step = Math.min(remaining, SUBSTEP);
    if (dx !== 0 && !isBlocked(x + dx * step, z, colliders)) x += dx * step;
    if (dz !== 0 && !isBlocked(x, z + dz * step, colliders)) z += dz * step;
    remaining -= step;
  }
  return { ...pose, x, z };
}

/** Applies a mouse movement to the view, clamping pitch. */
export function look(pose: PlayerPose, movementX: number, movementY: number, sensitivity = LOOK_SENSITIVITY): PlayerPose {
  const pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pose.pitch - movementY * sensitivity));
  return { ...pose, yaw: pose.yaw - movementX * sensitivity, pitch };
}
