import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Mesh } from 'three';
import { COLORS } from '../ui/tokens.ts';
import { interactProps } from './interactable.ts';
import { floorLabel } from './labels.ts';
import {
  DESK,
  FLOOR,
  LANDMARKS,
  MEETING_TABLE,
  PLANTS,
  QA_STATION,
  QA_STATIONS,
  type LandmarkId,
  type Point2,
} from './layout.ts';
import { GEOMETRIES, MATERIALS, glow, toon } from './materials.ts';
import { paintBoard, paintQa, paintStatus, type BoardColumn, type QaDisplay, type StatusTile } from './screens/displays.ts';
import type { DeskView } from './deskViews.ts';
import { paintScreen } from './screens/drawTerminal.ts';
import { VACANT_SCREEN, type ScreenModel } from './screens/screenModel.ts';
import { useFloorScene } from './floorScene.ts';
import { Solid, type Vec3 } from './Solid.tsx';
import { usePaintedTexture } from './useTexture.ts';

/**
 * Cel-shaded furnishings. Every solid reuses the shared unit geometries and
 * the floor's materials, scaled per mesh. Screens and the whiteboard paint the
 * snapshot onto canvas textures; they only read it.
 */

function landmark(id: LandmarkId) {
  const found = LANDMARKS.find((l) => l.id === id);
  if (!found) throw new Error(`Unknown landmark ${id}`);
  return found;
}

/** Click handlers, but only where the floor is interactive. */
function useInteract(target: { id: string; label: string }, always = false) {
  const { interactive } = useFloorScene();
  return interactive || always ? interactProps(target) : {};
}

/** A flat sticker label. Faces south (+z) unless rotated. */
function Plate({ text, height, position, rotationY = 0, colors }: { text: string; height: number; position: Vec3; rotationY?: number; colors?: Parameters<typeof floorLabel>[1] }) {
  const label = floorLabel(text, colors);
  return <mesh geometry={GEOMETRIES.plane} material={label.material} position={position} rotation-y={rotationY} scale={[height * label.aspect, height, 1]} />;
}

const SCREEN = { width: 0.78, height: 0.47 } as const;

/** Blinking prompt cursor; steady when motion is reduced. */
function Cursor({ position, color }: { position: Vec3; color: string }) {
  const ref = useRef<Mesh>(null);
  const { reducedMotion } = useFloorScene();
  useFrame(({ clock }) => {
    if (ref.current) ref.current.visible = reducedMotion || Math.floor(clock.elapsedTime * 2) % 2 === 0;
  });
  return <mesh ref={ref} geometry={GEOMETRIES.plane} material={glow(color)} position={position} scale={[0.022, 0.034, 1]} />;
}

/** A monitor facing south (+z) showing a painted terminal or screensaver. */
function Monitor({ position, model, rotationY = 0 }: { position: Vec3; model: ScreenModel; rotationY?: number }) {
  const painted = paintScreen(model);
  const cursor = painted?.cursor;
  const sy = 0.42;
  return (
    <group position={position} rotation-y={rotationY}>
      <Solid material={MATERIALS.metal} position={[0, 0.01, 0]} scale={[0.26, 0.02, 0.18]} />
      <Solid material={MATERIALS.metal} position={[0, 0.17, -0.02]} scale={[0.05, 0.32, 0.04]} />
      <Solid material={MATERIALS.bezel} position={[0, sy, -0.015]} scale={[SCREEN.width + 0.06, SCREEN.height + 0.06, 0.04]} />
      <mesh geometry={GEOMETRIES.plane} position={[0, sy, 0.007]} scale={[SCREEN.width, SCREEN.height, 1]}>
        {painted ? <meshBasicMaterial map={painted.texture} toneMapped={false} /> : <meshBasicMaterial color={COLORS.screen} />}
      </mesh>
      {cursor && (
        <Cursor
          position={[-SCREEN.width / 2 + cursor.x * SCREEN.width + 0.012, sy + SCREEN.height / 2 - cursor.y * SCREEN.height, 0.009]}
          color={model.runtime.accent}
        />
      )}
    </group>
  );
}

