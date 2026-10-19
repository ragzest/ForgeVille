import { Group, Matrix4, Mesh } from 'three';
import { describe, expect, it } from 'vitest';
import { vacantDesks } from './deskViews.ts';
import { GLOW_LAYER, glowIntensity, glowLayerWhen, onGlowLayer } from './glow.ts';
import { batchParts, partMatrix, type Part } from './instancing.ts';
import { DESK, DESK_SLOTS, MEETING_TABLE, PLANTS, QA_STATIONS } from './layout.ts';
import { MATERIALS, OUTLINE_MATERIAL, themeMaterials, toon } from './materials.ts';
import { chairParts, chairPlacements, floorProps, monitorPlacements } from './props.ts';
import { FLOORS } from './building.ts';

/** Indexing that fails the test instead of returning undefined. */
function at<T>(items: readonly T[], i: number): T {
  const item = items[i];
  if (item === undefined) throw new Error(`No item ${String(i)}`);
  return item;
}

const materials = themeMaterials(at(FLOORS, 0).theme);

/** Where a part ends up when nested the old way: group (position, rotation, scale) > mesh. */
function nestedWorld(position: [number, number, number], rotationY: number, scale: number, part: Part): Matrix4 {
  const group = new Group();
  group.position.set(...position);
  group.rotation.y = rotationY;
  group.scale.setScalar(scale);
  const mesh = new Mesh();
  mesh.applyMatrix4(partMatrix(part));
  group.add(mesh);
  group.updateMatrixWorld(true);
  return mesh.matrixWorld;
}

function expectMatrixClose(a: Matrix4, b: Matrix4) {
  a.elements.forEach((v, i) => {
    expect(v).toBeCloseTo(at(b.elements, i), 6);
  });
}

describe('batchParts', () => {
  it('puts each part where the nested meshes used to be', () => {
    const parts: Part[] = [
      { material: toon('#123456'), position: [0, 0.8, 0.23], scale: [0.5, 0.56, 0.08] },
      { geometry: 'blob', material: toon('#654321'), position: [0.1, 1.5, 0.05], scale: [0.5, 0.55, 0.5], rotation: [0, 3, 0] },
    ];
    const placement = { position: [-8, 0, 6.65] as [number, number, number], rotationY: 2.1, scale: 1.16 };
    const batches = batchParts([{ placement, parts }], true);
    expect(batches).toHaveLength(2);
    batches.forEach((batch, i) => {
      expectMatrixClose(at(batch.matrices, 0), nestedWorld(placement.position, placement.rotationY, placement.scale, at(parts, i)));
    });
  });

  it('shares one batch per geometry, material, and shadow setting across placements', () => {
    const chair = chairParts(materials);
    const placements = chairPlacements(vacantDesks());
    const batches = batchParts(placements.map((placement) => ({ placement, parts: chair })), true);
    // Fabric seat and back share a batch; so do the metal base pieces with outlines.
    expect(batches.length).toBeLessThan(chair.length);
    const total = batches.reduce((n, b) => n + b.matrices.length, 0);
    expect(total).toBe(chair.length * placements.length);
    // The pole never has an outline; everything else does on Medium.
    const outlined = batches.reduce((n, b) => n + b.outlined.length, 0);
    expect(outlined).toBe((chair.length - 1) * placements.length);
  });

  it('drops outlines on small parts only when small-prop outlines are off', () => {
    const parts: Part[] = [
      { material: MATERIALS.metal, scale: [0.26, 0.02, 0.18] },
      { material: MATERIALS.bezel, scale: [0.84, 0.53, 0.04] },
    ];
    const at = { placement: { position: [0, 0, 0] as [number, number, number] }, parts };
    const outlines = (on: boolean) => batchParts([at], on).map((b) => b.outlined.length);
    expect(outlines(true)).toEqual([1, 1]);
    expect(outlines(false)).toEqual([0, 1]);
  });

  it('judges smallness after the placement scale', () => {
    const part: Part = { material: MATERIALS.metal, scale: [0.3, 0.3, 0.3] };
    const outlined = (scale: number) => at(batchParts([{ placement: { position: [0, 0, 0], scale }, parts: [part] }], false), 0).outlined.length;
    expect(outlined(1)).toBe(0);
    expect(outlined(1.4)).toBe(1);
  });
});

describe('floor props', () => {
  const desks = vacantDesks();

  it('seat every desk, QA bench, reception, and the meeting table', () => {
    const chairs = chairPlacements(desks);
    expect(chairs).toHaveLength(DESK_SLOTS.length + QA_STATIONS.length + 1 + MEETING_TABLE.chairs);
    // A desk chair sits just south of its desk.
    expect(at(chairs, 0).position).toEqual([at(DESK_SLOTS, 0).x, 0, at(DESK_SLOTS, 0).z + 0.75]);
  });

  it('put a monitor on every desk, QA bench, and the reception counter', () => {
    const monitors = monitorPlacements(desks);
    expect(monitors).toHaveLength(DESK_SLOTS.length + QA_STATIONS.length + 1);
    expect(at(monitors, 0).position).toEqual([at(DESK_SLOTS, 0).x, DESK.height, at(DESK_SLOTS, 0).z - 0.2]);
  });

  it('draw about 150 prop meshes in under 20 batches', () => {
    const props = floorProps(materials, desks);
    const meshes = props.reduce((n, p) => n + p.parts.length, 0);
    const batches = batchParts(props, true);
    expect(props.filter((p) => p.parts.some((part) => part.geometry === 'blob'))).toHaveLength(PLANTS.length);
    expect(meshes).toBeGreaterThan(100);
    expect(batches.length).toBeLessThan(20);
  });
});

describe('outlines on instanced meshes', () => {
  it('apply the instance matrix', () => {
    expect(OUTLINE_MATERIAL.vertexShader).toMatch(/#ifdef USE_INSTANCING[\s\S]*instanceMatrix \* local/);
  });
});

describe('glow layer', () => {
  it('joins screens to the glow layer and keeps them on the default layer too', () => {
    const screen = new Mesh();
    onGlowLayer(screen);
    expect(screen.layers.isEnabled(GLOW_LAYER)).toBe(true);
    expect(screen.layers.isEnabled(0)).toBe(true);
    expect(() => {
      onGlowLayer(null);
    }).not.toThrow();
  });

  it('lets lamps join only while lit', () => {
    const lamp = new Mesh();
    glowLayerWhen(true)(lamp);
    expect(lamp.layers.isEnabled(GLOW_LAYER)).toBe(true);
    glowLayerWhen(false)(lamp);
    expect(lamp.layers.isEnabled(GLOW_LAYER)).toBe(false);
  });

  it('is brighter at night than by day', () => {
    expect(glowIntensity(0.6)).toBeGreaterThan(glowIntensity(0.2));
  });
});
