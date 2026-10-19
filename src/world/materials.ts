import {
  AdditiveBlending,
  BackSide,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CapsuleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DataTexture,
  ExtrudeGeometry,
  IcosahedronGeometry,
  MeshBasicMaterial,
  MeshToonMaterial,
  NearestFilter,
  PlaneGeometry,
  RedFormat,
  RepeatWrapping,
  SRGBColorSpace,
  ShaderMaterial,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  type Material,
} from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { COLORS } from '../ui/tokens.ts';
import type { FloorTheme, FloorThemeId } from '../ui/themes.ts';

/**
 * Shared materials and geometries. The office is cel-shaded: every solid uses
 * a toon material on a three-step ramp and carries an ink outline. Materials
 * are cached by colour (and per floor theme), so repeated desks, chairs,
 * monitors, and plants share GPU resources.
 */

/** Three bands of light: shadow, mid, lit. */
function toonRamp(): DataTexture {
  const ramp = new DataTexture(new Uint8Array([150, 205, 255]), 3, 1, RedFormat);
  ramp.minFilter = NearestFilter;
  ramp.magFilter = NearestFilter;
  ramp.needsUpdate = true;
  return ramp;
}

export const TOON_RAMP = toonRamp();

const toonCache = new Map<string, MeshToonMaterial>();

/** One shared cel-shaded material per colour. */
export function toon(color: string): MeshToonMaterial {
  let material = toonCache.get(color);
  if (!material) {
    material = new MeshToonMaterial({ color, gradientMap: TOON_RAMP });
    toonCache.set(color, material);
  }
  return material;
}

const glowCache = new Map<string, MeshBasicMaterial>();

/** Unlit, untoned colour for things that emit light: screens, lamps, lit windows. */
export function glow(color: string): MeshBasicMaterial {
  let material = glowCache.get(color);
  if (!material) {
    material = new MeshBasicMaterial({ color, toneMapped: false });
    glowCache.set(color, material);
  }
  return material;
}

/** Kept for existing callers: a shirt is just a toon colour. */
export const shirtMaterial = toon;

/** Materials that look the same on every floor. */
export const MATERIALS = {
  skin: toon(COLORS.skin),
  trousers: toon(COLORS.trousers),
  metal: toon(COLORS.metal),
  bezel: toon(COLORS.bezel),
  screen: glow(COLORS.screen),
  whiteboard: toon(COLORS.whiteboard),
  ink: new MeshBasicMaterial({ color: COLORS.ink }),
  eyeWhite: new MeshBasicMaterial({ color: '#ffffff' }),
  blush: new MeshBasicMaterial({ color: '#ff9fa8', transparent: true, opacity: 0.55 }),
  markDanger: glow(COLORS.danger),
  markAmber: glow(COLORS.amber),
  markReview: glow(COLORS.review),
  markSuccess: glow(COLORS.success),
  markLight: glow(COLORS.paper),
} as const;

export type ThemeMaterials = ReturnType<typeof buildThemeMaterials>;

const themeCache = new Map<FloorThemeId, ThemeMaterials>();

/** Every surface colour for one floor theme, built once per theme. */
export function themeMaterials(theme: FloorTheme): ThemeMaterials {
  let materials = themeCache.get(theme.id);
  if (!materials) {
    materials = buildThemeMaterials(theme);
    themeCache.set(theme.id, materials);
  }
  return materials;
}

