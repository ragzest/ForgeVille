import { Billboard } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Vector3, type Group, type Material, type Mesh } from 'three';
import { COLORS } from '../../ui/tokens.ts';
import { interactProps } from '../interactable.ts';
import { floorLabel } from '../labels.ts';
import type { Point2 } from '../layout.ts';
import { GEOMETRIES, MATERIALS, toon } from '../materials.ts';
import { Solid, type Vec3 } from '../Solid.tsx';
import type { Accessory, Mark, MarkTone, Pose, PresenceLook } from './presentation.ts';

export interface CharacterProps {
  agentId: string;
  name: string;
  /** Desk slot; the character sits on the chair south of it, facing the monitor. */
  slot: Point2;
  accessory: Accessory;
  shirt: string;
  hair: string;
  /** Runtime accent, for the name tag border. */
  accent: string;
  /** Name tag text, e.g. `Ada · LN-2`. */
  tag: string;
  look: PresenceLook;
  /** Offsets the motion loop so neighbours don't move in step. */
  phase: number;
}

/**
 * Joint angles per pose, in radians. The character faces -z (its desk).
 * - lean: torso about the hips; negative leans forward.
 * - head: negative looks down.
 * - armX: positive swings the arm forward; ~3 points it straight up.
 * - armZ: positive opens the arms outward, negative brings the hands in.
 */
const POSES: Readonly<Record<Pose, { lean: number; head: number; armX: number; armZ: number }>> = {
  typing: { lean: -0.1, head: -0.12, armX: 1.2, armZ: -0.1 },
  'leaning-back': { lean: 0.22, head: 0.12, armX: -0.1, armZ: 0.15 },
  slumped: { lean: -0.42, head: -0.55, armX: 0.15, armZ: 0.05 },
  'arms-crossed': { lean: 0.12, head: 0, armX: 1.35, armZ: -0.8 },
  reading: { lean: -0.26, head: -0.28, armX: 0.95, armZ: -0.3 },
  cheering: { lean: 0.05, head: 0.3, armX: 2.9, armZ: 0.35 },
};

/** Mouth per pose: a smile, a flat line, or a small "o". */
const MOUTH: Readonly<Record<Pose, 'smile' | 'flat' | 'o'>> = {
  typing: 'flat',
  'leaning-back': 'smile',
  slumped: 'flat',
  'arms-crossed': 'flat',
  reading: 'o',
  cheering: 'smile',
};

const MARK_MATERIAL: Readonly<Record<Exclude<MarkTone, 'none'>, Material>> = {
  danger: MATERIALS.markDanger,
  amber: MATERIALS.markAmber,
  review: MATERIALS.markReview,
  success: MATERIALS.markSuccess,
};

const LABEL_COLORS: Readonly<Record<Exclude<MarkTone, 'none'>, { background: string; text: string }>> = {
  danger: { background: COLORS.danger, text: '#ffffff' },
  amber: { background: COLORS.amber, text: COLORS.ink },
  review: { background: COLORS.review, text: '#ffffff' },
  success: { background: COLORS.success, text: '#ffffff' },
};

