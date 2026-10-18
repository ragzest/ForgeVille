import { COLUMN_LABELS, TASK_COLUMNS, type TaskColumn } from '../domain/index.ts';
import { COLORS } from '../ui/tokens.ts';
import { interactProps } from './interactable.ts';
import { floorLabel } from './labels.ts';
import {
  DESK,
  LANDMARKS,
  MEETING_TABLE,
  PLANTS,
  QA_STATION,
  QA_STATIONS,
  type DeskAssignment,
  type LandmarkId,
  type Point2,
} from './layout.ts';
import { GEOMETRIES, MATERIALS } from './materials.ts';

/**
 * Low-poly furnishings. Every mesh reuses the shared unit geometries and
 * materials from `materials.ts`, scaled per mesh, so repeated items such as
 * desks, chairs, monitors, and plants share GPU resources.
 */

type Vec3 = [number, number, number];

function Box({ position, size, material = MATERIALS.wood }: { position: Vec3; size: Vec3; material?: (typeof MATERIALS)[keyof typeof MATERIALS] }) {
  return <mesh geometry={GEOMETRIES.box} material={material} position={position} scale={size} castShadow receiveShadow />;
}

/** A flat text plate. Faces south (+z) unless rotated. */
function Plate({ text, height, position, rotationY = 0, colors }: { text: string; height: number; position: Vec3; rotationY?: number; colors?: { background: string; text: string } }) {
  const label = floorLabel(text, colors);
  return (
    <mesh
      geometry={GEOMETRIES.plane}
      material={label.material}
      position={position}
      rotation-y={rotationY}
      scale={[height * label.aspect, height, 1]}
    />
  );
}

function landmark(id: LandmarkId) {
  const found = LANDMARKS.find((l) => l.id === id);
  if (!found) throw new Error(`Unknown landmark ${id}`);
  return found;
}

/** A monitor facing south (+z). An optional label shows on its screen. */
function Monitor({ position, label }: { position: Vec3; label?: string }) {
  const [x, y, z] = position;
  return (
    <group position={[x, y, z]}>
      <Box position={[0, 0.06, 0]} size={[0.06, 0.12, 0.06]} material={MATERIALS.metal} />
      <Box position={[0, 0.32, 0]} size={[0.62, 0.38, 0.04]} material={MATERIALS.screen} />
      {label !== undefined && (
        // As large as fits on the 0.62 m screen.
        <Plate text={label} height={Math.min(0.22, 0.54 / floorLabel(label).aspect)} position={[0, 0.32, 0.022]} />
      )}
    </group>
  );
}

function Chair({ position, rotationY = 0 }: { position: Vec3; rotationY?: number }) {
  return (
    <group position={position} rotation-y={rotationY}>
      <Box position={[0, 0.45, 0]} size={[0.5, 0.08, 0.5]} material={MATERIALS.fabric} />
      <Box position={[0, 0.75, 0.22]} size={[0.5, 0.55, 0.07]} material={MATERIALS.fabric} />
      <Box position={[0, 0.21, 0]} size={[0.06, 0.42, 0.06]} material={MATERIALS.metal} />
    </group>
  );
}

function Desk({ desk, name }: { desk: DeskAssignment; name: string }) {
  const { x, z } = desk.slot;
  const top = DESK.height;
  return (
    <group
      name={desk.id}
      userData={{ interactiveId: desk.id, agentId: desk.agentId }}
      position={[x, 0, z]}
      {...interactProps({ id: desk.id, label: `${name}'s desk` })}
    >
      <Box position={[0, top - 0.03, 0]} size={[DESK.width, 0.06, DESK.depth]} material={MATERIALS.deskTop} />
      <Box position={[-DESK.width / 2 + 0.05, (top - 0.06) / 2, 0]} size={[0.06, top - 0.06, DESK.depth - 0.06]} />
      <Box position={[DESK.width / 2 - 0.05, (top - 0.06) / 2, 0]} size={[0.06, top - 0.06, DESK.depth - 0.06]} />
      <Monitor position={[0, top, -0.22]} label={name} />
      <Box position={[0, top + 0.015, 0.1]} size={[0.45, 0.03, 0.15]} material={MATERIALS.metal} />
      <Chair position={[0, 0, 0.75]} />
    </group>
  );
}

