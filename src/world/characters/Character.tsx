import { Billboard } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group, Material } from 'three';
import { COLORS } from '../../ui/tokens.ts';
import { floorLabel } from '../labels.ts';
import type { Point2 } from '../layout.ts';
import { GEOMETRIES, MATERIALS, shirtMaterial } from '../materials.ts';
import type { Accessory, Mark, MarkTone, Pose, PresenceLook } from './presentation.ts';

export interface CharacterProps {
  agentId: string;
  name: string;
  /** Desk slot; the character sits on the chair south of it, facing the monitor. */
  slot: Point2;
  accessory: Accessory;
  shirt: string;
  look: PresenceLook;
  /** Offsets the motion loop so neighbours don't move in step. */
  phase: number;
}

type Vec3 = [number, number, number];

/**
 * Joint angles per pose, in radians. The character faces -z (its desk).
 * - lean: torso about the hips; negative leans forward.
 * - head: negative looks down.
 * - armX: positive swings the arm forward; ~3 points it straight up.
 * - armZ: positive opens the arms outward, negative brings the hands in.
 */
const POSES: Readonly<Record<Pose, { lean: number; head: number; armX: number; armZ: number }>> = {
  typing: { lean: -0.12, head: -0.15, armX: 1.25, armZ: -0.08 },
  'leaning-back': { lean: 0.22, head: 0.1, armX: -0.1, armZ: 0.15 },
  slumped: { lean: -0.45, head: -0.6, armX: 0.15, armZ: 0.05 },
  'arms-crossed': { lean: 0.12, head: 0, armX: 1.35, armZ: -0.8 },
  reading: { lean: -0.28, head: -0.3, armX: 0.95, armZ: -0.3 },
  cheering: { lean: 0.05, head: 0.3, armX: 2.9, armZ: 0.3 },
};

const MARK_MATERIAL: Readonly<Record<Exclude<MarkTone, 'none'>, Material>> = {
  danger: MATERIALS.markDanger,
  amber: MATERIALS.markAmber,
  review: MATERIALS.markReview,
  success: MATERIALS.markSuccess,
};

const LABEL_COLORS: Readonly<Record<Exclude<MarkTone, 'none'>, { background: string; text: string }>> = {
  danger: { background: COLORS.danger, text: COLORS.ivory },
  amber: { background: COLORS.amber, text: COLORS.ivory },
  review: { background: COLORS.review, text: COLORS.ivory },
  success: { background: COLORS.forest, text: COLORS.mint },
};

function Part({ geometry, material, position, scale, rotation }: { geometry: keyof typeof GEOMETRIES; material: Material; position: Vec3; scale: Vec3; rotation?: Vec3 }) {
  return <mesh geometry={GEOMETRIES[geometry]} material={material} position={position} scale={scale} rotation={rotation ?? [0, 0, 0]} castShadow />;
}

