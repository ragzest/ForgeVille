import type { ThreeEvent } from '@react-three/fiber';
import { interactionStore } from '../store/interaction.ts';

/**
 * Pointer handlers for an interactive object. A click activates it only while
 * the pointer is unlocked; while locked the player uses E instead.
 */
export function interactProps(target: { id: string; label: string }) {
  return {
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (document.pointerLockElement) return;
      interactionStore.getState().activate(target);
    },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (!document.pointerLockElement) document.body.style.cursor = 'pointer';
    },
    onPointerOut: () => {
      document.body.style.cursor = '';
    },
  };
}

/** Locks the pointer to the canvas. Safe to call where pointer lock is unavailable. */
export function lockPointer(canvas: HTMLCanvasElement): void {
  if (document.pointerLockElement === canvas) return;
  try {
    // Older browsers return undefined; newer ones a promise that may reject.
    void Promise.resolve(canvas.requestPointerLock()).catch(() => undefined);
  } catch {
    // Pointer lock unavailable; keyboard movement and clicks still work.
  }
}
