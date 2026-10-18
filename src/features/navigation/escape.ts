/**
 * Escape order: while the pointer is locked the browser uses Escape to unlock,
 * so that press must not also close a panel. Some browsers still deliver the
 * keydown just after unlocking, so a press right after an unlock is ignored too.
 */
export const UNLOCK_GRACE_MS = 250;

export function escapeClosesPanel({ locked, msSinceUnlock }: { locked: boolean; msSinceUnlock: number }): boolean {
  return !locked && msSinceUnlock > UNLOCK_GRACE_MS;
}
