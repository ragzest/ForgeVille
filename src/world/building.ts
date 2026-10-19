import type { Project, WorkflowSnapshot } from '../domain/index.ts';
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
