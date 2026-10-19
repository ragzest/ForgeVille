import { describe, expect, it } from 'vitest';
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, MeshToonMaterial } from 'three';
import { strayMaterials } from './sceneAudit.ts';
import { glow, OUTLINE_MATERIAL, toon } from './materials.ts';

describe('scene material audit', () => {
  it('accepts the toon, glow, and outline materials the office uses', () => {
    const root = new Group();
    const box = new BoxGeometry();
    root.add(new Mesh(box, toon('#4fb3e8')), new Mesh(box, glow('#ffffff')), new Mesh(box, OUTLINE_MATERIAL));
    root.add(new Mesh(box, [new MeshToonMaterial(), new MeshBasicMaterial()]));
    expect(strayMaterials(root)).toEqual([]);
  });

  it('reports a stray MeshStandardMaterial by object name', () => {
    const root = new Group();
    const mesh = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
    mesh.name = 'lamp';
    root.add(new Group().add(mesh));
    expect(strayMaterials(root)).toEqual(['lamp: MeshStandardMaterial']);
  });

  it('also catches one hidden in a material array, and a default mesh material is allowed', () => {
    const root = new Group();
    root.add(new Mesh(new BoxGeometry(), [new MeshToonMaterial(), new MeshStandardMaterial()]));
    root.add(new Mesh(new BoxGeometry()));
    expect(strayMaterials(root)).toEqual(['Mesh: MeshStandardMaterial']);
  });
});
