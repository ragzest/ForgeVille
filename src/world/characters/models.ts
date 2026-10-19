import { isCelebrating, presenceInputFor, presenceOf, type WorkflowSnapshot } from '../../domain/index.ts';
import { runtimeStyle } from '../../ui/runtimes.ts';
import { CHARACTER_COLORS, HAIR_COLORS } from '../../ui/tokens.ts';
import { deskAssignments } from '../layout.ts';
import type { CharacterProps } from './Character.tsx';
import { accessoryFor, presenceLook } from './presentation.ts';

export type CharacterModel = Omit<CharacterProps, 'phase'>;

/**
 * One character per desk, posed from derived presence and the celebration hint.
 * Pure: reads the snapshot, never changes it. `agents` limits the cast to one
 * floor's team (defaults to everyone in the snapshot).
 */
export function characterModels(
  snapshot: WorkflowSnapshot,
  reducedMotion: boolean,
  agents: WorkflowSnapshot['agents'] = snapshot.agents,
): CharacterModel[] {
  return deskAssignments(agents).map((desk, i) => {
    const agent = agents.find((a) => a.id === desk.agentId);
    const name = agent?.name ?? desk.agentId;
    const task = presenceInputFor(snapshot, desk.agentId).task;
    return {
      agentId: desk.agentId,
      name,
      slot: desk.slot,
      accessory: accessoryFor(agent?.avatar ?? '', i),
      shirt: CHARACTER_COLORS[i % CHARACTER_COLORS.length] ?? CHARACTER_COLORS[0],
      hair: HAIR_COLORS[i % HAIR_COLORS.length] ?? HAIR_COLORS[0],
      accent: runtimeStyle(agent?.runtimeLabel ?? '').accent,
      tag: task ? `${name} · ${task.issueKey}` : name,
      look: presenceLook(presenceOf(snapshot, desk.agentId), {
        celebrating: isCelebrating(snapshot, desk.agentId),
        reducedMotion,
      }),
    };
  });
}
