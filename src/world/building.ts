import { missionControlMetrics, projectSnapshot, type Agent, type Project, type Task, type WorkflowSnapshot } from '../domain/index.ts';
import { FLOOR_THEMES, type FloorTheme, type FloorThemeId } from '../ui/themes.ts';

/**
 * The ForgeVille building: a stack of floors that share one floor plan
 * (`layout.ts`) and differ by theme. Projects move in from the ground up, one
 * per floor, in snapshot order. Floors without a project are vacant: the
 * furniture is there, nobody works there, and nothing on them is interactive.
 *
 * Presentation only. Which floor a project sits on is derived, never stored
 * in the snapshot.
 */

export type FloorId = FloorThemeId;

export interface Floor {
  readonly id: FloorId;
  /** 1 is the ground floor. */
  readonly level: number;
  readonly theme: FloorTheme;
}

/** Bottom to top. */
export const FLOORS: readonly Floor[] = (['workshop', 'greenhouse', 'night-studio', 'ember-forge'] as const).map((id, i) => ({
  id,
  level: i + 1,
  theme: FLOOR_THEMES[id],
}));

export const DEFAULT_FLOOR: FloorId = 'workshop';

/** Storey height, used to drop the outside ground away on upper floors. */
export const STOREY_HEIGHT = 3.6;

const GROUND: Floor = { id: 'workshop', level: 1, theme: FLOOR_THEMES.workshop };

export function floorById(id: FloorId): Floor {
  return FLOORS.find((f) => f.id === id) ?? GROUND;
}

export interface FloorOccupancy {
  readonly floor: Floor;
  /** The project on this floor, or null when it is vacant. */
  readonly project: Project | null;
}

/** Every floor with the project that occupies it. Projects beyond the top floor get none. */
export function buildingDirectory(snapshot: Pick<WorkflowSnapshot, 'projects'>): FloorOccupancy[] {
  return FLOORS.map((floor, i) => ({ floor, project: snapshot.projects[i] ?? null }));
}

export function occupantOf(snapshot: Pick<WorkflowSnapshot, 'projects'>, floorId: FloorId): Project | null {
  return buildingDirectory(snapshot).find((o) => o.floor.id === floorId)?.project ?? null;
}

/** "Floor 2 · Greenhouse" */
export function floorTitle(floor: Floor): string {
  return `Floor ${String(floor.level)} · ${floor.theme.name}`;
}

/** The floor a project works on, or null when it has no floor (more projects than floors). */
export function floorOfProject(snapshot: Pick<WorkflowSnapshot, 'projects'>, projectId: string): Floor | null {
  return buildingDirectory(snapshot).find((o) => o.project?.id === projectId)?.floor ?? null;
}

/** The floor an agent works on, through their project. */
export function floorOfAgent(snapshot: Pick<WorkflowSnapshot, 'projects' | 'agents'>, agentId: string): Floor | null {
  const agent = snapshot.agents.find((a) => a.id === agentId);
  return agent ? floorOfProject(snapshot, agent.projectId) : null;
}

/**
 * The snapshot as seen from one floor: only the occupying project's records.
 * A vacant floor sees an empty office. Pure and cached per snapshot, so every
 * view of the floor filters the same store rather than keeping a list of its own.
 */
export function floorSnapshot(snapshot: WorkflowSnapshot, floorId: FloorId): WorkflowSnapshot {
  return projectSnapshot(snapshot, occupantOf(snapshot, floorId)?.id ?? null);
}

/** The agents who work on a floor. */
export function floorAgents(snapshot: WorkflowSnapshot, floorId: FloorId): readonly Agent[] {
  return floorSnapshot(snapshot, floorId).agents;
}

/** The tasks on a floor's board. */
export function floorTasks(snapshot: WorkflowSnapshot, floorId: FloorId): readonly Task[] {
  return floorSnapshot(snapshot, floorId).tasks;
}

export interface FloorSummary {
  readonly activeAgents: number;
  readonly blockedTasks: number;
}

/** What the elevator shows for a floor: the same counts mission control uses, for that floor only. Null when vacant. */
export function floorSummary(snapshot: WorkflowSnapshot, floorId: FloorId): FloorSummary | null {
  if (!occupantOf(snapshot, floorId)) return null;
  const m = missionControlMetrics(floorSnapshot(snapshot, floorId));
  return { activeAgents: m.activeAgents, blockedTasks: m.blockedTasks };
}

const count = (n: number, one: string, many: string) => `${String(n)} ${n === 1 ? one : many}`;

/** "3 active agents · ⛔ 1 blocked task", or "… · nothing blocked". */
export function floorSummaryText(summary: FloorSummary): string {
  const blocked = summary.blockedTasks > 0 ? `⛔ ${count(summary.blockedTasks, 'blocked task', 'blocked tasks')}` : 'nothing blocked';
  return `${count(summary.activeAgents, 'active agent', 'active agents')} · ${blocked}`;
}