function Chair({ position, rotationY = 0 }: { position: Vec3; rotationY?: number }) {
  const { materials } = useFloorScene();
  return (
    <group position={position} rotation-y={rotationY}>
      <Solid material={materials.fabric} position={[0, 0.46, 0]} scale={[0.52, 0.09, 0.5]} />
      <Solid material={materials.fabric} position={[0, 0.8, 0.23]} scale={[0.5, 0.56, 0.08]} />
      <Solid material={MATERIALS.metal} position={[0, 0.23, 0]} scale={[0.06, 0.42, 0.06]} outline={false} />
      <Solid material={MATERIALS.metal} position={[0, 0.04, 0]} scale={[0.5, 0.04, 0.06]} />
      <Solid material={MATERIALS.metal} position={[0, 0.04, 0]} scale={[0.06, 0.04, 0.5]} />
    </group>
  );
}

/** Small things that make a desk look used. Deterministic per desk. */
function DeskClutter({ index, top }: { index: number; top: number }) {
  const { materials } = useFloorScene();
  const mug = toon(['#ffffff', '#ffd166', '#ff8a5b', '#4cc9f0'][index % 4] ?? '#ffffff');
  return (
    <>
      <Solid geometry="cylinder" material={mug} position={[0.6, top + 0.06, 0.12]} scale={[0.09, 0.12, 0.09]} />
      {index % 2 === 0 ? (
        <group position={[-0.62, top, -0.2]}>
          <Solid geometry="cylinder" material={materials.pot} position={[0, 0.06, 0]} scale={[0.12, 0.12, 0.12]} />
          <Solid geometry="blob" material={materials.leaf} position={[0, 0.18, 0]} scale={[0.18, 0.16, 0.18]} />
        </group>
      ) : (
        <group position={[-0.6, top, -0.15]}>
          <Solid material={toon('#e63946')} position={[0, 0.02, 0]} scale={[0.26, 0.04, 0.18]} />
          <Solid material={toon('#457b9d')} position={[0.01, 0.06, 0]} scale={[0.24, 0.04, 0.17]} />
          <Solid material={toon('#f4a261')} position={[-0.01, 0.1, 0]} scale={[0.22, 0.04, 0.16]} />
        </group>
      )}
    </>
  );
}


function Desk({ view, index }: { view: DeskView; index: number }) {
  const { materials } = useFloorScene();
  const { x, z } = view.slot;
  const top = DESK.height;
  const handlers = useInteract(view.desk ? { id: view.desk.id, label: `${view.name}'s desk` } : { id: 'none', label: '' });
  return (
    <group
      name={view.desk?.id ?? `desk:vacant:${String(index)}`}
      userData={view.desk ? { interactiveId: view.desk.id, agentId: view.desk.agentId } : {}}
      position={[x, 0, z]}
      {...(view.desk ? handlers : {})}
    >
      <Solid material={materials.deskTop} position={[0, top - 0.03, 0]} scale={[DESK.width, 0.06, DESK.depth]} />
      <Solid material={materials.wood} position={[-DESK.width / 2 + 0.06, (top - 0.06) / 2, 0]} scale={[0.07, top - 0.06, DESK.depth - 0.08]} />
      <Solid material={materials.wood} position={[DESK.width / 2 - 0.06, (top - 0.06) / 2, 0]} scale={[0.07, top - 0.06, DESK.depth - 0.08]} />
      <Solid material={materials.wood} position={[0, top - 0.3, -DESK.depth / 2 + 0.05]} scale={[DESK.width - 0.14, 0.4, 0.04]} castShadow={false} />
      <Monitor position={[0, top, -0.2]} model={view.screen} />
      <Solid material={MATERIALS.bezel} position={[0, top + 0.015, 0.12]} scale={[0.46, 0.03, 0.15]} />
      <DeskClutter index={index} top={top} />
      {/* Light from the screen pooling on the desk. */}
      <mesh geometry={GEOMETRIES.plane} material={materials.screenPool} rotation-x={-Math.PI / 2} position={[0, top + 0.002, 0.05]} scale={[1.5, 0.9, 1]} />
      <Chair position={[0, 0, 0.75]} />
    </group>
  );
}

