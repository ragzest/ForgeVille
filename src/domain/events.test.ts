import { describe, expect, it } from 'vitest';
import { appendEvent, nextEventId } from './events.ts';
import { minimalSnapshot } from './fixtures/minimalSnapshot.ts';

describe('events', () => {
  it('picks the next free event id', () => {
    const s = minimalSnapshot(); // has event-1
    expect(nextEventId(s)).toBe('event-2');
    const [first] = s.events;
    if (!first) throw new Error('fixture has no events');
    const clash = { ...s, events: [...s.events, { ...first, id: 'event-2' }] };
    expect(nextEventId(clash)).toBe('event-3');
  });

  it('appends an event stamped with the scenario clock', () => {
    const s = minimalSnapshot();
    const next = appendEvent(s, 'task_moved', 'Moved.', { taskId: 'task-login' });
    expect(next.events).toHaveLength(2);
    expect(next.events[1]).toEqual({
      id: 'event-2',
      timestamp: s.clock.now,
      type: 'task_moved',
      message: 'Moved.',
      links: { taskId: 'task-login' },
    });
    expect(s.events).toHaveLength(1);
  });
});
