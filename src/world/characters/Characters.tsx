import { Character } from './Character.tsx';
import type { CharacterModel } from './models.ts';

/** One character per desk. Reads plain props; never dispatches workflow commands. */
export function Characters({ characters }: { characters: readonly CharacterModel[] }) {
  return (
    <group name="characters">
      {characters.map((c, i) => (
        <Character key={c.agentId} {...c} phase={i * 0.9} />
      ))}
    </group>
  );
}
