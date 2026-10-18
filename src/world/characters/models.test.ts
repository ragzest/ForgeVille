import { describe, expect, it } from 'vitest';
import { buildScenario } from '../../services/mock/scenarios.ts';
import { createWorkflowStore } from '../../store/workflowStore.ts';
import { characterModels } from './models.ts';

const byName = (models: ReturnType<typeof characterModels>) => Object.fromEntries(models.map((m) => [m.name, m.look]));

describe('characterModels', () => {
  it('gives every seeded agent a character at their desk', () => {
    const models = characterModels(buildScenario('feature-in-progress'), false);
    expect(models.map((m) => m.agentId)).toEqual(buildScenario('feature-in-progress').agents.map((a) => a.id));
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
