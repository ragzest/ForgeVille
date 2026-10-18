import type { Timestamp, WorkflowSnapshot } from './types.ts';

/** Moves a timestamp forward by whole minutes. */
export function addMinutes(timestamp: Timestamp, minutes: number): Timestamp {
  return new Date(Date.parse(timestamp) + minutes * 60_000).toISOString();
}

/** Returns the snapshot with its scenario clock moved forward. */
export function advanceClock(snapshot: WorkflowSnapshot, minutes: number): WorkflowSnapshot {
  return { ...snapshot, clock: { now: addMinutes(snapshot.clock.now, minutes) } };
}
