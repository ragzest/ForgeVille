import { afterEach, describe, expect, it, vi } from 'vitest';
import { DESK_SLOTS, FLOOR, MEETING_TABLE, playerColliders, type Point2 } from '../layout.ts';
import { COFFEE_SPOT, ERRAND_KINDS, WALK_SPEED, errandAt, errandDuration, errandPath, errandPlan, pathLength, seatOf, type ErrandKind } from './errands.ts';

const CLOCK = '2026-03-02T08:30:00.000Z';
const LATER = '2026-03-02T08:45:00.000Z';
const SLOT = DESK_SLOTS[1] ?? { x: 0, z: 0 };

afterEach(() => {
  vi.restoreAllMocks();
});

describe('errand schedule', () => {
  it('is deterministic for a given agent and clock', () => {
    const a = errandPlan('agent-fern', SLOT, CLOCK);
    const b = errandPlan('agent-fern', SLOT, CLOCK);
    expect(a).toEqual(b);
    for (let t = 0; t < 200; t += 0.7) expect(errandAt(a, t)).toEqual(errandAt(b, t));
  });

  it('never calls Math.random', () => {
    const random = vi.spyOn(Math, 'random');
    const plan = errandPlan('agent-ada', SLOT, CLOCK);
    for (let t = 0; t < 120; t += 1) errandAt(plan, t);
    expect(random).not.toHaveBeenCalled();
  });

  it('varies with the agent and with the scenario clock', () => {
    const plans = ['agent-ada', 'agent-bruno', 'agent-chen', 'agent-fern', 'agent-gus'].flatMap((id) => [
      errandPlan(id, SLOT, CLOCK),
      errandPlan(id, SLOT, LATER),
    ]);
    expect(new Set(plans.map((p) => `${p.kind}|${p.start.toFixed(3)}|${p.period.toFixed(3)}`)).size).toBe(plans.length);
    expect(new Set(plans.map((p) => p.kind)).size).toBe(ERRAND_KINDS.length);
  });

  it('starts every plan in the chair and spends most of the time there', () => {
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f']) {
      const plan = errandPlan(id, SLOT, CLOCK);
      expect(errandAt(plan, 0)).toBeNull();
      expect(plan.start).toBeGreaterThan(0);
      expect(errandDuration(plan)).toBeLessThan(plan.period / 2);
    }
  });

  it('goes out, stays, and comes back to the chair', () => {
    const plan = errandPlan('agent-ada', SLOT, CLOCK);
    const walk = pathLength(plan.path) / WALK_SPEED;
    expect(errandAt(plan, plan.start + walk / 2)?.stage).toBe('out');
    const there = errandAt(plan, plan.start + walk + plan.dwell / 2);
    expect(there?.stage).toBe('there');
    expect(there?.position).toEqual(plan.path[plan.path.length - 1]);
    const almostHome = errandAt(plan, plan.start + 2 * walk + plan.dwell - 1e-3);
    expect(almostHome?.stage).toBe('back');
    const seat = seatOf(SLOT);
    expect(almostHome?.position.x).toBeCloseTo(seat.x, 2);
    expect(almostHome?.position.z).toBeCloseTo(seat.z, 2);
    expect(errandAt(plan, plan.start + 2 * walk + plan.dwell + 0.01)).toBeNull();
    // And the next period repeats it.
    const again = errandAt(plan, plan.period + plan.start + walk / 2);
    const first = errandAt(plan, plan.start + walk / 2);
    expect(again?.stage).toBe(first?.stage);
    expect(again?.position.x).toBeCloseTo(first?.position.x ?? NaN, 6);
    expect(again?.position.z).toBeCloseTo(first?.position.z ?? NaN, 6);
  });

  it('walks every desk to every spot through the aisles, not through furniture', () => {
    const colliders = playerColliders();
    const inside = (p: Point2) => colliders.some((b) => p.x > b.minX && p.x < b.maxX && p.z > b.minZ && p.z < b.maxZ);
    for (const slot of DESK_SLOTS) {
      const seat = seatOf(slot);
      for (const kind of ['coffee', 'chat'] as ErrandKind[]) {
        const path = errandPath(kind, slot);
        expect(path[0]).toEqual(seat);
        const length = pathLength(path);
        for (let d = 0; d <= length; d += 0.1) {
          const p = sampleAlong(path, d);
          expect(Math.abs(p.x)).toBeLessThan(FLOOR.width / 2);
          expect(Math.abs(p.z)).toBeLessThan(FLOOR.depth / 2);
          // The first stretch leaves the agent's own chair, which sits inside its desk's footprint.
          if (Math.hypot(p.x - seat.x, p.z - seat.z) > 0.8) expect(inside(p), `${kind} from ${String(slot.x)},${String(slot.z)} at ${p.x.toFixed(2)},${p.z.toFixed(2)}`).toBe(false);
        }
      }
    }
  });

  it('faces the cart for coffee and the table for a chat', () => {
    const coffee = findPlan('coffee');
    expect(coffee.path[coffee.path.length - 1]).toEqual(COFFEE_SPOT);
    expect(Math.abs(coffee.facing)).toBeCloseTo(Math.PI);
    const chat = findPlan('chat');
    const spot = chat.path[chat.path.length - 1] ?? { x: 0, z: 0 };
    const forward = { x: -Math.sin(chat.facing), z: -Math.cos(chat.facing) };
    const toTable = { x: MEETING_TABLE.center.x - spot.x, z: MEETING_TABLE.center.z - spot.z };
    expect(forward.x * toTable.x + forward.z * toTable.z).toBeGreaterThan(0);
  });
});

function sampleAlong(path: readonly Point2[], distance: number): Point2 {
  let left = distance;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    if (!a || !b) continue;
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (left <= len) return { x: a.x + ((b.x - a.x) * left) / len, z: a.z + ((b.z - a.z) * left) / len };
    left -= len;
  }
  return path[path.length - 1] ?? { x: 0, z: 0 };
}

function findPlan(kind: ErrandKind) {
  for (let i = 0; i < 200; i++) {
    const plan = errandPlan(`agent-${String(i)}`, SLOT, CLOCK);
    if (plan.kind === kind) return plan;
  }
  throw new Error(`no ${kind} plan found`);
}