function AccessoryMesh({ accessory, hair }: { accessory: Accessory; hair: string }) {
  const trim = toon(hair);
  switch (accessory) {
    case 'pointed-ears':
      return (
        <>
          <Solid geometry="cone" material={trim} position={[-0.13, 0.2, 0]} scale={[0.11, 0.16, 0.08]} rotation={[0, 0, 0.35]} />
          <Solid geometry="cone" material={trim} position={[0.13, 0.2, 0]} scale={[0.11, 0.16, 0.08]} rotation={[0, 0, -0.35]} />
        </>
      );
    case 'round-ears':
      return (
        <>
          <Solid geometry="sphere" material={trim} position={[-0.16, 0.15, 0]} scale={[0.1, 0.1, 0.07]} />
          <Solid geometry="sphere" material={trim} position={[0.16, 0.15, 0]} scale={[0.1, 0.1, 0.07]} />
        </>
      );
    case 'beanie':
      return (
        <>
          <Solid geometry="sphere" material={toon('#e63946')} position={[0, 0.08, 0.01]} scale={[0.4, 0.3, 0.4]} />
          <Solid geometry="cylinder" material={toon('#fffdf6')} position={[0, 0.07, 0.01]} scale={[0.41, 0.06, 0.41]} />
          <Solid geometry="sphere" material={toon('#fffdf6')} position={[0, 0.25, 0.01]} scale={[0.09, 0.09, 0.09]} />
        </>
      );
    case 'long-ears':
      return (
        <>
          <Solid geometry="capsule" material={trim} position={[-0.07, 0.34, 0.02]} scale={[0.08, 0.13, 0.05]} rotation={[0, 0, 0.14]} />
          <Solid geometry="capsule" material={trim} position={[0.07, 0.34, 0.02]} scale={[0.08, 0.13, 0.05]} rotation={[0, 0, -0.14]} />
        </>
      );
    case 'glasses':
      return (
        <>
          <Solid geometry="ring" material={MATERIALS.bezel} position={[-0.075, 0.02, -0.19]} scale={[0.15, 0.15, 0.15]} />
          <Solid geometry="ring" material={MATERIALS.bezel} position={[0.075, 0.02, -0.19]} scale={[0.15, 0.15, 0.15]} />
        </>
      );
    case 'crest':
      return (
        <>
          <Solid geometry="cone" material={trim} position={[0, 0.25, 0.04]} scale={[0.08, 0.24, 0.08]} rotation={[0.45, 0, 0]} />
          <Solid geometry="cone" material={toon('#f5a524')} position={[0, -0.04, -0.22]} scale={[0.05, 0.12, 0.05]} rotation={[-Math.PI / 2, 0, 0]} />
        </>
      );
    case 'headband':
      return <Solid geometry="cylinder" material={toon('#f15bb5')} position={[0, 0.1, 0]} scale={[0.41, 0.06, 0.41]} />;
  }
}

function MarkShape({ mark, tone }: { mark: Mark; tone: Exclude<MarkTone, 'none'> }) {
  const material = MARK_MATERIAL[tone];
  switch (mark) {
    case 'stop-sign':
      return (
        <>
          <Solid geometry="octagon" material={material} scale={[0.32, 0.32, 0.32]} outline />
          <mesh geometry={GEOMETRIES.box} material={MATERIALS.markLight} position={[0, 0.03, 0.02]} scale={[0.035, 0.12, 0.01]} />
          <mesh geometry={GEOMETRIES.box} material={MATERIALS.markLight} position={[0, -0.07, 0.02]} scale={[0.035, 0.035, 0.01]} />
        </>
      );
    case 'hourglass':
      return (
        <>
          <Solid geometry="cone" material={material} position={[0, 0.08, 0]} scale={[0.22, 0.16, 0.22]} rotation={[Math.PI, 0, 0]} outline />
          <Solid geometry="cone" material={material} position={[0, -0.08, 0]} scale={[0.22, 0.16, 0.22]} outline />
          <Solid material={MATERIALS.bezel} position={[0, 0.17, 0]} scale={[0.24, 0.02, 0.24]} />
          <Solid material={MATERIALS.bezel} position={[0, -0.17, 0]} scale={[0.24, 0.02, 0.24]} />
        </>
      );
    case 'magnifier':
      return (
        <>
          <Solid geometry="ring" material={material} position={[0.03, 0.04, 0]} scale={[0.32, 0.32, 0.32]} outline />
          <Solid material={material} position={[-0.11, -0.11, 0]} scale={[0.05, 0.16, 0.04]} rotation={[0, 0, -Math.PI / 4]} outline />
        </>
      );
    case 'star':
      return <Solid geometry="star" material={material} position={[0, 0, -0.03]} scale={[0.34, 0.34, 0.34]} outline />;
    case 'none':
      return null;
  }
}

const WORLD = new Vector3();
/** Closer than this (metres), the name tag hides so it does not cover the view. */
const NEAR_TAG = 2;

