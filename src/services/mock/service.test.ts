import { describe, expect, it } from 'vitest';
import { addMinutes, SCENARIO_IDS } from '../../domain/index.ts';
import { buildScenario } from './scenarios.ts';
import { COMMAND_TICK_MINUTES, createMockWorkflowService } from './service.ts';

describe('mock workflow service', () => {
  it('starts on the default scenario and loads each scenario by replacing the snapshot', () => {
    const service = createMockWorkflowService();
    expect(service.getSnapshot()).toEqual(buildScenario('feature-in-progress'));

    for (const id of SCENARIO_IDS) {
      const loaded = service.loadScenario(id);
      expect(loaded).toEqual(buildScenario(id));
      expect(service.getSnapshot()).toBe(loaded);
    }
  });

  it('reloading a scenario discards changes', () => {
    const service = createMockWorkflowService('review-and-qa-pass');
    const pristine = service.getSnapshot();
    expect(service.mergePullRequest('pr-2').ok).toBe(true);
    expect(service.loadScenario('review-and-qa-pass')).toEqual(pristine);
  });

  it('merges in the merge-ready scenario and ticks the clock', () => {
    const service = createMockWorkflowService('review-and-qa-pass');
    const before = service.getSnapshot();

    const result = service.mergePullRequest('pr-2');

    expect(result.ok).toBe(true);
    expect(result.snapshot.clock.now).toBe(addMinutes(before.clock.now, COMMAND_TICK_MINUTES));
    expect(result.snapshot.tasks.find((t) => t.id === 'task-ln-2')?.column).toBe('merged');
    expect(service.getSnapshot()).toBe(result.snapshot);

    const again = service.mergePullRequest('pr-2');
    expect(again).toMatchObject({ ok: false, reason: expect.stringMatching(/already merged/) as unknown });
  });

  it('refuses a merge in the QA-failure scenario without changing anything', () => {
    const service = createMockWorkflowService('qa-failure');
    const before = service.getSnapshot();
    const result = service.mergePullRequest('pr-2');
    expect(result.ok).toBe(false);
    expect(result.snapshot).toBe(before);
    expect(service.getSnapshot()).toBe(before);
  });

  it('unblocks only back to the recorded column in the blocked scenario', () => {
    const service = createMockWorkflowService('agent-blocked');
    const before = service.getSnapshot();

    const wrong = service.moveTask('task-ln-4', 'in_review');
    expect(wrong.ok).toBe(false);
    expect(service.getSnapshot()).toBe(before);

    const back = service.moveTask('task-ln-4', 'in_progress');
    expect(back.ok).toBe(true);
    expect(back.snapshot.tasks.find((t) => t.id === 'task-ln-4')).toMatchObject({ column: 'in_progress', blockedFrom: null });
  });

  it('runs session commands, and an interrupted session blocks moves until resumed', () => {
    const service = createMockWorkflowService();
    expect(service.interruptSession('session-ada').ok).toBe(true);
    expect(service.moveTask('task-ln-2', 'in_review')).toMatchObject({ ok: false, reason: expect.stringMatching(/interrupted/) as unknown });

    expect(service.resumeSession('session-ada').ok).toBe(true);
    expect(service.pauseSession('session-ada').ok).toBe(true);
    expect(service.moveTask('task-ln-2', 'in_review').ok).toBe(true);
  });

  it('requests changes through the port', () => {
    const service = createMockWorkflowService('review-and-qa-pass');
    const result = service.requestChanges('pr-2', 'finding-2-1');
    expect(result.ok).toBe(true);
    expect(result.snapshot.tasks.find((t) => t.id === 'task-ln-2')?.column).toBe('in_progress');
    expect(service.mergePullRequest('pr-2').ok).toBe(false);
  });

  it('returns only domain results: ok, snapshot, and a reason on failure', () => {
    const service = createMockWorkflowService();
    const results = [
      service.moveTask('task-ln-5', 'in_progress'),
      service.moveTask('task-ln-6', 'merged'),
      service.pauseSession('session-bruno'),
      service.mergePullRequest('pr-nope'),
    ];
    for (const r of results) {
      expect(Object.keys(r).sort()).toEqual(r.ok ? ['ok', 'snapshot'] : ['ok', 'reason', 'snapshot']);
    }
  });
});
