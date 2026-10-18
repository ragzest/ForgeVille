import { describe, expect, it, vi } from 'vitest';
import { createInteractionStore } from './interaction.ts';

const ada = { id: 'desk:agent-ada', label: "Ada's desk" };

describe('interaction store', () => {
  it('notifies only when the focus actually changes', () => {
    const store = createInteractionStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.getState().setFocused(ada);
    store.getState().setFocused({ ...ada });
    store.getState().setFocused(ada);
    expect(listener).toHaveBeenCalledTimes(1);

    store.getState().setFocused(null);
    store.getState().setFocused(null);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('opens and closes a panel', () => {
    const store = createInteractionStore();
    store.getState().activate(ada);
    expect(store.getState().open).toEqual(ada);
    store.getState().close();
    expect(store.getState().open).toBeNull();
  });
});