/** Whiteboard on the west wall, painted with sticky notes from the snapshot. */
function KanbanBoard({
  columns,
  heading,
  selected,
  boardKey,
}: {
  columns: readonly BoardColumn[];
  heading: string;
  selected: string | null;
  boardKey: string;
}) {
  const { footprint } = landmark('board');
  const { materials } = useFloorScene();
  const handlers = useInteract(landmark('board'));
  const width = footprint.depth;
  const height = 1.5;
  const texture = usePaintedTexture(boardKey, () => paintBoard(columns, heading, selected));
  return (
    <group name="board" userData={{ interactiveId: 'board' }} {...handlers} position={[footprint.center.x, 1.55, footprint.center.z]} rotation-y={Math.PI / 2}>
      <Solid material={materials.trim} position={[0, 0, -0.03]} scale={[width + 0.14, height + 0.14, 0.05]} />
      <mesh geometry={GEOMETRIES.plane} position={[0, 0, 0.002]} scale={[width, height, 1]}>
        {texture ? <meshBasicMaterial map={texture} toneMapped={false} /> : <meshBasicMaterial color={COLORS.whiteboard} />}
      </mesh>
      <Solid material={materials.trim} position={[0, -height / 2 - 0.08, 0.06]} scale={[width * 0.7, 0.04, 0.12]} />
      {['#e63946', '#4cc9f0', '#80ed99'].map((c, i) => (
        <Solid key={c} geometry="cylinder" material={toon(c)} position={[-0.4 + i * 0.16, -height / 2 - 0.04, 0.08]} scale={[0.04, 0.14, 0.04]} rotation={[0, 0, Math.PI / 2]} />
      ))}
    </group>
  );
}

function QaLab({ qa, qaKey }: { qa: QaDisplay; qaKey: string }) {
  const { footprint } = landmark('qa-screen');
  const { materials } = useFloorScene();
  const handlers = useInteract(landmark('qa-screen'));
  const texture = usePaintedTexture(qaKey, () => paintQa(qa));
  return (
    <group name="qa-lab">
      <group name="qa-screen" userData={{ interactiveId: 'qa-screen' }} {...handlers} position={[footprint.center.x, 1.75, footprint.center.z]}>
        <Solid material={MATERIALS.bezel} position={[0, 0, -0.01]} scale={[footprint.width + 0.12, 1.37, 0.06]} />
        <mesh geometry={GEOMETRIES.plane} position={[0, 0, 0.025]} scale={[footprint.width, 1.25, 1]}>
          {texture ? <meshBasicMaterial map={texture} toneMapped={false} /> : <meshBasicMaterial color={COLORS.screen} />}
        </mesh>
        <Solid material={materials.accent} position={[0, -0.72, 0.02]} scale={[footprint.width + 0.12, 0.06, 0.08]} />
      </group>
      {QA_STATIONS.map((p, i) => (
        <QaStation key={`${String(p.x)}:${String(p.z)}`} at={p} index={i} />
      ))}
    </group>
  );
}

const QA_SCREEN_MODEL: ScreenModel = { ...VACANT_SCREEN, key: 'qa-station', caption: ['QA bench', 'Simulated device tests'] };

