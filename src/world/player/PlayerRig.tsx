import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { PerspectiveCamera, type Mesh } from 'three';
import { interactionStore } from '../../store/interaction.ts';
import { navigationStore } from '../../store/navigation.ts';
import { nearestTarget, type InteractionTarget } from '../interaction.ts';
import { PLAYER_SPAWN, overviewHeight, overviewTurned, playerColliders, zoneById } from '../layout.ts';
import { GEOMETRIES, MATERIALS } from '../materials.ts';
import { NO_INPUT, isKeyCaptureTarget, trackMovementKeys, type KeyTracker } from './input.ts';
import { EYE_HEIGHT, look, stepPlayer, yawToward, type PlayerPose } from './movement.ts';

/**
 * Where the player was and which travel request was last applied. Kept outside
 * the component so switching to the 2D view and back keeps the player in place.
 */
const persisted: { pose: PlayerPose; travelSeq: number } = { pose: { ...PLAYER_SPAWN }, travelSeq: 0 };

/** Looking slightly down after travelling, so the zone fills the view. */
const ARRIVAL_PITCH = -0.15;

/**
 * First-person player. All control state lives in refs and is read inside the
 * frame loop, so moving never re-renders React panels. The canvas locks the
 * pointer on a click that misses every object; Escape (handled by the browser)
 * releases it. The nearest interactive target is published only when it changes.
 */
export function PlayerRig({ targets }: { targets: readonly InteractionTarget[] }) {
  const canvas = useThree((s) => s.gl.domElement);
  const colliders = useMemo(() => playerColliders(), []);
  const pose = useRef<PlayerPose>(persisted.pose);
  const marker = useRef<Mesh>(null);
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
    const onMouseMove = (e: MouseEvent) => {
      if (locked()) pose.current = look(pose.current, e.movementX, e.movementY);
    };
    // Typing into a field releases the mouse, so the cursor is never trapped.
    const onFocusIn = () => {
      if (locked() && isKeyCaptureTarget(document.activeElement)) document.exitPointerLock();
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('focusin', onFocusIn);
    // Leaving walk mode (overview, 2D) releases the mouse.
    const unsubscribe = navigationStore.subscribe((nav) => {
      if (nav.view !== 'walk' && locked()) document.exitPointerLock();
    });
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('focusin', onFocusIn);
      unsubscribe();
      if (locked()) document.exitPointerLock();
    };
  }, [canvas]);

  // The frame loop works on the state R3F hands it, outside React render.
  useFrame((state, dt) => {
    const nav = navigationStore.getState();
    const input = keys.current?.read() ?? NO_INPUT; // read every frame so taps never pile up
    let next = pose.current;

    // A zone jump puts the player on the zone's anchor, facing into the zone.
    if (nav.travel && nav.travel.seq !== persisted.travelSeq) {
      persisted.travelSeq = nav.travel.seq;
      const zone = zoneById(nav.travel.zone);
      next = { x: zone.anchor.x, z: zone.anchor.z, yaw: yawToward(zone.anchor, zone.center), pitch: ARRIVAL_PITCH };
    }

    const overview = nav.view === 'overview';
    // Movement keys are paused in the overview; the player stays put.
    if (!overview) next = stepPlayer(next, input, dt, colliders);
    pose.current = next;
    persisted.pose = next;

    const { camera, gl, size } = state;
    camera.rotation.order = 'YXZ';
    if (overview) {
      const fov = camera instanceof PerspectiveCamera ? camera.fov : 70;
      const aspect = size.width / Math.max(size.height, 1);
      camera.position.set(0, overviewHeight(fov, aspect), 0);
      // Look straight down; on portrait screens turn the view so east is at the top.
      camera.rotation.set(-Math.PI / 2, overviewTurned(aspect) ? -Math.PI / 2 : 0, 0);
    } else {
      camera.position.set(next.x, EYE_HEIGHT, next.z);
      camera.rotation.set(next.pitch, next.yaw, 0);
    }

    // "You are here" marker, only visible from above.
    const m = marker.current;
    if (m) {
      m.visible = overview;
      m.position.set(next.x, 0.6, next.z);
      m.rotation.set(-Math.PI / 2, 0, next.yaw, 'YXZ'); // the cone's tip points the way the player faces
    }

    // The store ignores repeats, so this only notifies when the focus changes.
    interactionStore.getState().setFocused(overview ? null : nearestTarget(next, targets));

    // Position for end-to-end tests, written straight to the DOM (no React).
    const position = `${next.x.toFixed(2)},${next.z.toFixed(2)}`;
    if (position !== reported.current) {
      reported.current = position;
      gl.domElement.dataset.player = position;
    }
  });

  return (
    <mesh ref={marker} geometry={GEOMETRIES.cone} material={MATERIALS.markSuccess} scale={[0.7, 1.1, 0.7]} visible={false} />
  );
}