function buildThemeMaterials(theme: FloorTheme) {
  const c = theme.scene;
  const floor = new MeshToonMaterial({ color: '#ffffff', gradientMap: TOON_RAMP });
  const planks = plankTexture(c.floor, c.floorSeam);
  if (planks) floor.map = planks;
  else floor.color = new Color(c.floor);
  return {
    floor,
    wall: toon(c.wall),
    wallStripe: toon(c.wallStripe),
    skirting: toon(c.skirting),
    // Unlit, so it reads as a clean bright surface rather than a dark underside.
    ceiling: new MeshBasicMaterial({ color: new Color(c.ceiling).multiplyScalar(theme.sky.lampsOn ? 0.85 : 0.94) }),
    lamp: glow(c.lamp),
    wood: toon(c.wood),
    deskTop: toon(c.deskTop),
    fabric: toon(c.fabric),
    rug: toon(c.rug),
    rugEdge: toon(c.rugEdge),
    leaf: toon(c.leaf),
    leafDark: toon(c.leafDark),
    pot: toon(c.pot),
    trim: toon(c.trim),
    accent: toon(theme.accent),
    accentGlow: glow(theme.accent),
    window: new MeshBasicMaterial({ color: c.glass, transparent: true, opacity: 0.22, depthWrite: false }),
    ground: new MeshBasicMaterial({ color: c.ground }),
    city: toon(c.city),
    cityWindow: theme.sky.lampsOn ? glow(c.cityWindow) : toon(c.cityWindow),
    /** Additive pool of screen light on a desk. */
    screenPool: new MeshBasicMaterial({
      map: radialTexture(),
      color: new Color(theme.accent).lerp(new Color('#a9d4ff'), 0.6),
      transparent: true,
      opacity: theme.sky.screenGlow,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
    /** Additive halo under a ceiling lamp, only when lamps are on. */
    lampPool: new MeshBasicMaterial({
      map: radialTexture(),
      color: c.lamp,
      transparent: true,
      opacity: theme.sky.lampsOn ? 0.32 : 0,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  };
}

// ---------------------------------------------------------------------------
// Procedural textures. Canvas is unavailable in some test environments; these
// return null there and callers fall back to flat colour.

function canvas2d(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    ctx = canvas.getContext('2d');
  } catch {
    return null;
  }
  return ctx ? [canvas, ctx] : null;
}

/** Deterministic 0–1 noise from an integer, so planks look the same every load. */
const hash = (n: number) => {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
};

/** Wood planks: staggered boards with a slight tone change and dark seams. 1 repeat ≈ 2 m. */
function plankTexture(base: string, seam: string): CanvasTexture | null {
  const made = canvas2d(512, 512);
  if (!made) return null;
  const [canvas, ctx] = made;
  const rows = 8;
  const rowH = canvas.height / rows;
  const baseColor = new Color(base);
  const board = canvas.width / 2;
  for (let r = 0; r < rows; r++) {
    // Stagger each row; boards wrap so the texture tiles seamlessly.
    const offset = hash(r) * board;
    for (let k = -1; k < 2; k++) {
      const x = offset + k * board;
      const tone = baseColor.clone().offsetHSL(0, 0, (hash(r * 7 + ((k + 2) % 2)) - 0.5) * 0.07);
      ctx.fillStyle = `#${tone.getHexString()}`;
      ctx.fillRect(x, r * rowH, board, rowH);
      ctx.fillStyle = seam;
      ctx.fillRect(x, r * rowH, 3, rowH);
    }
    ctx.fillStyle = seam;
    ctx.fillRect(0, r * rowH, canvas.width, 3);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

let radial: CanvasTexture | null | undefined;

/** Soft white disc fading to transparent, for fake light pools. */
function radialTexture(): CanvasTexture | null {
  if (radial !== undefined) return radial;
  const made = canvas2d(128, 128);
  if (!made) return (radial = null);
  const [canvas, ctx] = made;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  radial = new CanvasTexture(canvas);
  return radial;
}

// ---------------------------------------------------------------------------
// Geometry

function starShape(points = 5, outer = 0.5, inner = 0.22): Shape {
  const shape = new Shape();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2;
    const [x, y] = [Math.cos(a) * r, Math.sin(a) * r];
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

export const GEOMETRIES = {
  /** 1×1×1 box; meshes scale it to size. */
  box: new BoxGeometry(1, 1, 1),
  /** 1×1 plane lying flat after a -90° x rotation. */
  plane: new PlaneGeometry(1, 1),
  /** Unit-height cylinder, radius 0.5. */
  cylinder: new CylinderGeometry(0.5, 0.5, 1, 16),
  /** Low-poly blob for foliage, radius 0.5. */
  blob: new IcosahedronGeometry(0.5, 0),
  sphere: new SphereGeometry(0.5, 16, 12),
  /** Unit-height cone, radius 0.5. */
  cone: new ConeGeometry(0.5, 1, 12),
  /** Capsule, radius 0.5, total height 2 (a 1-unit body plus two rounded caps). */
  capsule: new CapsuleGeometry(0.5, 1, 4, 12),
  /** Flat octagon facing +z, radius 0.5: a stop sign. */
  octagon: new CylinderGeometry(0.5, 0.5, 0.08, 8).rotateX(Math.PI / 2).rotateZ(Math.PI / 8),
  /** Ring facing +z, outer radius ~0.5. */
  ring: new TorusGeometry(0.4, 0.09, 8, 24),
  /** Five-point star facing +z, radius 0.5. */
  star: new ExtrudeGeometry(starShape(), { depth: 0.08, bevelEnabled: false }),
} as const;

export type GeometryName = keyof typeof GEOMETRIES;

// ---------------------------------------------------------------------------
// Ink outlines: the inverted-hull trick. A back-face copy of the mesh is pushed
// out along smoothed normals by a fixed number of screen pixels.

export const OUTLINE_PIXELS = 1.6;

const hullCache = new WeakMap<BufferGeometry, BufferGeometry>();

/** The geometry with welded vertices and smooth normals, so the hull has no gaps at corners. */
export function hullGeometry(geometry: BufferGeometry): BufferGeometry {
  let hull = hullCache.get(geometry);
  if (!hull) {
    const positionsOnly = new BufferGeometry();
    const position = geometry.getAttribute('position');
    positionsOnly.setAttribute('position', position.clone());
    if (geometry.index) positionsOnly.setIndex(geometry.index.clone());
    hull = mergeVertices(positionsOnly, 1e-4);
    hull.computeVertexNormals();
    hullCache.set(geometry, hull);
  }
  return hull;
}

/** Shared by every outline. `size` is the drawing-buffer size, updated on resize. */
export const OUTLINE_MATERIAL = new ShaderMaterial({
  side: BackSide,
  uniforms: {
    color: { value: new Color(COLORS.ink) },
    thickness: { value: OUTLINE_PIXELS },
    size: { value: new Vector2(1280, 800) },
  },
  vertexShader: /* glsl */ `
    uniform float thickness;
    uniform vec2 size;
    void main() {
      vec4 clipPosition = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      vec4 clipNormal = projectionMatrix * modelViewMatrix * vec4(normal, 0.0);
      vec2 dir = clipNormal.xy;
      float len = length(dir);
      if (len > 1e-5) clipPosition.xy += dir / len * thickness / size * clipPosition.w * 2.0;
      gl_Position = clipPosition;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 color;
    void main() {
      gl_FragColor = vec4(color, 1.0);
      #include <colorspace_fragment>
    }
  `,
});

/** Materials that never get an outline: glows, glass, and light pools. */
export function wantsOutline(material: Material): boolean {
  return !(material instanceof MeshBasicMaterial);
}
