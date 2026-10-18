import type { EventId, EventLinks, WorkflowEvent, WorkflowEventType, WorkflowSnapshot } from './types.ts';

/** Next free id of the form `event-N`. Deterministic for a given snapshot. */
export function nextEventId(snapshot: WorkflowSnapshot): EventId {
  const taken = new Set(snapshot.events.map((e) => e.id));
  let n = snapshot.events.length + 1;
  while (taken.has(`event-${String(n)}`)) n += 1;
  return `event-${String(n)}`;
}

/** Returns a snapshot with one event appended, stamped with the scenario clock. */
export function appendEvent(
  snapshot: WorkflowSnapshot,
  type: WorkflowEventType,
  message: string,
  links: EventLinks,
): WorkflowSnapshot {
  const event: WorkflowEvent = {
    id: nextEventId(snapshot),
    timestamp: snapshot.clock.now,
    type,
    message,
    links,
  };
  return { ...snapshot, events: [...snapshot.events, event] };
}
