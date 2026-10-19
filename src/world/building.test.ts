import { describe, expect, it } from 'vitest';
import { buildScenario } from '../services/mock/scenarios.ts';
import { SCENARIO_IDS } from '../domain/index.ts';
import {
  FLOORS,
  DEFAULT_FLOOR,
  buildingDirectory,
  floorAgents,
  floorById,
  floorOfAgent,
  floorSnapshot,
  floorSummary,
  floorSummaryText,
  floorTasks,
  floorTitle,
  occupantOf,
} from './building.ts';

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
    expect(directory.map((o) => o.project?.name ?? null)).toEqual(['Lantern', 'Sprout', null, null]);
    expect(occupantOf(snapshot, 'workshop')?.id).toBe(snapshot.projects[0]?.id);
    expect(occupantOf(snapshot, 'greenhouse')?.id).toBe(snapshot.projects[1]?.id);
    expect(occupantOf(snapshot, 'night-studio')).toBeNull();
  });

  it('keeps every scenario\'s first project on floor 1', () => {
    for (const id of SCENARIO_IDS) {
      const snapshot = buildScenario(id);
      expect(occupantOf(snapshot, 'workshop')?.name, id).toBe('Lantern');
      expect(occupantOf(snapshot, 'greenhouse')?.name, id).toBe('Sprout');
    }
  });

  it('gives a second project the second floor, and never invents a floor', () => {
    const snapshot = buildScenario('feature-in-progress');
    const projects = [0, 1, 2, 3, 4].map((i) => ({ id: `p${String(i)}`, name: `P${String(i)}`, description: '' }));
    const directory = buildingDirectory({ projects });
    expect(directory).toHaveLength(FLOORS.length);
    expect(directory[1]?.project?.name).toBe('P1');
    // Derived only: the snapshot itself is untouched.
    expect(snapshot.projects).toHaveLength(2);
  });
});

describe('floor selectors', () => {
  const snapshot = buildScenario('feature-in-progress');

  it('splits agents and tasks by floor with nothing shared or lost', () => {
    const names = (floor: 'workshop' | 'greenhouse') => floorAgents(snapshot, floor).map((a) => a.name);
    expect(names('workshop')).toEqual(['Ada', 'Bruno', 'Chen', 'Dara', 'Eli', 'Fern', 'Gus']);
    expect(names('greenhouse')).toEqual(['Hana', 'Ivo', 'Juno', 'Kit']);
    expect(floorTasks(snapshot, 'greenhouse').map((t) => t.issueKey)).toEqual(['SP-1', 'SP-2', 'SP-3', 'SP-4']);
    expect(floorTasks(snapshot, 'workshop').every((t) => t.issueKey.startsWith('LN-'))).toBe(true);
    const all = FLOORS.flatMap((f) => floorTasks(snapshot, f.id)).length;
    expect(all).toBe(snapshot.tasks.length);
    expect(floorAgents(snapshot, 'night-studio')).toEqual([]);
  });

  it('is a selector over the snapshot, not a copy', () => {
    const upstairs = floorSnapshot(snapshot, 'greenhouse');
    // Same records, same cached result for the same snapshot.
    expect(upstairs.agents[0]).toBe(snapshot.agents.find((a) => a.id === 'agent-hana'));
    expect(floorSnapshot(snapshot, 'greenhouse')).toBe(upstairs);
    expect(upstairs.clock).toBe(snapshot.clock);
    expect(upstairs.sessions.map((s) => s.id).sort()).toEqual(['session-hana', 'session-ivo']);
    expect(upstairs.events.every((e) => e.links.projectId === 'project-sprout')).toBe(true);
    expect(upstairs.pullRequests).toEqual([]);
    // Lantern's pull request, runs, and review stay on Lantern's floor.
    const home = floorSnapshot(snapshot, 'workshop');
    expect(home.pullRequests.map((p) => p.id)).toEqual(['pr-1']);
    expect(home.testRuns).toHaveLength(3);
    expect(home.reviewReports).toHaveLength(1);
  });

  it('finds an agent\'s floor through their project', () => {
    expect(floorOfAgent(snapshot, 'agent-ada')?.level).toBe(1);
    expect(floorOfAgent(snapshot, 'agent-hana')?.level).toBe(2);
    expect(floorOfAgent(snapshot, 'agent-ghost')).toBeNull();
  });

  it('summarises each floor for the elevator', () => {
    expect(floorSummary(snapshot, 'workshop')).toEqual({ activeAgents: 3, blockedTasks: 0 });
    expect(floorSummary(snapshot, 'greenhouse')).toEqual({ activeAgents: 2, blockedTasks: 0 });
    expect(floorSummary(snapshot, 'ember-forge')).toBeNull();
    const blocked = buildScenario('agent-blocked');
    expect(floorSummary(blocked, 'workshop')).toEqual({ activeAgents: 2, blockedTasks: 1 });
    expect(floorSummaryText({ activeAgents: 2, blockedTasks: 1 })).toBe('2 active agents · ⛔ 1 blocked task');
    expect(floorSummaryText({ activeAgents: 1, blockedTasks: 0 })).toBe('1 active agent · nothing blocked');
  });
});
