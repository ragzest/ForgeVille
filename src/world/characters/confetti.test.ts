import { describe, expect, it } from 'vitest';
import { CONFETTI_PIECES, confettiPieces } from './confetti.ts';

describe('confetti', () => {
  it('throws the same burst for the same merge, and a different one for another', () => {
    expect(confettiPieces('evt-merge-1')).toEqual(confettiPieces('evt-merge-1'));
    expect(confettiPieces('evt-merge-1')).not.toEqual(confettiPieces('evt-merge-2'));
    expect(confettiPieces('evt-merge-1')).toHaveLength(CONFETTI_PIECES);
  });

  it('pops every piece upwards', () => {
    for (const p of confettiPieces('evt')) expect(p.vy).toBeGreaterThan(0);
  });
});
