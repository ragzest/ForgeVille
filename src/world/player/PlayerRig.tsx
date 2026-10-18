import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { PLAYER_SPAWN, playerColliders } from '../layout.ts';
import { NO_INPUT, isKeyCaptureTarget, trackMovementKeys, type KeyTracker } from './input.ts';
import { EYE_HEIGHT, look, stepPlayer, type PlayerPose } from './movement.ts';

/**
 * First-person player. All control state lives in refs and is read inside the
 * frame loop, so moving never re-renders React panels. Click the canvas to
 * lock the pointer; Escape (handled by the browser) releases it.
 */
export function PlayerRig() {
  const canvas = useThree((s) => s.gl.domElement);
  const colliders = useMemo(() => playerColliders(), []);
  const pose = useRef<PlayerPose>({ ...PLAYER_SPAWN });
  const keys = useRef<KeyTracker | null>(null);
  const reported = useRef('');

  useEffect(() => {
    const tracker = trackMovementKeys(window);
    keys.current = tracker;
    return () => {
      tracker.dispose();
      keys.current = null;
    };
  }, []);

  useEffect(() => {
    const locked = () => document.pointerLockElement === canvas;
    const onClick = () => {
      if (locked()) return;
      try {
        // Older browsers return undefined; newer ones a promise that may reject.
        void Promise.resolve(canvas.requestPointerLock()).catch(() => undefined);
      } catch {
        // Pointer lock unavailable (e.g. some embedded browsers); keyboard movement still works.
      }
    };
    const onMouseMove = (e: MouseEvent) => {
      if (locked()) pose.current = look(pose.current, e.movementX, e.movementY);
    };
    // Typing into a field releases the mouse, so the cursor is never trapped.
    const onFocusIn = () => {
      if (locked() && isKeyCaptureTarget(document.activeElement)) document.exitPointerLock();
    };
    canvas.addEventListener('click', onClick);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      canvas.removeEventListener('click', onClick);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('focusin', onFocusIn);
      if (locked()) document.exitPointerLock();
    };
  }, [canvas]);

  // The frame loop works on the state R3F hands it, outside React render.
  useFrame((state, dt) => {
    const next = stepPlayer(pose.current, keys.current?.read() ?? NO_INPUT, dt, colliders);
    pose.current = next;
    const { camera, gl } = state;
    camera.rotation.order = 'YXZ';
    camera.position.set(next.x, EYE_HEIGHT, next.z);
    camera.rotation.set(next.pitch, next.yaw, 0);

    // Position for end-to-end tests, written straight to the DOM (no React).
    const position = `${next.x.toFixed(2)},${next.z.toFixed(2)}`;
    if (position !== reported.current) {
      reported.current = position;
      gl.domElement.dataset.player = position;
    }
  });

  return null;
}
