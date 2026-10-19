import { Canvas } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { ACESFilmicToneMapping, PCFShadowMap } from 'three';
import { useWorkflow } from '../store/context.ts';
import { interactionStore } from '../store/interaction.ts';
import { navigationStore, useNavigation } from '../store/navigation.ts';
import { floorById, floorTitle, occupantOf } from './building.ts';
import { Characters } from './characters/Characters.tsx';
import { characterModels } from './characters/models.ts';
import { vacantDesks, type DeskView } from './deskViews.ts';
import { Furniture } from './Furniture.tsx';
import { interactionTargets } from './interaction.ts';
import { lockPointer } from './interactable.ts';
import { PLAYER_SPAWN, VACANT_FLOOR_LANDMARKS, deskAssignments } from './layout.ts';
import { Lights, Outside } from './Outside.tsx';
import { EYE_HEIGHT } from './player/movement.ts';
import { PlayerRig } from './player/PlayerRig.tsx';
import { floorBoard } from './screens/board.ts';
import { qaDisplay, statusTiles } from './screens/displays.ts';
import { screenModel } from './screens/screenModel.ts';
import { RoomShell } from './Shell.tsx';
import { FloorSceneProvider, OutlineSizer } from './Solid.tsx';

export interface OfficeCanvasProps {
  /** Called once the WebGL canvas has been created. */
  onReady: () => void;
  reducedMotion: boolean;
}

/**
 * The office: one floor of the building, its room, furniture, characters, the
 * view outside, and the first-person player. Everything shown is derived from
 * the snapshot and the current floor; nothing here writes workflow state.
 */
export function OfficeCanvas({ onReady, reducedMotion }: OfficeCanvasProps) {
  // Read the store outside the Canvas and pass plain props in.
  const snapshot = useWorkflow((s) => s.snapshot);
  const floorId = useNavigation((s) => s.floor);
  const floor = floorById(floorId);
  const project = occupantOf(snapshot, floorId);
  const vacant = project === null;

  const scene = useMemo(() => {
    const team = project ? snapshot.agents.filter((a) => a.projectId === project.id) : [];
    const desks: DeskView[] = vacant
      ? vacantDesks()
      : deskAssignments(team).map((desk) => ({
          slot: desk.slot,
          desk,
          name: team.find((a) => a.id === desk.agentId)?.name ?? desk.agentId,
          screen: screenModel(snapshot, desk.agentId),
        }));
    const board = floorBoard(snapshot, floorId);
    const qa = vacant ? { heading: null, rows: [] } : qaDisplay(snapshot);
    const tiles = vacant ? [] : statusTiles(snapshot);
    const statusTitle = project ? `${project.name} · status` : `${floorTitle(floor)} · vacant`;
    return {
      desks,
      characters: vacant ? [] : characterModels(snapshot, reducedMotion, team),
      targets: vacant ? interactionTargets([], VACANT_FLOOR_LANDMARKS) : interactionTargets(team),
      plaque: project?.name ?? `${floor.theme.name} · vacant`,
      board: { columns: board.columns, heading: board.heading, key: `${floor.id}|${JSON.stringify(board.columns)}` },
      qa: { display: qa, key: `${floor.id}|${JSON.stringify(qa)}` },
      status: { title: statusTitle, tiles, key: `${floor.id}|${statusTitle}|${JSON.stringify(tiles)}` },
    };
  }, [snapshot, project, vacant, floor, floorId, reducedMotion]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  return (
    <Canvas
      shadows={{ type: PCFShadowMap }}
      dpr={[1, 2]}
      gl={{ toneMapping: ACESFilmicToneMapping, antialias: true }}
      camera={{ position: [PLAYER_SPAWN.x, EYE_HEIGHT, PLAYER_SPAWN.z], fov: 72, near: 0.05, far: 900 }}
      onCreated={(state) => {
        canvasRef.current = state.gl.domElement;
        onReady();
      }}
      // A click on empty space locks the pointer; clicks on objects activate them instead.
      onPointerMissed={(e) => {
        // Only in walk mode, and not over an open terminal: the overview is for looking, not mouse look.
        const walking = navigationStore.getState().view === 'walk' && !interactionStore.getState().terminal;
        if (e.button === 0 && canvasRef.current && walking) {
          lockPointer(canvasRef.current);
        }
      }}
      aria-label={`3D office, ${floorTitle(floor)}`}
    >
      <FloorSceneProvider floor={floor} interactive={!vacant} reducedMotion={reducedMotion}>
        <OutlineSizer />
        <Lights />
        <Outside />
        <RoomShell />
        <Furniture desks={scene.desks} plaque={scene.plaque} board={scene.board} qa={scene.qa} status={scene.status} />
        <Characters characters={scene.characters} />
        <PlayerRig targets={scene.targets} />
      </FloorSceneProvider>
    </Canvas>
  );
}

export default OfficeCanvas;
