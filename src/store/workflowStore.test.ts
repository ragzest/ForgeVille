import { describe, expect, it, vi } from 'vitest';
import { buildScenario } from '../services/mock/index.ts';
import { createWorkflowStore } from './workflowStore.ts';

const column = (store: ReturnType<typeof createWorkflowStore>, taskId: string) =>
  store.getState().snapshot.tasks.find((t) => t.id === taskId)?.column;

describe('workflow store', () => {
  it('exposes the snapshot and notifies subscribers when a task moves', () => {
    const store = createWorkflowStore();
    const seen: string[] = [];
    const unsubscribe = store.subscribe((state) => {
      const c = state.snapshot.tasks.find((t) => t.id === 'task-ln-5')?.column;
      if (c) seen.push(c);
    });

    const result = store.getState().moveTask('task-ln-5', 'in_progress');

    expect(result.ok).toBe(true);
    expect(seen).toEqual(['in_progress']);
    expect(column(store, 'task-ln-5')).toBe('in_progress');
    expect(store.getState().lastResult).toBe(result);
    unsubscribe();
  });

  it('keeps the snapshot and records the reason when a command is refused', () => {
    const store = createWorkflowStore();
    const before = store.getState().snapshot;

    const result = store.getState().moveTask('task-ln-6', 'merged');

    expect(result.ok).toBe(false);
    expect(store.getState().snapshot).toBe(before);
    expect(store.getState().lastResult).toMatchObject({ ok: false, reason: expect.stringMatching(/pull request/) as unknown });
  });

  it('replaces the snapshot when a scenario loads', () => {
    const store = createWorkflowStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.getState().loadScenario('agent-blocked');

    expect(store.getState().snapshot).toEqual(buildScenario('agent-blocked'));
    expect(store.getState().lastResult).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('dispatches merges through the port', () => {
    const store = createWorkflowStore();
    store.getState().loadScenario('review-and-qa-pass');
    expect(store.getState().mergePullRequest('pr-2').ok).toBe(true);
    expect(column(store, 'task-ln-2')).toBe('merged');
  });
});