function QaStation({ at, index }: { at: Point2; index: number }) {
  const { materials } = useFloorScene();
  const top = QA_STATION.height;
  return (
    <group position={[at.x, 0, at.z]}>
      <Solid material={materials.deskTop} position={[0, top - 0.03, 0]} scale={[QA_STATION.width, 0.06, QA_STATION.depth]} />
      <Solid material={materials.wood} position={[0, (top - 0.06) / 2, 0]} scale={[QA_STATION.width - 0.2, top - 0.06, 0.08]} />
      <Monitor position={[-0.42, top, -0.2]} model={QA_SCREEN_MODEL} />
      {/* A phone and a tablet on stands, for device testing. */}
      <Solid material={MATERIALS.bezel} position={[0.45, top + 0.12, -0.1]} scale={[0.12, 0.22, 0.02]} rotation={[-0.2, 0, 0]} />
      <Solid material={MATERIALS.bezel} position={[0.15, top + 0.13, -0.1]} scale={[0.3, 0.22, 0.02]} rotation={[-0.2, 0, 0]} />
      <mesh geometry={GEOMETRIES.plane} material={glow(index % 2 ? '#4cc9f0' : '#80ed99')} position={[0.45, top + 0.12, -0.087]} rotation-x={-0.2} scale={[0.1, 0.19, 1]} />
      <mesh geometry={GEOMETRIES.plane} material={glow('#ffd166')} position={[0.15, top + 0.13, -0.087]} rotation-x={-0.2} scale={[0.27, 0.19, 1]} />
      <Chair position={[0, 0, 0.75]} />
    </group>
  );
}

function StatusDisplay({ title, tiles, statusKey }: { title: string; tiles: readonly StatusTile[]; statusKey: string }) {
  const { footprint } = landmark('status-display');
  const { materials } = useFloorScene();
  const handlers = useInteract(landmark('status-display'));
  const texture = usePaintedTexture(statusKey, () => paintStatus(title, tiles));
  return (
    <group name="status-display" userData={{ interactiveId: 'status-display' }} {...handlers} position={[footprint.center.x, 0, footprint.center.z]}>
      <Solid material={materials.trim} position={[0, 0.04, 0]} scale={[footprint.width * 0.5, 0.08, footprint.depth]} />
      <Solid material={materials.trim} position={[0, 0.65, 0]} scale={[0.1, 1.2, 0.1]} />
      <Solid material={MATERIALS.bezel} position={[0, 1.5, 0]} scale={[footprint.width, 0.98, 0.1]} />
      {/* Faces north, towards the approach spot. */}
      <mesh geometry={GEOMETRIES.plane} position={[0, 1.5, -0.052]} rotation-y={Math.PI} scale={[footprint.width - 0.08, 0.9, 1]}>
        {texture ? <meshBasicMaterial map={texture} toneMapped={false} /> : <meshBasicMaterial color={COLORS.screen} />}
      </mesh>
      <Solid material={materials.accent} position={[0, 1.02, 0]} scale={[footprint.width, 0.05, 0.12]} />
    </group>
  );
}

function Reception({ plaque }: { plaque: string }) {
  const { footprint } = landmark('reception');
  const { materials, floor } = useFloorScene();
  const handlers = useInteract(landmark('reception'));
  const { x, z } = footprint.center;
  const accent = { background: floor.theme.accent, text: floor.theme.onAccent };
  return (
    <group name="reception" userData={{ interactiveId: 'reception' }} {...handlers} position={[x, 0, z]}>
      <Solid material={materials.accent} position={[0, 0.55, 0]} scale={[footprint.width, 1.1, footprint.depth]} />
      <Solid material={materials.deskTop} position={[0, 1.12, 0]} scale={[footprint.width + 0.14, 0.06, footprint.depth + 0.14]} />
      <Monitor position={[0.15, 1.15, -0.7]} model={{ ...VACANT_SCREEN, key: `reception|${plaque}`, caption: ['Welcome', plaque] }} rotationY={-Math.PI / 2} />
      <Solid geometry="sphere" material={toon('#ffd166')} position={[0.1, 1.2, 0.9]} scale={[0.12, 0.08, 0.12]} />
      <Chair position={[0.9, 0, 0]} rotationY={-Math.PI / 2} />
      {/* Project plaque on the east wall behind the counter. */}
      <Plate text={plaque} height={0.5} position={[2.75, 1.95, 0]} rotationY={-Math.PI / 2} colors={accent} />
      <Plate text={plaque} height={0.24} position={[-footprint.width / 2 - 0.01, 0.75, 0]} rotationY={-Math.PI / 2} />
    </group>
  );
}