/** Name tag always; a status mark and its label above it when the agent needs attention. */
function Overhead({ look, tag, accent }: { look: PresenceLook; tag: string; accent: string }) {
  const nameTag = floorLabel(tag, { background: COLORS.paper, text: COLORS.ink, border: accent });
  const tagHeight = 0.15;
  const tone = look.mark === 'none' || look.tone === 'none' ? null : look.tone;
  const label = tone ? floorLabel(look.label, { ...LABEL_COLORS[tone], border: COLORS.ink }) : null;
  const tagRef = useRef<Mesh>(null);
  // The tag floats at eye height; hide it when the visitor is standing right behind the agent.
  useFrame(({ camera }) => {
    const mesh = tagRef.current;
    if (!mesh) return;
    mesh.getWorldPosition(WORLD);
    mesh.visible = camera.position.distanceTo(WORLD) > NEAR_TAG;
  });
  return (
    <Billboard position={[0, 1.62, 0]}>
      <mesh ref={tagRef} geometry={GEOMETRIES.plane} material={nameTag.material} scale={[tagHeight * nameTag.aspect, tagHeight, 1]} renderOrder={2} />
      {tone && label && (
        <group position={[0, 0.5, 0]}>
          <group scale={1.3}>
            <MarkShape mark={look.mark} tone={tone} />
          </group>
          <mesh geometry={GEOMETRIES.plane} material={label.material} position={[0, -0.33, 0]} scale={[0.17 * label.aspect, 0.17, 1]} renderOrder={2} />
        </group>
      )}
    </Billboard>
  );
}

function Face({ pose, eyes }: { pose: Pose; eyes: React.RefObject<Group | null> }) {
  const mouth = MOUTH[pose];
  return (
    <group position={[0, 0, -0.2]}>
      <group ref={eyes}>
        <mesh geometry={GEOMETRIES.sphere} material={MATERIALS.ink} position={[-0.075, 0.03, 0]} scale={[0.05, 0.065, 0.03]} />
        <mesh geometry={GEOMETRIES.sphere} material={MATERIALS.ink} position={[0.075, 0.03, 0]} scale={[0.05, 0.065, 0.03]} />
      </group>
      <mesh geometry={GEOMETRIES.sphere} material={MATERIALS.blush} position={[-0.13, -0.04, 0.02]} scale={[0.06, 0.035, 0.02]} />
      <mesh geometry={GEOMETRIES.sphere} material={MATERIALS.blush} position={[0.13, -0.04, 0.02]} scale={[0.06, 0.035, 0.02]} />
      {mouth === 'o' ? (
        <mesh geometry={GEOMETRIES.sphere} material={MATERIALS.ink} position={[0, -0.07, 0.005]} scale={[0.035, 0.04, 0.02]} />
      ) : (
        <mesh
          geometry={GEOMETRIES.ring}
          material={MATERIALS.ink}
          position={[0, mouth === 'smile' ? -0.045 : -0.07, 0.01]}
          scale={mouth === 'smile' ? [0.09, 0.07, 0.04] : [0.07, 0.015, 0.04]}
        />
      )}
    </group>
  );
}

/**
 * A seated, cel-shaded character. Pose, face, and mark come from the derived
 * presence; the motion loop only moves this mesh and never touches workflow state.
 */