const COLUMN_COLORS: Readonly<Record<TaskColumn, string>> = {
  backlog: COLORS.grey,
  ready: COLORS.mint,
  in_progress: COLORS.emerald,
  in_review: COLORS.amber,
  qa: COLORS.forest,
  blocked: COLORS.danger,
  merged: COLORS.charcoal,
};

/** Whiteboard on the west wall with one labelled lane per task column. Cards arrive in S06-01. */
function KanbanBoard() {
  const { footprint } = landmark('board');
  const width = footprint.depth;
  const height = 1.5;
  const lane = width / TASK_COLUMNS.length;
  return (
    <group name="board" userData={{ interactiveId: 'board' }} {...interactProps(landmark('board'))} position={[footprint.center.x, 1.55, footprint.center.z]} rotation-y={Math.PI / 2}>
      <Box position={[0, 0, -0.02]} size={[width + 0.12, height + 0.12, 0.04]} material={MATERIALS.metal} />
      <Box position={[0, 0, 0.01]} size={[width, height, 0.03]} material={MATERIALS.whiteboard} />
      {TASK_COLUMNS.map((column, i) => {
        const x = -width / 2 + lane * (i + 0.5);
        return (
          <group key={column} position={[x, height / 2 - 0.12, 0.03]}>
            <Plate
              text={COLUMN_LABELS[column]}
              height={0.11}
              position={[0, 0, 0]}
              colors={{ background: COLUMN_COLORS[column], text: column === 'backlog' || column === 'ready' ? COLORS.charcoal : COLORS.ivory }}
            />
            {i > 0 && <Box position={[-lane / 2, -height / 2 + 0.12, 0]} size={[0.01, height - 0.1, 0.01]} material={MATERIALS.zoneEdge} />}
          </group>
        );
      })}
      <Box position={[0, -height / 2 - 0.1, 0.06]} size={[width * 0.6, 0.04, 0.1]} material={MATERIALS.metal} />
    </group>
  );
}

function QaLab() {
  const { footprint } = landmark('qa-screen');
  return (
    <group name="qa-lab">
      <group name="qa-screen" userData={{ interactiveId: 'qa-screen' }} {...interactProps(landmark('qa-screen'))} position={[footprint.center.x, 1.75, footprint.center.z]}>
        <Box position={[0, 0, 0]} size={[footprint.width + 0.1, 1.35, 0.06]} material={MATERIALS.metal} />
        <Box position={[0, 0, 0.035]} size={[footprint.width, 1.25, 0.02]} material={MATERIALS.screen} />
        <Plate text="QA · simulated checks" height={0.16} position={[0, 0.45, 0.05]} />
      </group>
      {QA_STATIONS.map((p) => (
        <QaStation key={`${String(p.x)}:${String(p.z)}`} at={p} />
      ))}
    </group>
  );
}

function QaStation({ at }: { at: Point2 }) {
  const top = QA_STATION.height;
  return (
    <group position={[at.x, 0, at.z]}>
      <Box position={[0, top - 0.03, 0]} size={[QA_STATION.width, 0.06, QA_STATION.depth]} material={MATERIALS.deskTop} />
      <Box position={[0, (top - 0.06) / 2, 0]} size={[QA_STATION.width - 0.2, top - 0.06, 0.08]} />
      <Monitor position={[-0.42, top, -0.2]} />
      <Monitor position={[0.42, top, -0.2]} />
      {/* A phone on a stand, for device testing. */}
      <Box position={[0.05, top + 0.09, 0.15]} size={[0.09, 0.17, 0.02]} material={MATERIALS.screen} />
      <Chair position={[0, 0, 0.75]} />
    </group>
  );
}

