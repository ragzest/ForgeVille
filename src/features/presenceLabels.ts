import type { AgentPresence } from '../domain/index.ts';
import type { Mark } from '../world/characters/presentation.ts';

/** Presence as words. Colour and icons only ever repeat this text. */
export const PRESENCE_TEXT: Readonly<Record<AgentPresence, string>> = {
  working: 'Working',
  idle: 'Idle',
  blocked: 'Blocked',
  awaiting_review: 'Awaiting review',
  reviewing: 'Reviewing',
};

export const MARK_ICON: Readonly<Record<Exclude<Mark, 'none'>, string>> = {
  'stop-sign': '⛔',
  hourglass: '⏳',
  magnifier: '🔍',
  star: '★',
};
