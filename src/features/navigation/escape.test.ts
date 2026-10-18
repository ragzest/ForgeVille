import { describe, expect, it } from 'vitest';
import { UNLOCK_GRACE_MS, escapeClosesPanel } from './escape.ts';

describe('escapeClosesPanel', () => {
  it('only unlocks while the pointer is locked', () => {
    expect(escapeClosesPanel({ locked: true, msSinceUnlock: Infinity })).toBe(false);
  });

  it('ignores the same press that just released the lock', () => {
    expect(escapeClosesPanel({ locked: false, msSinceUnlock: 20 })).toBe(false);
  });

  it('closes on a later press once unlocked', () => {
    expect(escapeClosesPanel({ locked: false, msSinceUnlock: UNLOCK_GRACE_MS + 1 })).toBe(true);
    expect(escapeClosesPanel({ locked: false, msSinceUnlock: Infinity })).toBe(true);
  });
});
