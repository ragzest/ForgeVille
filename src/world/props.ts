import type { DeskView } from './deskViews.ts';
import type { PlacedProp, Part, Placement } from './instancing.ts';
import { DESK, LANDMARKS, MEETING_TABLE, PLANTS, QA_STATION, QA_STATIONS } from './layout.ts';
import { MATERIALS, type ThemeMaterials } from './materials.ts';

/**
 * The repeated props of a floor (chairs, potted plants, monitor bodies) as
 * part recipes and placements, ready for `batchParts`. Placements match where
 * each desk, QA bench, reception, and meeting table put these props when they
 * were nested meshes, so instancing moves nothing.
 */

export function chairParts(materials: ThemeMaterials): Part[] {
  return [
    { material: materials.fabric, position: [0, 0.46, 0], scale: [0.52, 0.09, 0.5] },
    { material: materials.fabric, position: [0, 0.8, 0.23], scale: [0.5, 0.56, 0.08] },
    { material: MATERIALS.metal, position: [0, 0.23, 0], scale: [0.06, 0.42, 0.06], outline: false },
    { material: MATERIALS.metal, position: [0, 0.04, 0], scale: [0.5, 0.04, 0.06] },
    { material: MATERIALS.metal, position: [0, 0.04, 0], scale: [0.06, 0.04, 0.5] },
  ];
}

/** Stand, foot, and bezel. The screen itself stays a separate mesh: each one paints its own picture. */
export function monitorBodyParts(): Part[] {
  return [
    { material: MATERIALS.metal, position: [0, 0.01, 0], scale: [0.26, 0.02, 0.18] },
    { material: MATERIALS.metal, position: [0, 0.17, -0.02], scale: [0.05, 0.32, 0.04] },
    { material: MATERIALS.bezel, position: [0, MONITOR_SCREEN_Y, -0.015], scale: [MONITOR_SCREEN.width + 0.06, MONITOR_SCREEN.height + 0.06, 0.04] },
  ];
}

export const MONITOR_SCREEN = { width: 0.78, height: 0.47 } as const;
/** Height of the screen's centre above the monitor's foot. */
export const MONITOR_SCREEN_Y = 0.42;

/** A potted plant. Variety comes from the plant's index, never `Math.random`. */
export function plantParts(materials: ThemeMaterials, index: number): Part[] {
  const pot: Part[] = [
    { geometry: 'cylinder', material: materials.pot, position: [0, 0.22, 0], scale: [0.44, 0.44, 0.44] },
    { geometry: 'cylinder', material: materials.skirting, position: [0, 0.45, 0], scale: [0.47, 0.05, 0.47] },
  ];
  if (index % 3 === 0) {
    return [
      ...pot,
      { geometry: 'cylinder', material: materials.wood, position: [0, 0.8, 0], scale: [0.05, 0.7, 0.05] },
      { geometry: 'blob', material: materials.leafDark, position: [0, 1.2, 0], scale: [0.7, 0.75, 0.7] },
      { geometry: 'blob', material: materials.leaf, position: [0.1, 1.5, 0.05], scale: [0.5, 0.55, 0.5], rotation: [0, index, 0] },
    ];
  }
  return [
    ...pot,
    { geometry: 'blob', material: materials.leafDark, position: [0, 0.72, 0], scale: [0.75, 0.8, 0.75] },
    { geometry: 'blob', material: materials.leaf, position: [0.12, 1.0, 0.05], scale: [0.5, 0.55, 0.5], rotation: [0, index, 0] },
  ];
}

export function plantScale(index: number): number {
  return 0.85 + ((index * 37) % 5) * 0.08;
}

function landmarkCenter(id: (typeof LANDMARKS)[number]['id']) {
  const found = LANDMARKS.find((l) => l.id === id);
  if (!found) throw new Error(`Unknown landmark ${id}`);
  return found.footprint.center;
}

/** Offsets inside each piece of furniture, shared with the components that draw the rest of it. */
export const DESK_CHAIR_OFFSET = 0.75;
export const DESK_MONITOR = { x: 0, z: -0.2 } as const;
export const QA_MONITOR = { x: -0.42, z: -0.2 } as const;
export const RECEPTION_MONITOR = { x: 0.15, y: 1.15, z: -0.7, rotationY: -Math.PI / 2 } as const;
export const RECEPTION_CHAIR = { x: 0.9, z: 0, rotationY: -Math.PI / 2 } as const;

export function chairPlacements(desks: readonly DeskView[]): Placement[] {
  const reception = landmarkCenter('reception');
  const { center, radius, chairs } = MEETING_TABLE;
  const r = radius + 0.45;
  return [
    ...desks.map(({ slot }): Placement => ({ position: [slot.x, 0, slot.z + DESK_CHAIR_OFFSET] })),
    ...QA_STATIONS.map((at): Placement => ({ position: [at.x, 0, at.z + DESK_CHAIR_OFFSET] })),
    { position: [reception.x + RECEPTION_CHAIR.x, 0, reception.z + RECEPTION_CHAIR.z], rotationY: RECEPTION_CHAIR.rotationY },
    // Meeting chairs face the table: their backs point away from the centre.
    ...Array.from({ length: chairs }, (_, i): Placement => {
      const angle = (i / chairs) * Math.PI * 2;
      return { position: [center.x + Math.sin(angle) * r, 0, center.z + Math.cos(angle) * r], rotationY: angle };
    }),
  ];
}

export function monitorPlacements(desks: readonly DeskView[]): Placement[] {
  const reception = landmarkCenter('reception');
  return [
    ...desks.map(({ slot }): Placement => ({ position: [slot.x + DESK_MONITOR.x, DESK.height, slot.z + DESK_MONITOR.z] })),
    ...QA_STATIONS.map((at): Placement => ({ position: [at.x + QA_MONITOR.x, QA_STATION.height, at.z + QA_MONITOR.z] })),
    {
      position: [reception.x + RECEPTION_MONITOR.x, RECEPTION_MONITOR.y, reception.z + RECEPTION_MONITOR.z],
      rotationY: RECEPTION_MONITOR.rotationY,
    },
  ];
}

/** Every instanced prop on a floor. */
export function floorProps(materials: ThemeMaterials, desks: readonly DeskView[]): PlacedProp[] {
  const chair = chairParts(materials);
  const monitor = monitorBodyParts();
  return [
    ...chairPlacements(desks).map((placement) => ({ placement, parts: chair })),
    ...monitorPlacements(desks).map((placement) => ({ placement, parts: monitor })),
    ...PLANTS.map((at, i) => ({ placement: { position: [at.x, 0, at.z] as const, scale: plantScale(i) }, parts: plantParts(materials, i) })),
  ];
}
