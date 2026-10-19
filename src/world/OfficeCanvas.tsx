import { Canvas } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { ACESFilmicToneMapping, PCFShadowMap } from 'three';
import { useWorkflow } from '../store/context.ts';
import { interactionStore } from '../store/interaction.ts';
import { useEffectiveTier, useQuality } from '../store/quality.ts';
import { navigationStore, useNavigation } from '../store/navigation.ts';
import { floorById, floorSnapshot, floorTitle, occupantOf } from './building.ts';
import { floorSky } from './dayCycle.ts';
import { Characters } from './characters/Characters.tsx';
import { characterModels } from './characters/models.ts';
import { floorDesks } from './deskViews.ts';
import { Furniture } from './Furniture.tsx';
import { GlowPass } from './GlowPass.tsx';
import { interactionTargets } from './interaction.ts';
import { lockPointer } from './interactable.ts';
import { LiveSkyProvider } from './LiveSkyProvider.tsx';
import { PLAYER_SPAWN, VACANT_FLOOR_LANDMARKS, deskAssignments } from './layout.ts';
import { Lights, Outside } from './Outside.tsx';
import { EYE_HEIGHT } from './player/movement.ts';
import { PlayerRig } from './player/PlayerRig.tsx';
import { PerfProbe } from './PerfProbe.tsx';
import { TIER_RULES } from './quality.ts';
import { QualityContext } from './qualityContext.ts';
import { floorBoard } from './screens/board.ts';
import { qaDisplay, statusTiles } from './screens/displays.ts';
import { screenModel } from './screens/screenModel.ts';
import { SceneAudit } from './SceneAudit.tsx';
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
  const followClock = useNavigation((s) => s.followClock);
  const clock = snapshot.clock.now;
  const sky = useMemo(() => floorSky(floor.theme, followClock, clock), [floor, followClock, clock]);

  const scene = useMemo(() => {
    // Everything on this floor reads the floor's slice of the snapshot.
    const here = floorSnapshot(snapshot, floorId);
    const team = here.agents;
    const desks = floorDesks(
      deskAssignments(team).map((desk) => ({
        slot: desk.slot,
        desk,
        name: team.find((a) => a.id === desk.agentId)?.name ?? desk.agentId,
        screen: screenModel(here, desk.agentId),
      })),
    );
    const board = floorBoard(snapshot, floorId);
    const qa = vacant ? { heading: null, rows: [] } : qaDisplay(here);
    const tiles = vacant ? [] : statusTiles(here);
    const statusTitle = project ? `${project.name} · status` : `${floorTitle(floor)} · vacant`;
    return {
      desks,
      characters: vacant ? [] : characterModels(here, reducedMotion),
      targets: vacant ? interactionTargets([], VACANT_FLOOR_LANDMARKS) : interactionTargets(team),
      plaque: project?.name ?? `${floor.theme.name} · vacant`,
      board: { columns: board.columns, heading: board.heading, key: `${floor.id}|${JSON.stringify(board.columns)}` },
      qa: { display: qa, key: `${floor.id}|${JSON.stringify(qa)}` },
      status: { title: statusTitle, tiles, key: `${floor.id}|${statusTitle}|${JSON.stringify(tiles)}` },
    };
  }, [snapshot, project, vacant, floor, floorId, reducedMotion]);

  // The selected card is outlined on the wall too; only the board repaints when it changes.
  const selectedTaskId = useNavigation((s) => s.selectedTaskId);
  const board = useMemo(
    () => ({ ...scene.board, selected: selectedTaskId, key: `${scene.board.key}|${selectedTaskId ?? ''}` }),
    [scene.board, selectedTaskId],
  );

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Graphics quality: presentation only, read outside the Canvas like the rest.
  const tier = useEffectiveTier();
  const auto = useQuality((s) => s.setting === 'auto');
  const quality = useMemo(() => ({ tier, rules: TIER_RULES[tier] }), [tier]);
  const { rules } = quality;

  return (
    <Canvas
      shadows={{ type: PCFShadowMap }}
      dpr={typeof rules.dpr === 'number' ? rules.dpr : [rules.dpr[0], rules.dpr[1]]}
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
      data-quality={tier}
    >
      <QualityContext.Provider value={quality}>
      <FloorSceneProvider floor={floor} interactive={!vacant} reducedMotion={reducedMotion} sky={sky}>
        <LiveSkyProvider>
          <OutlineSizer />
          <Lights />
          <Outside />
          <RoomShell />
          <Furniture desks={scene.desks} plaque={scene.plaque} board={board} qa={scene.qa} status={scene.status} />
          <Characters characters={scene.characters} />
          <PlayerRig targets={scene.targets} />
          <SceneAudit />
          <PerfProbe auto={auto} tier={tier} />
          {rules.glow && <GlowPass />}
        </LiveSkyProvider>
      </FloorSceneProvider>
      </QualityContext.Provider>
    </Canvas>
  );
}

export default OfficeCanvas;
