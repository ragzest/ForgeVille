import { useFrame } from '@react-three/fiber';
import type { ReactNode } from 'react';
import type { Material } from 'three';
import { FloorSceneContext, type FloorScene } from './floorScene.ts';
import { GEOMETRIES, OUTLINE_MATERIAL, hullGeometry, themeMaterials, wantsOutline, type GeometryName } from './materials.ts';

export type Vec3 = [number, number, number];

export function FloorSceneProvider({ floor, interactive, reducedMotion, sky, children }: Omit<FloorScene, 'materials'> & { children: ReactNode }) {
  return (
    <FloorSceneContext.Provider value={{ floor, materials: themeMaterials(floor.theme), interactive, reducedMotion, sky }}>
      {children}
    </FloorSceneContext.Provider>
  );
}

const ORIGIN: Vec3 = [0, 0, 0];
const UNIT: Vec3 = [1, 1, 1];

export interface SolidProps {
  geometry?: GeometryName;
  material: Material;
  position?: Vec3;
  scale?: Vec3;
  rotation?: Vec3;
  /** Ink outline; on by default for lit materials, never for glows. */
  outline?: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
}

/**
 * A cel-shaded mesh with its ink outline. Uses the shared unit geometries and
 * a shared outline material, so repeated furniture costs no extra GPU memory.
 */
export function Solid({ geometry = 'box', material, position = ORIGIN, scale = UNIT, rotation = ORIGIN, outline, castShadow = true, receiveShadow = true }: SolidProps) {
  const geo = GEOMETRIES[geometry];
  const inked = outline ?? wantsOutline(material);
  return (
    <mesh geometry={geo} material={material} position={position} scale={scale} rotation={rotation} castShadow={castShadow} receiveShadow={receiveShadow}>
      {inked && <mesh geometry={hullGeometry(geo)} material={OUTLINE_MATERIAL} raycast={() => null} />}
    </mesh>
  );
}

/** Keeps the shared outline width in screen pixels as the canvas resizes. */
export function OutlineSizer() {
  useFrame(({ gl }) => {
    const size = OUTLINE_MATERIAL.uniforms.size?.value as { x: number; y: number; set: (x: number, y: number) => void } | undefined;
    const canvas = gl.domElement;
    if (size && (size.x !== canvas.width || size.y !== canvas.height)) size.set(canvas.width, canvas.height);
  });
  return null;
}
