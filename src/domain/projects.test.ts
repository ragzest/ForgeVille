import { describe, expect, it } from 'vitest';
import { minimalSnapshot } from './fixtures/minimalSnapshot.ts';
import { projectSnapshot } from './projects.ts';
import type { WorkflowEvent } from './types.ts';

const event = (id: string, links: WorkflowEvent['links']): WorkflowEvent => ({
  id,
  timestamp: '2026-01-05T10:00:00.000Z',
  type: 'task_moved',
  message: id,
  links,
});

describe('projectSnapshot', () => {
  it('keeps the whole snapshot for its only project', () => {
    const s = minimalSnapshot();
    const scoped = projectSnapshot(s, 'project-forgeville');
    expect(scoped.agents).toEqual(s.agents);
    expect(scoped.tasks).toEqual(s.tasks);
    expect(scoped.pullRequests).toEqual(s.pullRequests);
    expect(scoped.events).toEqual(s.events);
  });

  it('is empty for an unknown or missing project, with the clock kept', () => {
    const s = minimalSnapshot();
    for (const scoped of [projectSnapshot(s, 'project-nowhere'), projectSnapshot(s, null)]) {
      expect(scoped.agents).toEqual([]);
      expect(scoped.tasks).toEqual([]);
      expect(scoped.sessions).toEqual([]);
      expect(scoped.testRuns).toEqual([]);
      expect(scoped.clock).toBe(s.clock);
    }
  });

  it('places an event by its project, else by the agent, task, or pull request it links', () => {
    const base = minimalSnapshot();
    const s = {
      ...base,
      events: [
        event('named-elsewhere', { projectId: 'project-other', agentId: 'agent-ada' }),
        event('by-agent', { agentId: 'agent-ada' }),
        event('by-task', { taskId: 'task-login' }),
        event('nobody', {}),
      ],
    };
    expect(projectSnapshot(s, 'project-forgeville').events.map((e) => e.id)).toEqual(['by-agent', 'by-task']);
    expect(projectSnapshot(s, 'project-other').events.map((e) => e.id)).toEqual(['named-elsewhere']);
  });

  it('returns the same object for the same snapshot and project', () => {
    const s = minimalSnapshot();
    expect(projectSnapshot(s, 'project-forgeville')).toBe(projectSnapshot(s, 'project-forgeville'));
    expect(projectSnapshot(minimalSnapshot(), 'project-forgeville')).not.toBe(projectSnapshot(s, 'project-forgeville'));
  });
});
