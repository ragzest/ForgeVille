import { MeshBasicMaterial, MeshToonMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { FLOOR_THEMES } from '../ui/themes.ts';
import { COLORS } from '../ui/tokens.ts';
import { GEOMETRIES, MATERIALS, TOON_RAMP, glow, hullGeometry, themeMaterials, toon, wantsOutline } from './materials.ts';

describe('shared materials', () => {
  it('cel-shades solids on the shared three-step ramp', () => {
    expect(MATERIALS.skin).toBeInstanceOf(MeshToonMaterial);
    expect(MATERIALS.skin.gradientMap).toBe(TOON_RAMP);
    expect(`#${MATERIALS.skin.color.getHexString()}`).toBe(COLORS.skin);
  });

  it('caches one material per colour', () => {
    expect(toon('#123456')).toBe(toon('#123456'));
    expect(glow('#123456')).toBe(glow('#123456'));
    expect(glow('#123456').toneMapped).toBe(false);
  });

  it('builds each floor theme once, from that theme', () => {
    const workshop = themeMaterials(FLOOR_THEMES.workshop);
    expect(themeMaterials(FLOOR_THEMES.workshop)).toBe(workshop);
    expect(`#${workshop.wall.color.getHexString()}`).toBe(FLOOR_THEMES.workshop.scene.wall);
    expect(`#${workshop.fabric.color.getHexString()}`).toBe(FLOOR_THEMES.workshop.scene.fabric);
    const night = themeMaterials(FLOOR_THEMES['night-studio']);
    expect(night.wall).not.toBe(workshop.wall);
    // Lamp pools glow only where the floor's lamps are on.
    expect(night.lamp).toBeInstanceOf(MeshBasicMaterial);
    expect(night.lampPool.opacity).toBeGreaterThan(0);
    expect(workshop.lampPool.opacity).toBe(0);
  });

  it('outlines lit solids but not glows', () => {
    expect(wantsOutline(MATERIALS.skin)).toBe(true);
    expect(wantsOutline(MATERIALS.screen)).toBe(false);
  });

  it('welds hull geometry so outlines have no gaps, and caches it', () => {
    const hull = hullGeometry(GEOMETRIES.box);
    expect(hullGeometry(GEOMETRIES.box)).toBe(hull);
    // A box has 24 split vertices; welded, 8 corners remain.
    expect(GEOMETRIES.box.getAttribute('position').count).toBe(24);
    expect(hull.getAttribute('position').count).toBe(8);
    expect(hull.getAttribute('normal')).toBeDefined();
  });

  it('is one instance per material and geometry, shared by every importer', async () => {
    const again = await import('./materials.ts');
    expect(again.MATERIALS.skin).toBe(MATERIALS.skin);
    expect(again.GEOMETRIES.box).toBe(GEOMETRIES.box);
  });
});
