import { LANDMARKS, deskAssignments, deskFootprint, type Footprint, type Point2 } from './layout.ts';

/** How close (metres, to the object's footprint) the player must be to use it. */
export const INTERACT_RADIUS = 1.5;

export interface InteractionTarget {
  /** Stable interactive id: `desk:{agentId}`, `board`, `qa-screen`, `status-display`, `reception`. */
  readonly id: string;
  /** Shown in the hint and the panel title, e.g. "Ada's desk". */
  readonly label: string;
  readonly footprint: Footprint;
}

/** Every interactive object for the current agents: one desk each plus the landmarks. */
export function interactionTargets(agents: readonly { readonly id: string; readonly name: string }[]): InteractionTarget[] {
  const desks = deskAssignments(agents).map((desk) => ({
    id: desk.id,
    label: `${agents.find((a) => a.id === desk.agentId)?.name ?? desk.agentId}'s desk`,
    footprint: deskFootprint(desk.slot),
  }));
  const landmarks = LANDMARKS.map((l) => ({ id: l.id, label: l.label, footprint: l.footprint }));
  return [...desks, ...landmarks];
}

/** Distance from a point to the nearest edge of a footprint; 0 inside it. */
export function distanceToFootprint(p: Point2, f: Footprint): number {
  const dx = Math.max(f.center.x - f.width / 2 - p.x, 0, p.x - (f.center.x + f.width / 2));
  const dz = Math.max(f.center.z - f.depth / 2 - p.z, 0, p.z - (f.center.z + f.depth / 2));
  return Math.hypot(dx, dz);
}

/** The nearest target within `radius`, or null. Ties go to the earlier target. */
export function nearestTarget(
  p: Point2,
  targets: readonly InteractionTarget[],
  radius: number = INTERACT_RADIUS,
): InteractionTarget | null {
  let best: InteractionTarget | null = null;
  let bestDistance = radius;
  for (const target of targets) {
    const d = distanceToFootprint(p, target.footprint);
    if (d <= bestDistance && (best === null || d < bestDistance)) {
      best = target;
      bestDistance = d;
    }
  }
  return best;
}