function AccessoryMesh({ accessory, shirt }: { accessory: Accessory; shirt: string }) {
  const trim = shirtMaterial(shirt);
  switch (accessory) {
    case 'pointed-ears':
      return (
        <>
          <Part geometry="cone" material={trim} position={[-0.09, 0.16, 0]} scale={[0.1, 0.16, 0.08]} rotation={[0, 0, 0.3]} />
          <Part geometry="cone" material={trim} position={[0.09, 0.16, 0]} scale={[0.1, 0.16, 0.08]} rotation={[0, 0, -0.3]} />
        </>
      );
    case 'round-ears':
      return (
        <>
          <Part geometry="sphere" material={trim} position={[-0.12, 0.12, 0]} scale={[0.09, 0.09, 0.06]} />
          <Part geometry="sphere" material={trim} position={[0.12, 0.12, 0]} scale={[0.09, 0.09, 0.06]} />
        </>
      );
    case 'beanie':
      return (
        <>
          <Part geometry="sphere" material={trim} position={[0, 0.06, 0]} scale={[0.32, 0.22, 0.32]} />
          <Part geometry="sphere" material={MATERIALS.markLight} position={[0, 0.18, 0]} scale={[0.07, 0.07, 0.07]} />
        </>
      );
    case 'long-ears':
      return (
        <>
          <Part geometry="box" material={trim} position={[-0.05, 0.26, 0.02]} scale={[0.05, 0.3, 0.03]} rotation={[0, 0, 0.12]} />
          <Part geometry="box" material={trim} position={[0.05, 0.26, 0.02]} scale={[0.05, 0.3, 0.03]} rotation={[0, 0, -0.12]} />
        </>
      );
    case 'glasses':
      return (
        <>
          <Part geometry="box" material={MATERIALS.metal} position={[0, 0.02, -0.15]} scale={[0.26, 0.025, 0.02]} />
          <Part geometry="box" material={MATERIALS.metal} position={[-0.06, 0.01, -0.15]} scale={[0.09, 0.07, 0.015]} />
          <Part geometry="box" material={MATERIALS.metal} position={[0.06, 0.01, -0.15]} scale={[0.09, 0.07, 0.015]} />
        </>
      );
    case 'crest':
      return (
        <>
          <Part geometry="cone" material={trim} position={[0, 0.2, 0.04]} scale={[0.07, 0.24, 0.07]} rotation={[0.45, 0, 0]} />
          <Part geometry="cone" material={MATERIALS.markAmber} position={[0, -0.01, -0.18]} scale={[0.05, 0.12, 0.05]} rotation={[-Math.PI / 2, 0, 0]} />
        </>
      );
    case 'headband':
      return <Part geometry="cylinder" material={trim} position={[0, 0.07, 0]} scale={[0.31, 0.05, 0.31]} />;
  }
}

function MarkShape({ mark, tone }: { mark: Mark; tone: Exclude<MarkTone, 'none'> }) {
  const material = MARK_MATERIAL[tone];
  switch (mark) {
    case 'stop-sign':
      return (
        <>
          <mesh geometry={GEOMETRIES.octagon} material={material} scale={[0.32, 0.32, 0.32]} />
          <mesh geometry={GEOMETRIES.box} material={MATERIALS.markLight} position={[0, 0.03, 0.02]} scale={[0.035, 0.12, 0.01]} />
          <mesh geometry={GEOMETRIES.box} material={MATERIALS.markLight} position={[0, -0.07, 0.02]} scale={[0.035, 0.035, 0.01]} />
        </>
      );
    case 'hourglass':
      return (
        <>
          <mesh geometry={GEOMETRIES.cone} material={material} position={[0, 0.08, 0]} scale={[0.22, 0.16, 0.22]} rotation={[Math.PI, 0, 0]} />
          <mesh geometry={GEOMETRIES.cone} material={material} position={[0, -0.08, 0]} scale={[0.22, 0.16, 0.22]} />
          <mesh geometry={GEOMETRIES.box} material={MATERIALS.metal} position={[0, 0.17, 0]} scale={[0.24, 0.02, 0.24]} />
          <mesh geometry={GEOMETRIES.box} material={MATERIALS.metal} position={[0, -0.17, 0]} scale={[0.24, 0.02, 0.24]} />
        </>
      );
    case 'magnifier':
      return (
        <>
          <mesh geometry={GEOMETRIES.ring} material={material} position={[0.03, 0.04, 0]} scale={[0.32, 0.32, 0.32]} />
          <mesh geometry={GEOMETRIES.box} material={material} position={[-0.11, -0.11, 0]} scale={[0.05, 0.16, 0.04]} rotation={[0, 0, -Math.PI / 4]} />
        </>
      );
    case 'star':
      return <mesh geometry={GEOMETRIES.star} material={material} position={[0, 0, -0.03]} scale={[0.34, 0.34, 0.34]} />;
    case 'none':
      return null;
  }
}

