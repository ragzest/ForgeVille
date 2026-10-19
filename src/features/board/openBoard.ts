import { interactionStore } from '../../store/interaction.ts';
import { buildingDirectory, occupantOf, type FloorId } from '../../world/building.ts';
import type { WorkflowSnapshot } from '../../domain/index.ts';

/** Same id and label as the whiteboard landmark, so every route opens the same panel. */
export const BOARD_TARGET = { id: 'board', label: 'Kanban board' } as const;

export function openBoard(): void {
  interactionStore.getState().activate(BOARD_TARGET);
}

/**
 * Whose board to show from a floor: its own when a project works there,
 * otherwise the first occupied floor's (the 2D view lists that team too).
 */
export function boardFloor(snapshot: WorkflowSnapshot, floorId: FloorId): FloorId {
  if (occupantOf(snapshot, floorId)) return floorId;
  return buildingDirectory(snapshot).find((o) => o.project !== null)?.floor.id ?? floorId;
}
