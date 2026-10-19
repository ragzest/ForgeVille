import type { AgentPresence } from '../domain/index.ts';
import { presenceLook } from '../world/characters/presentation.ts';
import { MARK_ICON, PRESENCE_TEXT } from './presenceLabels.ts';

/** Presence as text, with the same icon the character shows. */
export function PresenceBadge({ presence }: { presence: AgentPresence }) {
  const look = presenceLook(presence, { celebrating: false, reducedMotion: true });
  return (
    <span className={`presence presence--${presence}`}>
      {look.mark !== 'none' && <span aria-hidden="true">{MARK_ICON[look.mark]} </span>}
      {PRESENCE_TEXT[presence]}
    </span>
  );
}
