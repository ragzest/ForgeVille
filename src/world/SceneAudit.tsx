import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { strayMaterials } from './sceneAudit.ts';
import { useFloorScene } from './floorScene.ts';

/** How long after a floor mounts to look, so lazy textures and labels have settled. */
const SETTLE_MS = 1500;

/**
 * Development guard: once each floor has settled, report any material outside
 * the cel-shaded set as a console error. The e2e specs fail on console errors,
 * so a stray `MeshStandardMaterial` cannot slip back in. Does nothing in a build.
 */
export function SceneAudit() {
  const scene = useThree((s) => s.scene);
  const { floor } = useFloorScene();
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const timer = window.setTimeout(() => {
      const stray = strayMaterials(scene);
      if (stray.length > 0) console.error(`Off-style materials on ${floor.id}: ${[...new Set(stray)].join(', ')}`);
    }, SETTLE_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [scene, floor.id]);
  return null;
}
