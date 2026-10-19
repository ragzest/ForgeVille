import { describe, expect, it } from 'vitest';
import { buildScenario } from '../../services/mock/scenarios.ts';
import { createWorkflowStore } from '../../store/workflowStore.ts';
import { floorSnapshot } from '../building.ts';
import { characterModels } from './models.ts';

const byName = (models: ReturnType<typeof characterModels>) => Object.fromEntries(models.map((m) => [m.name, m.look]));

describe('characterModels', () => {
  it('gives every agent on the floor a character at their desk', () => {
    const floor = floorSnapshot(buildScenario('feature-in-progress'), 'workshop');
    const models = characterModels(floor, false);
    expect(models.map((m) => m.agentId)).toEqual(floor.agents.map((a) => a.id));
    expect(new Set(models.map((m) => m.accessory)).size).toBe(models.length);
  });

  it('poses the blocked scenario differently from the implementing scenario', () => {
    const implementing = byName(characterModels(buildScenario('feature-in-progress'), false));
    const blocked = byName(characterModels(buildScenario('agent-blocked'), false));

    expect(implementing.Chen).toMatchObject({ pose: 'typing', mark: 'none' });
    expect(blocked.Chen).toMatchObject({ pose: 'slumped', mark: 'stop-sign', label: 'Blocked' });
    expect(blocked.Bruno?.pose).toBe('typing');
  });

  it('shows review states and the celebration hint', () => {
    const review = byName(characterModels(buildScenario('review-and-qa-pass'), false));
    expect(review.Ada).toMatchObject({ pose: 'arms-crossed', mark: 'hourglass' });
    expect(review.Fern).toMatchObject({ pose: 'reading', mark: 'magnifier' });

    const merged = byName(characterModels(buildScenario('successful-merge'), false));
    expect(merged.Ada).toMatchObject({ pose: 'cheering', mark: 'star' });
    expect(merged.Fern?.pose).toBe('leaning-back');
  });

  it('follows the store when the scenario changes, without touching it', () => {
    const store = createWorkflowStore();
    const before = store.getState().snapshot;
    expect(byName(characterModels(before, false)).Chen?.pose).toBe('typing');

    store.getState().loadScenario('agent-blocked');
    const after = store.getState().snapshot;
    expect(byName(characterModels(after, false)).Chen?.pose).toBe('slumped');
    expect(store.getState().snapshot).toBe(after);
  });

  it('uses static poses with reduced motion', () => {
    for (const m of characterModels(buildScenario('successful-merge'), true)) expect(m.look.motion).toBe('none');
  });
});

describe('ambient life', () => {
  it('gives idle agents an errand and keeps everyone else at their desk', () => {
    const snapshot = buildScenario('successful-merge');
    const models = characterModels(snapshot, false);
    const fern = models.find((m) => m.name === 'Fern');
    expect(fern?.look.pose).toBe('leaning-back');
    expect(fern?.errand).not.toBeNull();
    for (const m of models) {
      if (m.look.pose !== 'leaning-back') expect(m.errand, m.name).toBeNull();
    }
    expect(models.find((m) => m.name === 'Ada')?.errand).toBeNull();
  });

  it('seeds errands from the scenario clock, so the same snapshot plans the same errands', () => {
    const snapshot = buildScenario('successful-merge');
    expect(characterModels(snapshot, false).map((m) => m.errand)).toEqual(characterModels(snapshot, false).map((m) => m.errand));
  });

  it("plays confetti at the merge author's desk only", () => {
    const models = characterModels(buildScenario('successful-merge'), false);
    expect(models.find((m) => m.name === 'Ada')?.confetti).toMatch(/.+/);
    for (const m of models) if (m.name !== 'Ada') expect(m.confetti, m.name).toBeNull();
    expect(characterModels(buildScenario('agent-blocked'), false).every((m) => m.confetti === null)).toBe(true);
  });

  it('turns errands, confetti, and sighs off with reduced motion', () => {
    for (const id of ['successful-merge', 'agent-blocked'] as const) {
      for (const m of characterModels(buildScenario(id), true)) {
        expect(m.errand).toBeNull();
        expect(m.confetti).toBeNull();
        expect(m.look.motion).toBe('none');
      }
    }
  });

  it('makes blocked agents sigh and working agents type', () => {
    const blocked = byName(characterModels(buildScenario('agent-blocked'), false));
    expect(blocked.Chen?.motion).toBe('sigh');
    expect(blocked.Bruno?.motion).toBe('typing');
  });
});
