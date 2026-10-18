import { describe, expect, it } from 'vitest';
import { minimalSnapshot } from '../../domain/fixtures/minimalSnapshot.ts';
import type { WorkflowEvent } from '../../domain/index.ts';
import { RECENT_EVENT_COUNT, agentIdFromDesk, clockTime, deskDetails, deskId, timeAgo } from './deskDetails.ts';

describe('deskDetails', () => {
  it('collects the agent, task, session, pull request, and events from the snapshot', () => {
    const d = deskDetails(minimalSnapshot(), 'agent-ada');
    expect(d?.agent.name).toBe('Ada');
    expect(d?.presence).toBe('awaiting_review');
    expect(d?.task?.issueKey).toBe('FV-1');
    expect(d?.task?.branch).toBe('feature/login');
    expect(d?.session?.id).toBe('session-ada-1');
    expect(d?.pullRequest?.number).toBe(1);
    expect(d?.lastActivityAt).toBe('2026-01-05T09:55:00.000Z');
    expect(d?.recentEvents.map((e) => e.id)).toEqual(['event-1']);
  });

  it('handles an agent with no task, session, or events', () => {
    const d = deskDetails(minimalSnapshot(), 'agent-rex');
    expect(d?.presence).toBe('reviewing');
    expect(d?.task).toBeNull();
    expect(d?.pullRequest).toBeNull();
    expect(d?.recentEvents).toEqual([]);
    expect(d?.lastActivityAt).toBeNull();
  });

  it('returns null for an unknown agent', () => {
    expect(deskDetails(minimalSnapshot(), 'agent-nobody')).toBeNull();
  });

  it('lists only the newest events for that agent, newest first', () => {
    const base = minimalSnapshot();
    const extra: WorkflowEvent[] = Array.from({ length: 7 }, (_, i) => ({
      id: `event-x${String(i)}`,
      timestamp: `2026-01-05T09:5${String(i)}:30.000Z`,
      type: 'task_moved',
      message: `Move ${String(i)}`,
      links: { agentId: i % 2 === 0 ? 'agent-ada' : 'agent-rex' },
    }));
    const d = deskDetails({ ...base, events: [...base.events, ...extra] }, 'agent-ada');
    expect(d?.recentEvents).toHaveLength(RECENT_EVENT_COUNT);
    expect(d?.recentEvents.map((e) => e.id)).toEqual(['event-x6', 'event-x4', 'event-x2', 'event-x0', 'event-1']);
  });

  it('uses the latest event as last activity when there is no session', () => {
    const base = minimalSnapshot();
    const d = deskDetails({ ...base, sessions: [] }, 'agent-ada');
    expect(d?.lastActivityAt).toBe('2026-01-05T09:55:00.000Z');
  });
});

describe('desk ids and time labels', () => {
  it('round-trips desk ids and ignores other ids', () => {
    expect(deskId('agent-ada')).toBe('desk:agent-ada');
    expect(agentIdFromDesk('desk:agent-ada')).toBe('agent-ada');
    expect(agentIdFromDesk('board')).toBeNull();
  });

  it('formats times on the scenario clock', () => {
    const now = '2026-01-05T10:00:00.000Z';
    expect(timeAgo('2026-01-05T09:59:30.000Z', now)).toBe('just now');
    expect(timeAgo('2026-01-05T09:55:00.000Z', now)).toBe('5 min ago');
    expect(timeAgo('2026-01-05T07:30:00.000Z', now)).toBe('2 h ago');
    expect(clockTime('2026-01-05T09:55:00.000Z')).toBe('09:55');
  });
});
