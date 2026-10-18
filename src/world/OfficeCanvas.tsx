import { Canvas } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { useWorkflow } from '../store/context.ts';
import { Characters } from './characters/Characters.tsx';
import { characterModels } from './characters/models.ts';
import { COLORS } from '../ui/tokens.ts';
import {
  FLOOR,
  PLAYER_SPAWN,
  WALL,
  WINDOW_HEIGHT,
  WINDOW_SILL,
  WINDOWS,
  ZONES,
  deskAssignments,
  type WallWindow,
  type Zone,
} from './layout.ts';
import { Furniture } from './Furniture.tsx';
import { interactionTargets } from './interaction.ts';
import { lockPointer } from './interactable.ts';
import { floorLabel } from './labels.ts';
import { EYE_HEIGHT } from './player/movement.ts';
import { PlayerRig } from './player/PlayerRig.tsx';
import { GEOMETRIES, MATERIALS } from './materials.ts';

export interface OfficeCanvasProps {
  /** Called once the WebGL canvas has been created. */
  onReady: () => void;
  reducedMotion: boolean;
}

const HALF_W = FLOOR.width / 2;
const HALF_D = FLOOR.depth / 2;

function Floor() {
  return (
    <mesh
      geometry={GEOMETRIES.plane}
      material={MATERIALS.floor}
      rotation-x={-Math.PI / 2}
      scale={[FLOOR.width, FLOOR.depth, 1]}
      receiveShadow
    />
  );
}

function WallSegment({ x, z, width, depth, height }: { x: number; z: number; width: number; depth: number; height: number }) {
  return (
    <mesh
      geometry={GEOMETRIES.box}
      material={MATERIALS.wall}
      position={[x, height / 2, z]}
      scale={[width, height, depth]}
      castShadow
      receiveShadow
    />
  );
}

function Walls() {
  const t = WALL.thickness;
  return (
    <group name="walls">
      <WallSegment x={0} z={-HALF_D - t / 2} width={FLOOR.width + t * 2} depth={t} height={WALL.height} />
      <WallSegment x={-HALF_W - t / 2} z={0} width={t} depth={FLOOR.depth} height={WALL.height} />
      <WallSegment x={HALF_W + t / 2} z={0} width={t} depth={FLOOR.depth} height={WALL.height} />
      <WallSegment x={0} z={HALF_D + t / 2} width={FLOOR.width + t * 2} depth={t} height={WALL.height} />
    </group>
  );
}

function WindowPane({ wall, offset, width }: WallWindow) {
  const y = WINDOW_SILL + WINDOW_HEIGHT / 2;
  const inset = 0.02;
  const north = wall === 'north';
  const position: [number, number, number] = north ? [offset, y, -HALF_D + inset] : [HALF_W - inset, y, offset];
  const glass: [number, number, number] = north ? [width, WINDOW_HEIGHT, 0.04] : [0.04, WINDOW_HEIGHT, width];
  const frame: [number, number, number] = north ? [width + 0.16, WINDOW_HEIGHT + 0.16, 0.03] : [0.03, WINDOW_HEIGHT + 0.16, width + 0.16];
  return (
    <group position={position}>
      <mesh geometry={GEOMETRIES.box} material={MATERIALS.trim} scale={frame} />
      <mesh geometry={GEOMETRIES.box} material={MATERIALS.window} scale={glass} position={north ? [0, 0, 0.02] : [-0.02, 0, 0]} />
    </group>
  );
}

/** Label height on the floor, in metres. */
const LABEL_HEIGHT = 0.75;

function ZonePad({ zone }: { zone: Zone }) {
  const { width, depth } = zone.size;
  const label = floorLabel(zone.label);
  // Shrink a label to fit inside narrow zones.
  const labelHeight = Math.min(LABEL_HEIGHT, (width - 0.3) / label.aspect);
  return (
    <group name={`zone:${zone.id}`} position={[zone.center.x, 0, zone.center.z]}>
      <mesh
        geometry={GEOMETRIES.plane}
        material={MATERIALS.zoneEdge}
        rotation-x={-Math.PI / 2}
        position-y={0.004}
        scale={[width + 0.12, depth + 0.12, 1]}
      />
      <mesh
        geometry={GEOMETRIES.plane}
        material={MATERIALS.zoneRug}
        rotation-x={-Math.PI / 2}
        position-y={0.008}
        scale={[width, depth, 1]}
        receiveShadow
      />
      <mesh
        geometry={GEOMETRIES.plane}
        material={label.material}
        rotation-x={-Math.PI / 2}
        // At the zone's approach spot, where furniture never stands.
        position={[zone.anchor.x - zone.center.x, 0.012, zone.anchor.z - zone.center.z]}
        scale={[labelHeight * label.aspect, labelHeight, 1]}
      />
    </group>
  );
}

/** The office: room, furniture, characters, and the first-person player. */
export function OfficeCanvas({ onReady, reducedMotion }: OfficeCanvasProps) {
  // Read the store outside the Canvas and pass plain props in.
  const snapshot = useWorkflow((s) => s.snapshot);
  const { agents } = snapshot;
  const projectName = snapshot.projects[0]?.name ?? 'Project';
  const desks = useMemo(
    () =>
      deskAssignments(agents).map((desk) => ({
        desk,
        name: agents.find((a) => a.id === desk.agentId)?.name ?? desk.agentId,
      })),
    [agents],
  );
  const characters = useMemo(() => characterModels(snapshot, reducedMotion), [snapshot, reducedMotion]);
  const targets = useMemo(() => interactionTargets(agents), [agents]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 2]}
      camera={{ position: [PLAYER_SPAWN.x, EYE_HEIGHT, PLAYER_SPAWN.z], fov: 70, near: 0.05 }}
      onCreated={(state) => {
        canvasRef.current = state.gl.domElement;
        onReady();
      }}
      // A click on empty space locks the pointer; clicks on objects activate them instead.
      onPointerMissed={(e) => {
        if (e.button === 0 && canvasRef.current) lockPointer(canvasRef.current);
      }}
      aria-label="3D office floor"
    >
      <color attach="background" args={[COLORS.ivory]} />
      <hemisphereLight args={[COLORS.ivory, COLORS.floor, 0.7]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        // From the open south side, so wall shadows fall outside the room.
        position={[0, 18, 12]}
        intensity={1.4}
        color={COLORS.ivory}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
        shadow-normalBias={0.03}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <Floor />
      <Walls />
      {WINDOWS.map((w) => (
        <WindowPane key={`${w.wall}:${String(w.offset)}`} {...w} />
      ))}
      {ZONES.map((zone) => (
        <ZonePad key={zone.id} zone={zone} />
      ))}
      <Furniture desks={desks} projectName={projectName} />
      <Characters characters={characters} />
      <PlayerRig targets={targets} />
    </Canvas>
  );
}

export default OfficeCanvas;