export function Character({ agentId, name, slot, accessory, shirt, hair, accent, tag, look, phase }: CharacterProps) {
  const root = useRef<Group>(null);
  const torso = useRef<Group>(null);
  const leftArm = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const eyes = useRef<Group>(null);
  const pose = POSES[look.pose];
  const still = look.motion === 'none';

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + phase;
    const [r, body, left, right, e] = [root.current, torso.current, leftArm.current, rightArm.current, eyes.current];
    if (!r || !body || !left || !right) return;
    r.position.y = look.motion === 'bounce' ? Math.abs(Math.sin(t * 5)) * 0.1 : 0;
    // Breathing and a gentle sway, unless motion is reduced.
    const breathe = still ? 0 : Math.sin(t * 1.6) * 0.015;
    body.scale.set(1, 1 + breathe, 1);
    body.rotation.z = look.motion === 'sway' ? Math.sin(t * 0.9) * 0.05 : 0;
    // Typing comes in bursts, hands out of step.
    const burst = Math.sin(t * 0.8) + Math.sin(t * 2.1) * 0.6 > -0.35;
    const tap = look.motion === 'typing' && burst ? Math.sin(t * 19) * 0.09 : 0;
    const tap2 = look.motion === 'typing' && burst ? Math.sin(t * 19 + 2.4) * 0.09 : 0;
    left.rotation.x = pose.armX + tap;
    right.rotation.x = pose.armX + tap2;
    // Blink every few seconds.
    if (e) e.scale.y = !still && (t * 0.37) % 1 < 0.04 ? 0.15 : 1;
  });

  const shirtMat = toon(shirt);
  const hairMat = toon(hair);
  const hipY = 0.5;

  return (
    <group
      name={`character:${agentId}`}
      userData={{ agentId, name, pose: look.pose }}
      position={[slot.x, 0, slot.z + 0.75]}
      // Clicking the person opens their desk.
      {...interactProps({ id: `desk:${agentId}`, label: `${name}'s desk` })}
    >
      <group ref={root}>
        {/* Legs: thighs on the seat, shins down to the floor, little shoes. */}
        <Solid geometry="capsule" material={MATERIALS.trousers} position={[-0.1, hipY + 0.02, -0.17]} scale={[0.13, 0.18, 0.13]} rotation={[Math.PI / 2, 0, 0]} />
        <Solid geometry="capsule" material={MATERIALS.trousers} position={[0.1, hipY + 0.02, -0.17]} scale={[0.13, 0.18, 0.13]} rotation={[Math.PI / 2, 0, 0]} />
        <Solid geometry="capsule" material={MATERIALS.trousers} position={[-0.1, 0.27, -0.36]} scale={[0.12, 0.23, 0.12]} />
        <Solid geometry="capsule" material={MATERIALS.trousers} position={[0.1, 0.27, -0.36]} scale={[0.12, 0.23, 0.12]} />
        <Solid geometry="sphere" material={MATERIALS.bezel} position={[-0.1, 0.05, -0.4]} scale={[0.12, 0.09, 0.18]} />
        <Solid geometry="sphere" material={MATERIALS.bezel} position={[0.1, 0.05, -0.4]} scale={[0.12, 0.09, 0.18]} />

        <group ref={torso} position={[0, hipY, 0]} rotation={[pose.lean, 0, 0]}>
          <Solid geometry="capsule" material={shirtMat} position={[0, 0.27, 0]} scale={[0.42, 0.25, 0.34]} />
          {/* Arms hang from the shoulders and rotate there. */}
          <group ref={leftArm} position={[-0.23, 0.45, 0]} rotation={[pose.armX, 0, -pose.armZ]}>
            <Solid geometry="capsule" material={shirtMat} position={[0, -0.17, 0]} scale={[0.1, 0.17, 0.1]} />
            <Solid geometry="sphere" material={MATERIALS.skin} position={[0, -0.36, 0]} scale={[0.1, 0.1, 0.1]} />
          </group>
          <group ref={rightArm} position={[0.23, 0.45, 0]} rotation={[pose.armX, 0, pose.armZ]}>
            <Solid geometry="capsule" material={shirtMat} position={[0, -0.17, 0]} scale={[0.1, 0.17, 0.1]} />
            <Solid geometry="sphere" material={MATERIALS.skin} position={[0, -0.36, 0]} scale={[0.1, 0.1, 0.1]} />
          </group>
          <group position={[0, 0.78, 0]} rotation={[pose.head, 0, 0]}>
            <Solid geometry="sphere" material={MATERIALS.skin} scale={[0.4, 0.38, 0.38]} />
            {/* Hair: a cap over the back and top of the head. */}
            <Solid geometry="sphere" material={hairMat} position={[0, 0.06, 0.04]} scale={[0.42, 0.34, 0.38]} />
            <Face pose={look.pose} eyes={eyes} />
            <AccessoryMesh accessory={accessory} hair={hair} />
          </group>
        </group>
      </group>
      <Overhead look={look} tag={tag} accent={accent} />
    </group>
  );
}

export type { Vec3 };
