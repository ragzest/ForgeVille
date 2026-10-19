import { interactionStore } from '../../store/interaction.ts';

/** Same id and label as the QA screen landmark, so every route opens the same panel. */
export const QA_TARGET = { id: 'qa-screen', label: 'QA screen' } as const;

export function openQa(): void {
  interactionStore.getState().activate(QA_TARGET);
}
