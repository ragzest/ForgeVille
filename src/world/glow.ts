import type { Object3D } from 'three';

/**
 * The dedicated layer the high-tier glow is rendered from. Only screens and
 * lit lamps join it, so walls, floors, and the sky never haze. Every object
 * stays on layer 0 as well, so the normal render is unchanged.
 */
export const GLOW_LAYER = 10;

/** Ref callback: puts a mesh on the glow layer. */
export function onGlowLayer(object: Object3D | null): void {
  object?.layers.enable(GLOW_LAYER);
}

/** Ref callback factory for things that glow only some of the time, like lamps at night. */
export function glowLayerWhen(on: boolean): (object: Object3D | null) => void {
  return (object) => {
    if (!object) return;
    if (on) object.layers.enable(GLOW_LAYER);
    else object.layers.disable(GLOW_LAYER);
  };
}

/** How much of the blurred glow is added back: gentle by day, strongest at night. */
export function glowIntensity(screenGlow: number): number {
  return 0.8 + screenGlow * 1.0;
}
