import { useLayoutEffect, useMemo, useRef } from 'react';
import type { InstancedMesh } from 'three';
import { useFloorScene } from './floorScene.ts';
import type { DeskView } from './deskViews.ts';
import { batchParts, type Batch } from './instancing.ts';
import { GEOMETRIES, OUTLINE_MATERIAL, hullGeometry } from './materials.ts';
import { floorProps } from './props.ts';
import { useSceneQuality } from './qualityContext.ts';

const NO_RAYCAST = () => null;

function useInstanceMatrices(matrices: Batch['matrices']) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    matrices.forEach((m, i) => {
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.computeBoundingBox();
  }, [matrices]);
  return ref;
}

function InstancedBatch({ batch }: { batch: Batch }) {
  const geometry = GEOMETRIES[batch.geometry];
  const solid = useInstanceMatrices(batch.matrices);
  const outline = useInstanceMatrices(batch.outlined);
  return (
    <>
      <instancedMesh
        // A new count needs a new mesh: instanced buffers are sized once.
        key={`solid:${String(batch.matrices.length)}`}
        ref={solid}
        args={[geometry, batch.material, batch.matrices.length]}
        castShadow={batch.castShadow}
        receiveShadow={batch.receiveShadow}
      />
      {batch.outlined.length > 0 && (
        <instancedMesh
          key={`outline:${String(batch.outlined.length)}`}
          ref={outline}
          args={[hullGeometry(geometry), OUTLINE_MATERIAL, batch.outlined.length]}
          raycast={NO_RAYCAST}
        />
      )}
    </>
  );
}

/**
 * Chairs, potted plants, and monitor bodies for the whole floor, one
 * instanced mesh (plus one instanced outline) per shared part. Screens stay
 * with their desks, since each paints its own picture.
 */
export function InstancedProps({ desks }: { desks: readonly DeskView[] }) {
  const { materials } = useFloorScene();
  const { rules } = useSceneQuality();
  // Desk views change with every snapshot; the props only move when the slots do.
  const slotsKey = desks.map(({ slot }) => `${String(slot.x)},${String(slot.z)}`).join(';');
  const batches = useMemo(
    () => batchParts(floorProps(materials, desks), rules.smallPropOutlines),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [materials, slotsKey, rules.smallPropOutlines],
  );
  return (
    <group name="instanced-props">
      {batches.map((batch) => (
        <InstancedBatch key={batch.key} batch={batch} />
      ))}
    </group>
  );
}
