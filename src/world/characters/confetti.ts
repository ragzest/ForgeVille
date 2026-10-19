import { hashString, seededRandom } from './errands.ts';

/** A merge's confetti: how many pieces, how long it lasts, and the colours. */
export const CONFETTI_PIECES = 48;
export const CONFETTI_SECONDS = 2.4;
const COLORS = ['#ff6fb5', '#ffd166', '#4fb3e8', '#2ec4b6', '#c77dff', '#ff8a5b'] as const;

export interface ConfettiPiece {
  readonly vx: number;
  readonly vy: number;
  readonly vz: number;
  readonly spin: number;
  readonly tilt: number;
  readonly color: string;
}

/** The burst for one merge, seeded from its event id: the same merge always throws the same confetti. */
export function confettiPieces(seed: string): ConfettiPiece[] {
  const random = seededRandom(hashString(seed));
  return Array.from({ length: CONFETTI_PIECES }, (_, i) => {
    const angle = random() * Math.PI * 2;
    const speed = 0.5 + random() * 0.9;
    return {
      vx: Math.cos(angle) * speed,
      vy: 1.6 + random() * 1.4,
      vz: Math.sin(angle) * speed,
      spin: 4 + random() * 8,
      tilt: random() * Math.PI,
      color: COLORS[i % COLORS.length] ?? COLORS[0],
    };
  });
}
