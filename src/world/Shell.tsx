import { useEffect } from 'react';
import { floorLabel } from './labels.ts';
import { CEILING_LAMPS, FLOOR, WALL, WINDOW_HEIGHT, WINDOW_SILL, WINDOWS, ZONES, wallLength, wallPieces, type WallSide, type Zone } from './layout.ts';
import { GEOMETRIES } from './materials.ts';
import { useFloorScene } from './floorScene.ts';
import { Solid, type Vec3 } from './Solid.tsx';

/**
 * The room itself: plank floor, walls with real window openings, an accent
 * stripe and skirting, a ceiling with lamps, and a rug per zone. The ceiling
 * and lamps face down only, so the overview camera looks straight through them.
 */

const HALF_W = FLOOR.width / 2;
const HALF_D = FLOOR.depth / 2;
const T = WALL.thickness;
const WINDOW_TOP = WINDOW_SILL + WINDOW_HEIGHT;

/** A wall's length and how to turn its local (along, height, depth) into world space. */
const SIDES: Readonly<Record<WallSide, { length: number; place: (along: number, y: number, inward: number) => Vec3; alongX: boolean }>> = {
  north: { length: wallLength('north'), alongX: true, place: (u, y, d) => [u, y, -HALF_D - T / 2 + d] },
  south: { length: wallLength('south'), alongX: true, place: (u, y, d) => [u, y, HALF_D + T / 2 - d] },
  west: { length: wallLength('west'), alongX: false, place: (u, y, d) => [-HALF_W - T / 2 + d, y, u] },
  east: { length: wallLength('east'), alongX: false, place: (u, y, d) => [HALF_W + T / 2 - d, y, u] },
};

function boxFor(side: WallSide, from: number, to: number, bottom: number, top: number, depth: number, inward: number) {
  const { place, alongX } = SIDES[side];
  const len = to - from;
  const position = place((from + to) / 2, (bottom + top) / 2, inward);
  const scale: Vec3 = alongX ? [len, top - bottom, depth] : [depth, top - bottom, len];
  return { position, scale };
}

function Wall({ side }: { side: WallSide }) {
  const { materials } = useFloorScene();
  const { length } = SIDES[side];
  // Trim sits just proud of the inner face.
  const inner = T / 2 + 0.015;
  const stripe = boxFor(side, -length / 2 + T, length / 2 - T, 0.6, 0.7, 0.03, inner);
  const skirting = boxFor(side, -length / 2 + T, length / 2 - T, 0, 0.12, 0.03, inner);
  return (
    <group name={`wall:${side}`}>
      {wallPieces(side).map((p) => {
        const { position, scale } = boxFor(side, p.from, p.to, p.bottom, p.top, T, 0);
        return <Solid key={`${String(p.from)}:${String(p.bottom)}`} material={materials.wall} position={position} scale={scale} />;
      })}
      <Solid material={materials.wallStripe} {...stripe} castShadow={false} />
      <Solid material={materials.skirting} {...skirting} castShadow={false} />
    </group>
  );
}

function WindowFrame({ side, offset, width }: { side: WallSide; offset: number; width: number }) {
  const { materials } = useFloorScene();
  const f = 0.07;
  const pieces = [
    boxFor(side, offset - width / 2, offset + width / 2, WINDOW_SILL - f, WINDOW_SILL, T + 0.12, 0.03), // sill
    boxFor(side, offset - width / 2, offset + width / 2, WINDOW_TOP, WINDOW_TOP + f, T + 0.02, 0),
    boxFor(side, offset - width / 2, offset - width / 2 + f, WINDOW_SILL, WINDOW_TOP, T + 0.02, 0),
    boxFor(side, offset + width / 2 - f, offset + width / 2, WINDOW_SILL, WINDOW_TOP, T + 0.02, 0),
    boxFor(side, offset - f / 2, offset + f / 2, WINDOW_SILL, WINDOW_TOP, 0.05, 0), // mullion
  ];
  const glass = boxFor(side, offset - width / 2, offset + width / 2, WINDOW_SILL, WINDOW_TOP, 0.02, 0);
  return (
    <group name={`window:${side}:${String(offset)}`}>
      {pieces.map((p, i) => (
        <Solid key={i} material={materials.trim} {...p} castShadow={false} />
      ))}
      <mesh geometry={GEOMETRIES.box} material={materials.window} position={glass.position} scale={glass.scale} />
    </group>
  );
}

