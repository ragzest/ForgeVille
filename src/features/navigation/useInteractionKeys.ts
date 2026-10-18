import { useEffect } from 'react';
import { interactionStore } from '../../store/interaction.ts';
import { isKeyCaptureTarget } from '../../world/player/input.ts';
import { escapeClosesPanel } from './escape.ts';

/**
 * E opens the focused object's panel; Escape closes the open panel, but only
 * once pointer lock has been released (the first Escape just unlocks).
 */
export function useInteractionKeys(): void {
  useEffect(() => {
    let lastUnlock = Number.NEGATIVE_INFINITY;
    const onLockChange = () => {
      if (!document.pointerLockElement) lastUnlock = performance.now();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const store = interactionStore.getState();
      if (e.code === 'KeyE') {
        if (isKeyCaptureTarget(document.activeElement) || !store.focused) return;
        store.activate(store.focused);
      } else if (e.code === 'Escape') {
        const locked = document.pointerLockElement !== null;
        if (store.open && escapeClosesPanel({ locked, msSinceUnlock: performance.now() - lastUnlock })) store.close();
      }
    };
    document.addEventListener('pointerlockchange', onLockChange);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerlockchange', onLockChange);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);
}
