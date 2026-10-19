import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type { TaskId } from '../domain/index.ts';
import type { ZoneId } from '../world/layout.ts';

/**
 * How the office is being viewed and where the player was sent. Presentation
 * state only. The world rig reads it inside the frame loop, so changing view
 * or travelling never re-renders the panels.
 */
export type OfficeView = 'walk' | 'overview' | '2d';

export interface NavigationState {
  readonly view: OfficeView;
  /** Zone last picked from a zone list, for highlighting. */
  readonly selectedZone: ZoneId | null;
  /** Latest travel request; `seq` lets the rig tell repeat requests apart. */
  readonly travel: { readonly zone: ZoneId; readonly seq: number } | null;
  /** Task picked with "Inspect task", for the board to highlight. */
  readonly selectedTaskId: TaskId | null;
  readonly setView: (view: OfficeView) => void;
  /** Highlights a zone without moving the player (the 2D list). */
  readonly selectZone: (zone: ZoneId) => void;
  /** Selects a zone and walks the player to its anchor in the 3D office. */
  readonly travelTo: (zone: ZoneId) => void;
  readonly selectTask: (taskId: TaskId | null) => void;
}

export const INITIAL_NAVIGATION = { view: 'walk', selectedZone: null, travel: null, selectedTaskId: null } as const;

export function createNavigationStore() {
  return createStore<NavigationState>()((set, get) => ({
    ...INITIAL_NAVIGATION,
    setView: (view) => {
      if (get().view !== view) set({ view });
    },
    selectZone: (zone) => {
      set({ selectedZone: zone });
    },
    travelTo: (zone) => {
      const seq = (get().travel?.seq ?? 0) + 1;
      set({ selectedZone: zone, travel: { zone, seq }, view: 'walk' });
    },
    selectTask: (taskId) => {
      if (get().selectedTaskId !== taskId) set({ selectedTaskId: taskId });
    },
  }));
}

export const navigationStore = createNavigationStore();

export function useNavigation<T>(selector: (state: NavigationState) => T): T {
  return useStore(navigationStore, selector);
}
