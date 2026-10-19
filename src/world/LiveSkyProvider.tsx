import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useFloorScene } from './floorScene.ts';
import { LiveSkyContext, SKY_EASE_RATE, liveSkyFrom, stepLiveSky } from './liveSky.ts';

/** Owns the live sky for the current floor and eases it towards the floor's target sky. */
export function LiveSkyProvider({ children }: { children: ReactNode }) {
  const { floor, sky, reducedMotion, materials } = useFloorScene();
  // Created once; later targets are eased into, not rebuilt.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const live = useMemo(() => liveSkyFrom(sky), []);
  const shownFloor = useRef(floor.id);

  useFrame((_, dt) => {
    // A new floor is a new room: its sky is already there when the doors open.
    const snap = reducedMotion || shownFloor.current !== floor.id;
    shownFloor.current = floor.id;
    stepLiveSky(live, sky, snap ? 1 : 1 - Math.exp(-dt * SKY_EASE_RATE));
  });

  // Lamps and the glow of the monitors switch rather than fade.
  useEffect(() => {
    materials.lampPool.setValues({ opacity: sky.lampsOn ? 0.32 : 0 });
    materials.screenPool.setValues({ opacity: sky.screenGlow });
  }, [materials, sky.lampsOn, sky.screenGlow]);

  return <LiveSkyContext.Provider value={live}>{children}</LiveSkyContext.Provider>;
}
