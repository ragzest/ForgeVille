import { isCelebrating, presenceInputFor, presenceOf, type WorkflowSnapshot } from '../../domain/index.ts';
import { runtimeStyle } from '../../ui/runtimes.ts';
import { CHARACTER_COLORS, HAIR_COLORS } from '../../ui/tokens.ts';
import { deskAssignments } from '../layout.ts';
import type { CharacterProps } from './Character.tsx';
import { errandPlan } from './errands.ts';
import { accessoryFor, presenceLook } from './presentation.ts';

export type CharacterModel = Omit<CharacterProps, 'phase'>;

/** The merge event an agent is celebrating, if any: its id keys one confetti burst. */
function celebratedMerge(snapshot: WorkflowSnapshot, agentId: string): string | null {
  if (!isCelebrating(snapshot, agentId)) return null;
  const merges = snapshot.events
    .filter((e) => e.type === 'pull_request_merged' && e.links.agentId === agentId)
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  return merges[merges.length - 1]?.id ?? null;
}

/**
 * One character per desk, posed from derived presence and the celebration hint.
 * Idle agents get an errand plan and a fresh merge gets a confetti burst, both
 * off under reduced motion. Pure: reads the snapshot, never changes it. `agents` limits the cast to one
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
    const presence = presenceOf(snapshot, desk.agentId);
    const celebrating = isCelebrating(snapshot, desk.agentId);
    return {
      agentId: desk.agentId,
      name,
      slot: desk.slot,
      accessory: accessoryFor(agent?.avatar ?? '', i),
      shirt: CHARACTER_COLORS[i % CHARACTER_COLORS.length] ?? CHARACTER_COLORS[0],
      hair: HAIR_COLORS[i % HAIR_COLORS.length] ?? HAIR_COLORS[0],
      accent: runtimeStyle(agent?.runtimeLabel ?? '').accent,
      tag: task ? `${name} · ${task.issueKey}` : name,
      look: presenceLook(presence, { celebrating, reducedMotion }),
      // Only a calm, idle agent wanders off; never one that is blocked, reviewing, or celebrating.
      errand: !reducedMotion && presence === 'idle' && !celebrating ? errandPlan(desk.agentId, desk.slot, snapshot.clock.now) : null,
      confetti: reducedMotion ? null : celebratedMerge(snapshot, desk.agentId),
    };
  });
}