/** Elevator doors in the south wall, with the floor indicator above. Always usable. */
function Elevator() {
  const { footprint } = landmark('elevator');
  const { materials, floor } = useFloorScene();
  const handlers = useInteract(landmark('elevator'), true);
  const wallZ = FLOOR.depth / 2;
  const w = footprint.width;
  return (
    <group name="elevator" userData={{ interactiveId: 'elevator' }} {...handlers} position={[footprint.center.x, 0, wallZ]} rotation-y={Math.PI}>
      <Solid material={materials.accent} position={[0, 1.2, -0.02]} scale={[w + 0.3, 2.4, 0.08]} />
      <Solid material={MATERIALS.metal} position={[-w / 4 + 0.01, 1.08, 0.03]} scale={[w / 2 - 0.04, 2.1, 0.04]} />
      <Solid material={MATERIALS.metal} position={[w / 4 - 0.01, 1.08, 0.03]} scale={[w / 2 - 0.04, 2.1, 0.04]} />
      <Plate
        text={`${String(floor.level)} · ${floor.theme.name}`}
        height={0.22}
        position={[0, 2.62, 0.02]}
        colors={{ background: COLORS.screen, text: floor.theme.accent, border: floor.theme.accent }}
      />
      <Solid material={MATERIALS.bezel} position={[w / 2 + 0.35, 1.2, 0.01]} scale={[0.14, 0.3, 0.04]} />
      <mesh geometry={GEOMETRIES.sphere} material={glow(floor.theme.accent)} position={[w / 2 + 0.35, 1.25, 0.04]} scale={[0.06, 0.06, 0.03]} />
      <mesh geometry={GEOMETRIES.sphere} material={glow(floor.theme.accent)} position={[w / 2 + 0.35, 1.13, 0.04]} scale={[0.06, 0.06, 0.03]} />
    </group>
  );
}

