import { DESK_SLOTS, type DeskAssignment, type Point2 } from './layout.ts';
import { VACANT_SCREEN, type ScreenModel } from './screens/screenModel.ts';

/** One desk as the furniture draws it: where it is, who sits there, and what the monitor shows. */
export interface DeskView {
  readonly slot: Point2;
  /** Null on a vacant floor. */
  readonly desk: DeskAssignment | null;
  readonly name: string;
  readonly screen: ScreenModel;
}

/** Desk views for a vacant floor: every slot furnished, nobody home. */
export function vacantDesks(): DeskView[] {
  return DESK_SLOTS.map((slot) => ({ slot, desk: null, name: '', screen: VACANT_SCREEN }));
}

/** A floor's desks: its team's desks first, then the empty slots, so a small team still sits in a furnished room. */
export function floorDesks(occupied: readonly DeskView[]): DeskView[] {
  return [...occupied, ...vacantDesks().slice(occupied.length)];
}