function StatusDisplay({ projectName }: { projectName: string }) {
  const { footprint } = landmark('status-display');
  return (
    <group name="status-display" userData={{ interactiveId: 'status-display' }} {...interactProps(landmark('status-display'))} position={[footprint.center.x, 0, footprint.center.z]}>
      <Box position={[0, 0.03, 0]} size={[footprint.width * 0.5, 0.06, footprint.depth]} material={MATERIALS.metal} />
      <Box position={[0, 0.65, 0]} size={[0.08, 1.2, 0.08]} material={MATERIALS.metal} />
      <Box position={[0, 1.5, 0]} size={[footprint.width, 0.95, 0.1]} material={MATERIALS.screen} />
      <Plate text={`${projectName} · status`} height={0.2} position={[0, 1.62, -0.055]} rotationY={Math.PI} />
      <Plate text={`${projectName} · status`} height={0.2} position={[0, 1.62, 0.055]} />
    </group>
  );
}

function Reception({ projectName }: { projectName: string }) {
  const { footprint } = landmark('reception');
  const { x, z } = footprint.center;
  return (
    <group name="reception" userData={{ interactiveId: 'reception' }} {...interactProps(landmark('reception'))} position={[x, 0, z]}>
      <Box position={[0, 0.55, 0]} size={[footprint.width, 1.1, footprint.depth]} />
      <Box position={[0, 1.12, 0]} size={[footprint.width + 0.12, 0.05, footprint.depth + 0.12]} material={MATERIALS.deskTop} />
      <Monitor position={[0.15, 1.14, -0.6]} />
      <Chair position={[0.9, 0, 0]} rotationY={-Math.PI / 2} />
      {/* Project plaque on the east wall behind the counter. */}
      <Plate text={projectName} height={0.45} position={[2.7, 1.9, 0]} rotationY={-Math.PI / 2} />
      <Plate text={projectName} height={0.22} position={[-footprint.width / 2 - 0.005, 0.8, 0]} rotationY={-Math.PI / 2} />
    </group>
  );
}

function MeetingArea() {
  const { center, radius, height, chairs } = MEETING_TABLE;
  return (
    <group name="meeting-table" position={[center.x, 0, center.z]}>
      <mesh geometry={GEOMETRIES.cylinder} material={MATERIALS.deskTop} position={[0, height - 0.03, 0]} scale={[radius * 2, 0.06, radius * 2]} castShadow receiveShadow />
      <mesh geometry={GEOMETRIES.cylinder} material={MATERIALS.wood} position={[0, (height - 0.06) / 2, 0]} scale={[0.25, height - 0.06, 0.25]} castShadow />
      {Array.from({ length: chairs }, (_, i) => {
        const angle = (i / chairs) * Math.PI * 2;
        const r = radius + 0.45;
        // Chairs face the table: their backs point away from the centre.
        return <Chair key={i} position={[Math.sin(angle) * r, 0, Math.cos(angle) * r]} rotationY={angle} />;
      })}
    </group>
  );
}

function Plant({ at, index }: { at: Point2; index: number }) {
  // Deterministic variety from the plant's index, not Math.random.
  const scale = 0.85 + ((index * 37) % 5) * 0.08;
  return (
    <group position={[at.x, 0, at.z]} scale={scale}>
      <mesh geometry={GEOMETRIES.cylinder} material={MATERIALS.pot} position={[0, 0.22, 0]} scale={[0.42, 0.44, 0.42]} castShadow />
      <mesh geometry={GEOMETRIES.blob} material={MATERIALS.leafDark} position={[0, 0.72, 0]} scale={[0.75, 0.8, 0.75]} castShadow />
      <mesh geometry={GEOMETRIES.blob} material={MATERIALS.leaf} position={[0.12, 1.0, 0.05]} scale={[0.5, 0.55, 0.5]} rotation-y={index} castShadow />
    </group>
  );
}

export interface FurnitureProps {
  desks: readonly { desk: DeskAssignment; name: string }[];
  projectName: string;
}

export function Furniture({ desks, projectName }: FurnitureProps) {
  return (
    <group name="furniture">
      {desks.map(({ desk, name }) => (
        <Desk key={desk.id} desk={desk} name={name} />
      ))}
      <KanbanBoard />
      <QaLab />
      <StatusDisplay projectName={projectName} />
      <Reception projectName={projectName} />
      <MeetingArea />
      {PLANTS.map((p, i) => (
        <Plant key={`${String(p.x)}:${String(p.z)}`} at={p} index={i} />
      ))}
    </group>
  );
}
