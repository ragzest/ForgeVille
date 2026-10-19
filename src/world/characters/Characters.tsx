import { Character } from './Character.tsx';
import { Confetti } from './Confetti.tsx';
import type { CharacterModel } from './models.ts';
import { KeepSmallOutlines } from '../qualityContext.ts';

/** One character per desk, and a confetti burst over the desk of whoever just merged. Reads plain props; never dispatches workflow commands. */
export function Characters({ characters }: { characters: readonly CharacterModel[] }) {
  return (
    <group name="characters">
      <KeepSmallOutlines>
        {characters.map((c, i) => (
          <Character key={c.agentId} {...c} phase={i * 0.9} />
        ))}
      </KeepSmallOutlines>
      {characters.map((c) => (c.confetti ? <Confetti key={`${c.agentId}:${c.confetti}`} seed={c.confetti} x={c.slot.x} z={c.slot.z} /> : null))}
    </group>
  );
}
