import { MeshStandardMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { COLORS } from '../ui/tokens.ts';
import { GEOMETRIES, MATERIALS } from './materials.ts';

describe('shared materials', () => {
  it('builds wall, window, and floor materials from the palette', () => {
    expect(MATERIALS.floor).toBeInstanceOf(MeshStandardMaterial);
    expect(`#${MATERIALS.floor.color.getHexString()}`).toBe(COLORS.floor);
    expect(`#${MATERIALS.wall.color.getHexString()}`).toBe(COLORS.wall);
    expect(`#${MATERIALS.window.color.getHexString()}`).toBe(COLORS.glass);
    expect(`#${MATERIALS.zoneEdge.color.getHexString()}`).toBe(COLORS.forest);
  });

  it('is one instance per material and geometry, shared by every importer', async () => {
    const again = await import('./materials.ts');
    expect(again.MATERIALS.wall).toBe(MATERIALS.wall);
    expect(again.GEOMETRIES.box).toBe(GEOMETRIES.box);
    expect(new Set(Object.values(MATERIALS)).size).toBe(Object.keys(MATERIALS).length);
  });
});
