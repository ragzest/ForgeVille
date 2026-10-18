import { isCelebrating, presenceOf, type WorkflowSnapshot } from '../../domain/index.ts';
import { CHARACTER_COLORS } from '../../ui/tokens.ts';
import { deskAssignments } from '../layout.ts';
import type { CharacterProps } from './Character.tsx';
import { accessoryFor, presenceLook } from './presentation.ts';

export type CharacterModel = Omit<CharacterProps, 'phase'>;

/**
 * One character per desk, posed from derived presence and the celebration hint.
 * Pure: reads the snapshot, never changes it.
 */
export function characterModels(snapshot: WorkflowSnapshot, reducedMotion: boolean): CharacterModel[] {
  const { agents } = snapshot;
  return deskAssignments(agents).map((desk, i) => {
    const agent = agents.find((a) => a.id === desk.agentId);
    return {
      agentId: desk.agentId,
      name: agent?.name ?? desk.agentId,
      slot: desk.slot,
      accessory: accessoryFor(agent?.avatar ?? '', i),
      shirt: CHARACTER_COLORS[i % CHARACTER_COLORS.length] ?? CHARACTER_COLORS[0],
      look: presenceLook(presenceOf(snapshot, desk.agentId), {
        celebrating: isCelebrating(snapshot, desk.agentId),
        reducedMotion,
      }),
    };
  });
}