function MeetingArea() {
  const { materials } = useFloorScene();
  const { center, radius, height, chairs } = MEETING_TABLE;
  return (
    <group name="meeting-table" position={[center.x, 0, center.z]}>
      <Solid geometry="cylinder" material={materials.deskTop} position={[0, height - 0.03, 0]} scale={[radius * 2, 0.06, radius * 2]} />
      <Solid geometry="cylinder" material={materials.wood} position={[0, (height - 0.06) / 2, 0]} scale={[0.25, height - 0.06, 0.25]} />
      <Solid geometry="cylinder" material={materials.wood} position={[0, 0.02, 0]} scale={[0.9, 0.04, 0.9]} />
      <Solid geometry="cylinder" material={toon('#ffffff')} position={[0, height + 0.1, 0]} scale={[0.16, 0.2, 0.16]} />
      <Solid geometry="blob" material={toon('#ffd166')} position={[0.03, height + 0.27, 0]} scale={[0.12, 0.12, 0.12]} />
      <Solid geometry="blob" material={toon('#ff6fb5')} position={[-0.05, height + 0.25, 0.04]} scale={[0.1, 0.1, 0.1]} />
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
  const { materials } = useFloorScene();
  // Deterministic variety from the plant's index, not Math.random.
  const scale = 0.85 + ((index * 37) % 5) * 0.08;
  const tall = index % 3 === 0;
  return (
    <group position={[at.x, 0, at.z]} scale={scale}>
      <Solid geometry="cylinder" material={materials.pot} position={[0, 0.22, 0]} scale={[0.44, 0.44, 0.44]} />
      <Solid geometry="cylinder" material={materials.skirting} position={[0, 0.45, 0]} scale={[0.47, 0.05, 0.47]} />
      {tall ? (
        <>
          <Solid geometry="cylinder" material={materials.wood} position={[0, 0.8, 0]} scale={[0.05, 0.7, 0.05]} />
          <Solid geometry="blob" material={materials.leafDark} position={[0, 1.2, 0]} scale={[0.7, 0.75, 0.7]} />
          <Solid geometry="blob" material={materials.leaf} position={[0.1, 1.5, 0.05]} scale={[0.5, 0.55, 0.5]} rotation={[0, index, 0]} />
        </>
      ) : (
        <>
          <Solid geometry="blob" material={materials.leafDark} position={[0, 0.72, 0]} scale={[0.75, 0.8, 0.75]} />
          <Solid geometry="blob" material={materials.leaf} position={[0.12, 1.0, 0.05]} scale={[0.5, 0.55, 0.5]} rotation={[0, index, 0]} />
        </>
      )}
    </group>
  );
}

/** Greenhouse floors: planters hung from the ceiling. Above head height, so nothing to walk around. */
const HANGING_PLANTERS: readonly Point2[] = [
  { x: -7.4, z: -5.4 },
  { x: -4.3, z: -5.4 },
  { x: -1.4, z: -5.4 },
  { x: 1.5, z: -5.4 },
  { x: 4.4, z: -5.4 },
  { x: -10, z: 2.6 },
  { x: 4.5, z: 2.6 },
  { x: -5.2, z: 3.4 },
];

function HangingPlanter({ at }: { at: Point2 }) {
  const { materials } = useFloorScene();
  return (
    <group position={[at.x, 0, at.z]}>
      <mesh geometry={GEOMETRIES.cylinder} material={MATERIALS.metal} position={[0, 2.78, 0]} scale={[0.015, 0.44, 0.015]} />
      <Solid geometry="sphere" material={materials.pot} position={[0, 2.5, 0]} scale={[0.36, 0.26, 0.36]} />
      <Solid geometry="blob" material={materials.leaf} position={[0, 2.38, 0]} scale={[0.55, 0.45, 0.55]} />
      <Solid geometry="blob" material={materials.leafDark} position={[0.12, 2.18, 0.05]} scale={[0.25, 0.4, 0.25]} />
    </group>
  );
}

const POSTERS = ['Ship small, ship often', 'Tests are love letters', 'Be kind in review'] as const;

/** Sticker posters on the south wall, facing into the room. */
function Posters() {
  const { floor } = useFloorScene();
  const z = FLOOR.depth / 2 - 0.13;
  const xs = [-4.4, 3.4, 10.4];
  return (
    <group name="posters">
      {POSTERS.map((text, i) => (
        <Plate
          key={text}
          text={text}
          height={0.3}
          position={[xs[i] ?? 0, 2.05 - (i % 2) * 0.12, z]}
          rotationY={Math.PI}
          colors={i === 1 ? { background: floor.theme.accent, text: floor.theme.onAccent } : undefined}
        />
      ))}
    </group>
  );
}

export interface FurnitureProps {
  desks: readonly DeskView[];
  /** Text for the reception plaque: the project, or the vacant floor's name. */
  plaque: string;
  /** `selected` is the task outlined on the wall; `key` changes whenever the painted board would. */
  board: { columns: readonly BoardColumn[]; heading: string; selected: string | null; key: string };
  qa: { display: QaDisplay; key: string };
  status: { title: string; tiles: readonly StatusTile[]; key: string };
}

export function Furniture({ desks, plaque, board, qa, status }: FurnitureProps) {
  const { floor } = useFloorScene();
  return (
    <group name="furniture">
      {desks.map((view, i) => (
        <Desk key={view.desk?.id ?? `vacant:${String(i)}`} view={view} index={i} />
      ))}
      <KanbanBoard columns={board.columns} heading={board.heading} selected={board.selected} boardKey={board.key} />
      <QaLab qa={qa.display} qaKey={qa.key} />
      <StatusDisplay title={status.title} tiles={status.tiles} statusKey={status.key} />
      <Reception plaque={plaque} />
      <Elevator />
      <MeetingArea />
      <Posters />
      {PLANTS.map((p, i) => (
        <Plant key={`${String(p.x)}:${String(p.z)}`} at={p} index={i} />
      ))}
      {floor.theme.lush && HANGING_PLANTERS.map((p) => <HangingPlanter key={`${String(p.x)}:${String(p.z)}`} at={p} />)}
    </group>
  );
}
