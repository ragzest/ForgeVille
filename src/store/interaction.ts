import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

/**
 * What the player is looking at and what is open. Presentation state only;
 * it never holds workflow data. Written by the world rig only when the focus
 * changes, so subscribers do not re-render while the player walks.
 */
export interface InteractionState {
  /** Nearest interactive object within reach, or null. */
  readonly focused: { readonly id: string; readonly label: string } | null;
  /** Object whose panel is open, or null. */
  readonly open: { readonly id: string; readonly label: string } | null;
  readonly setFocused: (target: { id: string; label: string } | null) => void;
  readonly activate: (target: { id: string; label: string }) => void;
  readonly close: () => void;
}

export function createInteractionStore() {
  return createStore<InteractionState>()((set, get) => ({
    focused: null,
    open: null,
    setFocused: (target) => {
      if (get().focused?.id === target?.id) return;
      set({ focused: target ? { id: target.id, label: target.label } : null });
    },
    activate: (target) => {
      set({ open: { id: target.id, label: target.label } });
    },
    close: () => {
      if (get().open) set({ open: null });
    },
  }));
}

/** The app's interaction store. Tests call `interactionStore.setState(INITIAL_INTERACTION)` to reset it. */
export const interactionStore = createInteractionStore();

export const INITIAL_INTERACTION = { focused: null, open: null } as const;

export function useInteraction<T>(selector: (state: InteractionState) => T): T {
  return useStore(interactionStore, selector);
}
