import { describe, expect, it } from 'vitest';
import { AGENTS } from '../services/mock/seed.ts';
import { INTERACT_RADIUS, distanceToFootprint, interactionTargets, nearestTarget, type InteractionTarget } from './interaction.ts';
import { LANDMARKS, PLAYER_SPAWN, deskAssignments, interactiveIds } from './layout.ts';

const square = (id: string, x: number, z: number): InteractionTarget => ({
  id,
  label: id,
  footprint: { center: { x, z }, width: 1, depth: 1 },
});

describe('distanceToFootprint', () => {
  const f = { center: { x: 0, z: 0 }, width: 2, depth: 1 };
  it('measures to the nearest edge, and is zero inside', () => {
    expect(distanceToFootprint({ x: 0, z: 0 }, f)).toBe(0);
    expect(distanceToFootprint({ x: 3, z: 0 }, f)).toBe(2);
    expect(distanceToFootprint({ x: 0, z: -1.5 }, f)).toBe(1);
    expect(distanceToFootprint({ x: 4, z: 4.5 }, f)).toBeCloseTo(5);
  });
});

describe('nearestTarget', () => {
  // Footprint edges sit at these distances from the origin: a 0.5, b 1.0, c 1.2, far 3.5.
  const targets = [square('far', 4, 0), square('c', 0, 1.7), square('b', -1.5, 0), square('a', 1, 0)];

  it('picks the nearest target within reach', () => {
    expect(nearestTarget({ x: 0, z: 0 }, targets)?.id).toBe('a');
  });

  it('ignores targets beyond the radius', () => {
    expect(nearestTarget({ x: 0, z: 0 }, [square('far', 4, 0)])).toBeNull();
    expect(nearestTarget({ x: 0, z: 0 }, targets, 0.4)).toBeNull();
    expect(nearestTarget({ x: 0, z: 0 }, [square('edge', INTERACT_RADIUS + 0.5, 0)])?.id).toBe('edge');
  });

  it('changes target as the player moves', () => {
    expect(nearestTarget({ x: -0.8, z: 0 }, targets)?.id).toBe('b');
    expect(nearestTarget({ x: 0, z: 1 }, targets)?.id).toBe('c');
  });

  it('keeps the earlier target on a tie', () => {
    expect(nearestTarget({ x: 0, z: 0 }, [square('first', 1, 0), square('second', -1, 0)])?.id).toBe('first');
  });

  it('returns null with no targets', () => {
    expect(nearestTarget({ x: 0, z: 0 }, [])).toBeNull();
  });
});

describe('office targets', () => {
  const targets = interactionTargets(AGENTS);

  it('covers every desk and landmark with readable labels', () => {
    expect(targets.map((t) => t.id)).toEqual(interactiveIds(AGENTS));
    expect(targets.find((t) => t.id === 'desk:agent-ada')?.label).toBe("Ada's desk");
    expect(targets.find((t) => t.id === 'board')?.label).toBe('Kanban board');
  });

  it('focuses each object from its own approach spot', () => {
    for (const desk of deskAssignments(AGENTS)) expect(nearestTarget(desk.approach, targets)?.id).toBe(desk.id);
    for (const l of LANDMARKS) expect(nearestTarget(l.approach, targets)?.id, l.id).toBe(l.id);
  });

  it('shows no hint at the entrance', () => {
    expect(nearestTarget(PLAYER_SPAWN, targets)).toBeNull();
  });
});