function Floor() {
  const { materials } = useFloorScene();
  // Planks: one texture repeat per 2 m.
  useEffect(() => {
    materials.floor.map?.repeat.set(FLOOR.width / 2, FLOOR.depth / 2);
  }, [materials]);
  return (
    <mesh geometry={GEOMETRIES.plane} material={materials.floor} rotation-x={-Math.PI / 2} scale={[FLOOR.width, FLOOR.depth, 1]} receiveShadow />
  );
}

function Ceiling() {
  const { materials, floor } = useFloorScene();
  const lampsOn = floor.theme.sky.lampsOn;
  return (
    <group name="ceiling">
      {/* Faces down: invisible from the overview camera above. */}
      <mesh geometry={GEOMETRIES.plane} material={materials.ceiling} rotation-x={Math.PI / 2} position-y={WALL.height} scale={[FLOOR.width + T * 2, FLOOR.depth + T * 2, 1]} />
      {CEILING_LAMPS.map((p) => (
        <group key={`${String(p.x)}:${String(p.z)}`} position={[p.x, 0, p.z]}>
          <mesh geometry={GEOMETRIES.plane} material={materials.lamp} rotation-x={Math.PI / 2} position-y={WALL.height - 0.01} scale={[1.4, 0.5, 1]} />
          {lampsOn && (
            <mesh geometry={GEOMETRIES.plane} material={materials.lampPool} rotation-x={-Math.PI / 2} position-y={0.02} scale={[4.2, 4.2, 1]} />
          )}
        </group>
      ))}
    </group>
  );
}

/** A low rug with a contrasting edge and a sticker label at the zone's approach spot. */
function ZoneRug({ zone }: { zone: Zone }) {
  const { materials } = useFloorScene();
  const { width, depth } = zone.size;
  const label = floorLabel(zone.label);
  const labelHeight = Math.min(0.5, (width - 0.3) / label.aspect);
  const rug = zone.id !== 'greenery';
  return (
    <group name={`zone:${zone.id}`} position={[zone.center.x, 0, zone.center.z]}>
      {rug && (
        <>
          <mesh geometry={GEOMETRIES.plane} material={materials.rugEdge} rotation-x={-Math.PI / 2} position-y={0.006} scale={[width, depth, 1]} receiveShadow />
          <mesh geometry={GEOMETRIES.plane} material={materials.rug} rotation-x={-Math.PI / 2} position-y={0.01} scale={[width - 0.24, depth - 0.24, 1]} receiveShadow />
        </>
      )}
      <mesh
        geometry={GEOMETRIES.plane}
        material={label.material}
        rotation-x={-Math.PI / 2}
        position={[zone.anchor.x - zone.center.x, 0.015, zone.anchor.z - zone.center.z]}
        scale={[labelHeight * label.aspect, labelHeight, 1]}
      />
    </group>
  );
}

export function RoomShell() {
  return (
    <group name="room">
      <Floor />
      {(['north', 'south', 'east', 'west'] as const).map((side) => (
        <Wall key={side} side={side} />
      ))}
      {WINDOWS.map((w) => (
        <WindowFrame key={`${w.wall}:${String(w.offset)}`} side={w.wall} offset={w.offset} width={w.width} />
      ))}
      <Ceiling />
      {ZONES.map((zone) => (
        <ZoneRug key={zone.id} zone={zone} />
      ))}
    </group>
  );
}
