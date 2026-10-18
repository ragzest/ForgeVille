import type { AgentPresence } from '../../domain/index.ts';

/**
 * How a character shows its agent's presence. Pure data, so it can be tested
 * without WebGL. Status always has a shape and a text label, never colour alone.
 */
export type Pose = 'typing' | 'leaning-back' | 'slumped' | 'arms-crossed' | 'reading' | 'cheering';

/** A shape floating above the head. `none` for states that need no alert. */
export type Mark = 'none' | 'stop-sign' | 'hourglass' | 'magnifier' | 'star';

/** A short in-place loop. Reduced motion always uses `none`. */
export type Motion = 'none' | 'typing' | 'sway' | 'bounce';

export type MarkTone = 'none' | 'danger' | 'amber' | 'review' | 'success';

export interface PresenceLook {
  readonly pose: Pose;
  readonly mark: Mark;
  readonly tone: MarkTone;
  /** Text shown with the mark. Empty when there is no mark. */
  readonly label: string;
  readonly motion: Motion;
}

const LOOKS: Readonly<Record<AgentPresence, PresenceLook>> = {
  working: { pose: 'typing', mark: 'none', tone: 'none', label: '', motion: 'typing' },
  idle: { pose: 'leaning-back', mark: 'none', tone: 'none', label: '', motion: 'sway' },
  blocked: { pose: 'slumped', mark: 'stop-sign', tone: 'danger', label: 'Blocked', motion: 'none' },
  awaiting_review: { pose: 'arms-crossed', mark: 'hourglass', tone: 'amber', label: 'Awaiting review', motion: 'none' },
  reviewing: { pose: 'reading', mark: 'magnifier', tone: 'review', label: 'Reviewing', motion: 'none' },
};

const CELEBRATING: PresenceLook = { pose: 'cheering', mark: 'star', tone: 'success', label: 'Merged!', motion: 'bounce' };

export interface LookOptions {
  /** The derived celebration hint (`isCelebrating`). Never stored, never merge proof. */
  readonly celebrating: boolean;
  readonly reducedMotion: boolean;
}

export function presenceLook(presence: AgentPresence, { celebrating, reducedMotion }: LookOptions): PresenceLook {
  // Celebration only covers an otherwise calm agent; it never hides a blocker or a review.
  const base = celebrating && (presence === 'idle' || presence === 'working') ? CELEBRATING : LOOKS[presence];
  return reducedMotion ? { ...base, motion: 'none' } : base;
}

/** Accessory that gives each avatar its own silhouette. */
export type Accessory = 'pointed-ears' | 'round-ears' | 'beanie' | 'long-ears' | 'glasses' | 'crest' | 'headband';

const ACCESSORIES: Readonly<Record<string, Accessory>> = {
  fox: 'pointed-ears',
  bear: 'round-ears',
  otter: 'beanie',
  hare: 'long-ears',
  owl: 'glasses',
  heron: 'crest',
  badger: 'headband',
};

const FALLBACK_ORDER: readonly Accessory[] = ['pointed-ears', 'round-ears', 'beanie', 'long-ears', 'glasses', 'crest', 'headband'];

/** The avatar's accessory; unknown avatars get one by desk index so neighbours still differ. */
export function accessoryFor(avatar: string, index: number): Accessory {
  return ACCESSORIES[avatar] ?? FALLBACK_ORDER[index % FALLBACK_ORDER.length] ?? 'beanie';
}
