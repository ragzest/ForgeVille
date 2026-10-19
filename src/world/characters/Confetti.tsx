import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, DoubleSide, MeshBasicMaterial, Object3D, type InstancedMesh } from 'three';
import { GEOMETRIES } from '../materials.ts';
import { CONFETTI_PIECES, CONFETTI_SECONDS, confettiPieces } from './confetti.ts';

const DUMMY = new Object3D();
const MATERIAL = new MeshBasicMaterial({ side: DoubleSide, toneMapped: false });

/**
 * One short burst of confetti over a desk, played once when it mounts. Keyed
 * by the merge event, so a new merge plays a new burst. Never shown under
 * reduced motion (the model leaves `confetti` empty).
 */
export function Confetti({ seed, x, z }: { seed: string; x: number; z: number }) {
  const pieces = useMemo(() => confettiPieces(seed), [seed]);
  const mesh = useRef<InstancedMesh>(null);
  const started = useRef<number | null>(null);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    pieces.forEach((p, i) => {
      m.setColorAt(i, new Color(p.color));
    });
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [pieces]);

  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    started.current ??= clock.elapsedTime;
    const t = clock.elapsedTime - started.current;
    m.visible = t < CONFETTI_SECONDS;
    if (!m.visible) return;
    pieces.forEach((p, i) => {
      // A pop upwards, then a flutter down under gravity.
      DUMMY.position.set(p.vx * t, p.vy * t - 2.4 * t * t, p.vz * t);
      DUMMY.rotation.set(p.spin * t, p.spin * 0.7 * t, p.tilt);
      DUMMY.scale.setScalar(0.11);
      DUMMY.updateMatrix();
      m.setMatrixAt(i, DUMMY.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={mesh}
      name="confetti"
      args={[GEOMETRIES.plane, MATERIAL, CONFETTI_PIECES]}
      position={[x, 1.25, z]}
      frustumCulled={false}
      visible={false}
    />
  );
}