function StatusMark({ look }: { look: PresenceLook }) {
  if (look.mark === 'none' || look.tone === 'none') return null;
  const label = floorLabel(look.label, LABEL_COLORS[look.tone]);
  const height = 0.24;
  return (
    <Billboard position={[0, 2.05, 0]}>
      <group scale={1.5}>
        <MarkShape mark={look.mark} tone={look.tone} />
      </group>
      <mesh geometry={GEOMETRIES.plane} material={label.material} position={[0, -0.46, 0]} scale={[height * label.aspect, height, 1]} />
    </Billboard>
  );
}

/**
 * A seated low-poly character. Its pose and mark come from the derived presence;
 * the motion loop only moves this mesh and never touches workflow state.
 */
export function Character({ agentId, name, slot, accessory, shirt, look, phase }: CharacterProps) {
  const root = useRef<Group>(null);
  const torso = useRef<Group>(null);
  const leftArm = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const pose = POSES[look.pose];

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + phase;
    const [r, body, left, right] = [root.current, torso.current, leftArm.current, rightArm.current];
    if (!r || !body || !left || !right) return;
    r.position.y = look.motion === 'bounce' ? Math.abs(Math.sin(t * 5)) * 0.1 : 0;
    body.rotation.z = look.motion === 'sway' ? Math.sin(t * 1.2) * 0.04 : 0;
    const tap = look.motion === 'typing' ? Math.sin(t * 14) * 0.08 : 0;
    left.rotation.x = pose.armX + tap;
    right.rotation.x = pose.armX - tap;
  });

  const shirtMat = shirtMaterial(shirt);
  const hipY = 0.5;

  return (
    <group name={`character:${agentId}`} userData={{ agentId, name, pose: look.pose }} position={[slot.x, 0, slot.z + 0.75]}>
      <group ref={root}>
        {/* Legs: thighs on the seat, shins down to the floor. */}
        <Part geometry="box" material={MATERIALS.trousers} position={[-0.09, hipY, -0.18]} scale={[0.12, 0.12, 0.38]} />
        <Part geometry="box" material={MATERIALS.trousers} position={[0.09, hipY, -0.18]} scale={[0.12, 0.12, 0.38]} />
        <Part geometry="box" material={MATERIALS.trousers} position={[-0.09, 0.25, -0.36]} scale={[0.11, 0.48, 0.11]} />
        <Part geometry="box" material={MATERIALS.trousers} position={[0.09, 0.25, -0.36]} scale={[0.11, 0.48, 0.11]} />

        <group ref={torso} position={[0, hipY, 0]} rotation={[pose.lean, 0, 0]}>
          <Part geometry="cylinder" material={shirtMat} position={[0, 0.27, 0]} scale={[0.34, 0.52, 0.26]} />
          {/* Arms hang from the shoulders and rotate there. */}
          <group ref={leftArm} position={[-0.22, 0.48, 0]} rotation={[pose.armX, 0, -pose.armZ]}>
            <Part geometry="box" material={shirtMat} position={[0, -0.18, 0]} scale={[0.09, 0.38, 0.09]} />
            <Part geometry="sphere" material={MATERIALS.skin} position={[0, -0.39, 0]} scale={[0.09, 0.09, 0.09]} />
          </group>
          <group ref={rightArm} position={[0.22, 0.48, 0]} rotation={[pose.armX, 0, pose.armZ]}>
            <Part geometry="box" material={shirtMat} position={[0, -0.18, 0]} scale={[0.09, 0.38, 0.09]} />
            <Part geometry="sphere" material={MATERIALS.skin} position={[0, -0.39, 0]} scale={[0.09, 0.09, 0.09]} />
          </group>
          <group position={[0, 0.7, 0]} rotation={[pose.head, 0, 0]}>
            <Part geometry="sphere" material={MATERIALS.skin} position={[0, 0, 0]} scale={[0.3, 0.3, 0.3]} />
            <AccessoryMesh accessory={accessory} shirt={shirt} />
          </group>
        </group>
      </group>
      <StatusMark look={look} />
    </group>
  );
}
