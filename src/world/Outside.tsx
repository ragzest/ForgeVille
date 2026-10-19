import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { BackSide, BufferGeometry, Color, Float32BufferAttribute, PointsMaterial, ShaderMaterial, Vector3, type Group } from 'three';
import { STOREY_HEIGHT } from './building.ts';
import { GEOMETRIES, toon } from './materials.ts';
import { useFloorScene } from './floorScene.ts';

/**
 * Everything beyond the windows: a gradient sky with a cartoon sun or moon,
 * stars at night, drifting clouds, the ground far below upper floors, trees,
 * and a ring of city blocks. Deterministic, so every load looks the same.
 */

const hash = (n: number) => {
  const x = Math.sin(n * 91.345 + 7.13) * 43758.5453;
  return x - Math.floor(x);
};

function SkyDome() {
  const { floor } = useFloorScene();
  const sky = floor.theme.sky;
  const material = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          zenith: { value: new Color(sky.zenith) },
          horizon: { value: new Color(sky.horizon) },
          sunColor: { value: new Color(sky.sun) },
          sunDir: { value: new Vector3(...sky.sunPosition).normalize() },
          sunSize: { value: sky.stars ? 0.9994 : 0.9988 },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 zenith; uniform vec3 horizon; uniform vec3 sunColor; uniform vec3 sunDir; uniform float sunSize;
          varying vec3 vDir;
          void main() {
            float h = clamp(vDir.y, 0.0, 1.0);
            vec3 col = mix(horizon, zenith, pow(h, 0.55));
            float d = dot(normalize(vDir), sunDir);
            col = mix(col, sunColor, smoothstep(sunSize - 0.0004, sunSize, d));
            col += sunColor * pow(max(d, 0.0), 64.0) * 0.35;
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }
        `,
      }),
    [sky],
  );
  useEffect(
    () => () => {
      material.dispose();
    },
    [material],
  );
  return <mesh geometry={GEOMETRIES.sphere} material={material} scale={400} renderOrder={-1} />;
}

function Stars() {
  const geometry = useMemo(() => {
    const positions: number[] = [];
    for (let i = 0; i < 700; i++) {
      const a = hash(i) * Math.PI * 2;
      const y = 0.12 + hash(i + 1000) * 0.88;
      const r = Math.sqrt(1 - y * y);
      positions.push(Math.cos(a) * r * 190, y * 190, Math.sin(a) * r * 190);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(positions, 3));
    return g;
  }, []);
  const material = useMemo(() => new PointsMaterial({ color: '#ffffff', size: 2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85 }), []);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  return <points geometry={geometry} material={material} />;
}

function Clouds({ drift }: { drift: boolean }) {
  const ref = useRef<Group>(null);
  const puffs = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const a = hash(i + 50) * Math.PI * 2;
        const r = 70 + hash(i + 60) * 80;
        return { x: Math.cos(a) * r, y: 35 + hash(i + 70) * 25, z: Math.sin(a) * r, s: 6 + hash(i + 80) * 8 };
      }),
    [],
  );
  useFrame((_, dt) => {
    if (drift && ref.current) ref.current.rotation.y += dt * 0.004;
  });
  const white = toon('#ffffff');
  return (
    <group ref={ref} name="clouds">
      {puffs.map((p, i) => (
        <group key={i} position={[p.x, p.y, p.z]} scale={p.s}>
          <mesh geometry={GEOMETRIES.sphere} material={white} scale={[1.6, 0.8, 1]} />
          <mesh geometry={GEOMETRIES.sphere} material={white} position={[0.7, 0.2, 0.1]} scale={[1.1, 0.9, 0.9]} />
          <mesh geometry={GEOMETRIES.sphere} material={white} position={[-0.7, 0.05, -0.1]} scale={[1, 0.7, 0.8]} />
        </group>
      ))}
    </group>
  );
}

function Ground({ y }: { y: number }) {
  const { materials, floor } = useFloorScene();
  const road = useMemo(() => toon(new Color(floor.theme.scene.ground).offsetHSL(0, -0.25, -0.12).getStyle()), [floor]);
  return (
    <group position-y={y}>
      <mesh geometry={GEOMETRIES.plane} material={materials.ground} rotation-x={-Math.PI / 2} scale={[600, 600, 1]} />
      {/* A road loop around the block. */}
      {[-18, 18].map((z) => (
        <mesh key={`h${String(z)}`} geometry={GEOMETRIES.plane} material={road} rotation-x={-Math.PI / 2} position={[0, 0.02, z]} scale={[200, 5, 1]} />
      ))}
      {[-22, 22].map((x) => (
        <mesh key={`v${String(x)}`} geometry={GEOMETRIES.plane} material={road} rotation-x={-Math.PI / 2} position={[x, 0.03, 0]} scale={[5, 200, 1]} />
      ))}
    </group>
  );
}

function Trees({ y }: { y: number }) {
  const { materials } = useFloorScene();
  const trunk = toon('#7a5236');
  const trees = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => {
        const a = (i / 34) * Math.PI * 2 + hash(i + 300) * 0.15;
        const r = 26 + hash(i + 310) * 12;
        return { x: Math.cos(a) * r, z: Math.sin(a) * r, s: 1.6 + hash(i + 320) * 1.4, dark: i % 3 === 0 };
      }),
    [],
  );
  return (
    <group position-y={y}>
      {trees.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]} scale={t.s}>
          <mesh geometry={GEOMETRIES.cylinder} material={trunk} position-y={0.6} scale={[0.35, 1.2, 0.35]} />
          <mesh geometry={GEOMETRIES.blob} material={t.dark ? materials.leafDark : materials.leaf} position-y={1.9} scale={[2, 2.2, 2]} />
        </group>
      ))}
    </group>
  );
}

function City({ y }: { y: number }) {
  const { materials } = useFloorScene();
  const blocks = useMemo(
    () =>
      Array.from({ length: 46 }, (_, i) => {
        const a = (i / 46) * Math.PI * 2 + hash(i) * 0.08;
        const r = 48 + hash(i + 100) * 40;
        const h = 8 + hash(i + 200) * 34;
        return { x: Math.cos(a) * r, z: Math.sin(a) * r, w: 5 + hash(i + 400) * 7, d: 5 + hash(i + 500) * 7, h, rot: a };
      }),
    [],
  );
  return (
    <group position-y={y} name="city">
      {blocks.map((b, i) => (
        <group key={i} position={[b.x, 0, b.z]} rotation-y={-b.rot}>
          <mesh geometry={GEOMETRIES.box} material={materials.city} position-y={b.h / 2} scale={[b.w, b.h, b.d]} />
          {/* Bands of windows on the side facing the office. */}
          {Array.from({ length: Math.floor(b.h / 4) }, (_, k) => (
            <mesh key={k} geometry={GEOMETRIES.box} material={materials.cityWindow} position={[-b.w / 2 - 0.05, 2.5 + k * 4, 0]} scale={[0.1, 1.1, b.d * 0.8]} />
          ))}
        </group>
      ))}
    </group>
  );
}

/** Applies the floor's exposure and fog to the renderer. */
function Atmosphere() {
  const { floor } = useFloorScene();
  const sky = floor.theme.sky;
  useFrame(({ gl }) => {
    if (gl.toneMappingExposure !== sky.exposure) gl.toneMappingExposure = sky.exposure;
  });
  return (
    <>
      <color attach="background" args={[sky.horizon]} />
      <fog attach="fog" args={[sky.fog, sky.fogNear, sky.fogFar]} />
    </>
  );
}

export function Outside() {
  const { floor, reducedMotion } = useFloorScene();
  // Upper floors look down on the street.
  const groundY = -0.1 - (floor.level - 1) * STOREY_HEIGHT;
  return (
    <group name="outside">
      <Atmosphere />
      <SkyDome />
      {floor.theme.sky.stars ? <Stars /> : <Clouds drift={!reducedMotion} />}
      <Ground y={groundY} />
      <Trees y={groundY} />
      <City y={groundY} />
    </group>
  );
}

/** Sun (or moon), sky fill, and the floor's lamps. */
export function Lights() {
  const { floor } = useFloorScene();
  const sky = floor.theme.sky;
  return (
    <>
      <hemisphereLight args={[sky.hemiSky, sky.hemiGround, sky.hemiIntensity]} />
      <ambientLight intensity={sky.ambient} />
      <directionalLight
        position={[...sky.sunPosition]}
        intensity={sky.sunIntensity}
        color={sky.sun}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0006}
        shadow-normalBias={0.03}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-camera-far={60}
      />
    </>
  );
}
