import type { Material, Object3D } from 'three';

/**
 * Material types the cel-shaded office may use. Solids are toon, screens and
 * glows are basic (unlit), and the ink outline and sky dome are shaders.
 * Anything else (a stray `MeshStandardMaterial` from a default or a helper)
 * breaks the look, so the audit reports it.
 */
export const ALLOWED_MATERIALS: ReadonlySet<string> = new Set([
  'MeshToonMaterial',
  'MeshBasicMaterial',
  'ShaderMaterial',
  'PointsMaterial',
  'SpriteMaterial',
  'LineBasicMaterial',
]);

/** Names of the objects in the tree that use a material outside the allowed set, with its type. */
export function strayMaterials(root: Object3D): string[] {
  const stray: string[] = [];
  root.traverse((object) => {
    const raw = (object as Object3D & { material?: Material | Material[] }).material;
    if (!raw) return;
    for (const material of Array.isArray(raw) ? raw : [raw]) {
      if (!ALLOWED_MATERIALS.has(material.type)) stray.push(`${object.name || object.type}: ${material.type}`);
    }
  });
  return stray;
}
