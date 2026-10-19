import { describe, expect, it } from 'vitest';
import { buildScenario } from '../services/mock/scenarios.ts';
import { FLOORS, DEFAULT_FLOOR, buildingDirectory, floorById, floorTitle, occupantOf } from './building.ts';

describe('building', () => {
  it('stacks four themed floors from the ground up', () => {
    expect(FLOORS.map((f) => f.level)).toEqual([1, 2, 3, 4]);
    expect(new Set(FLOORS.map((f) => f.theme.id)).size).toBe(FLOORS.length);
    expect(floorById(DEFAULT_FLOOR).level).toBe(1);
    expect(floorTitle(floorById('greenhouse'))).toBe('Floor 2 · Greenhouse');
  });

  it('moves projects in from the ground floor, leaving the rest vacant', () => {
    const snapshot = buildScenario('feature-in-progress');
    const directory = buildingDirectory(snapshot);
    expect(directory[0]?.project?.name).toBe('Lantern');
    expect(directory.slice(1).every((o) => o.project === null)).toBe(true);
    expect(occupantOf(snapshot, 'workshop')?.id).toBe(snapshot.projects[0]?.id);
    expect(occupantOf(snapshot, 'night-studio')).toBeNull();
  });

  it('gives a second project the second floor, and never invents a floor', () => {
    const snapshot = buildScenario('feature-in-progress');
    const projects = [0, 1, 2, 3, 4].map((i) => ({ id: `p${String(i)}`, name: `P${String(i)}`, description: '' }));
    const directory = buildingDirectory({ projects });
    expect(directory).toHaveLength(FLOORS.length);
    expect(directory[1]?.project?.name).toBe('P1');
    // Derived only: the snapshot itself is untouched.
    expect(snapshot.projects).toHaveLength(1);
  });
});
