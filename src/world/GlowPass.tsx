import { useFrame, useThree } from '@react-three/fiber';
import { MipmapBlurPass } from 'postprocessing';
import { useEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  Color,
  HalfFloatType,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  WebGLRenderTarget,
} from 'three';
import { useFloorScene } from './floorScene.ts';
import { GLOW_LAYER, glowIntensity } from './glow.ts';

/** The glow buffer is drawn at this fraction of the canvas size; it is blurred anyway. */
const GLOW_SCALE = 0.5;

/**
 * High tier only: a soft glow around screens and lit lamps.
 *
 * The office is drawn exactly as on Medium, straight to the screen, so the
 * cel-shaded look and tone mapping do not change. Then a small buffer gets a
 * silhouette pass (everything black, so walls and people still hide what is
 * behind them) and, on top, only the meshes on `GLOW_LAYER` in their own
 * colours. `postprocessing`'s mip-map blur spreads that buffer, and it is
 * added over the frame. Nothing off the glow layer can haze.
 */
export function GlowPass() {
  const gl = useThree((s) => s.gl);
  const get = useThree((s) => s.get);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  const { sky } = useFloorScene();

  const parts = useMemo(() => {
    const target = new WebGLRenderTarget(1, 1, { type: HalfFloatType });
    target.texture.name = 'Glow.Source';
    const blur = new MipmapBlurPass();
    blur.levels = 4;
    blur.radius = 0.7;
    blur.initialize(gl, false, HalfFloatType);
    const silhouette = new MeshBasicMaterial({ color: '#000000', fog: false });
    const composite = new ShaderMaterial({
      uniforms: { map: { value: blur.texture }, intensity: { value: 1 } },
      blending: AdditiveBlending,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D map;
        uniform float intensity;
        varying vec2 vUv;
        void main() {
          gl_FragColor = vec4(texture2D(map, vUv).rgb * intensity, 1.0);
          #include <colorspace_fragment>
        }
      `,
    });
    const quad = new Mesh(new PlaneGeometry(2, 2), composite);
    quad.frustumCulled = false;
    const overlay = new Scene();
    overlay.add(quad);
    return { target, blur, silhouette, composite, quad, overlay, overlayCamera: new OrthographicCamera(-1, 1, 1, -1, 0, 1), clear: new Color() };
  }, [gl]);

  useEffect(
    () => () => {
      parts.target.dispose();
      parts.blur.dispose();
      parts.silhouette.dispose();
      parts.composite.dispose();
      parts.quad.geometry.dispose();
    },
    [parts],
  );

  // The frame loop reads the current set through a ref.
  const current = useRef(parts);
  useEffect(() => {
    current.current = parts;
  }, [parts]);

  useEffect(() => {
    const w = Math.max(1, Math.round(size.width * dpr * GLOW_SCALE));
    const h = Math.max(1, Math.round(size.height * dpr * GLOW_SCALE));
    parts.target.setSize(w, h);
    parts.blur.setSize(w, h);
  }, [parts, size, dpr]);

  // Priority 1: this pass now owns the frame, so the default render is skipped.
  useFrame(({ gl, scene, camera }) => {
    const { target, blur, silhouette, composite, overlay, overlayCamera, clear } = current.current;
    const intensity = composite.uniforms.intensity;
    if (intensity) intensity.value = glowIntensity(sky.screenGlow);
    gl.info.autoReset = false;
    gl.info.reset();

    // 1. The office, exactly as Medium draws it.
    gl.setRenderTarget(null);
    gl.render(scene, camera);

    // 2. Glow source: black silhouettes, then the glow layer in colour.
    const background = scene.background;
    const layers = camera.layers.mask;
    const autoClear = gl.autoClear;
    const shadows = gl.shadowMap.autoUpdate;
    gl.getClearColor(clear);
    const clearAlpha = gl.getClearAlpha();
    gl.shadowMap.autoUpdate = false;
    scene.background = null;
    gl.setClearColor('#000000', 1);
    gl.setRenderTarget(target);
    gl.clear();
    gl.autoClear = false;
    scene.overrideMaterial = silhouette;
    gl.render(scene, camera);
    scene.overrideMaterial = null;
    camera.layers.set(GLOW_LAYER);
    gl.render(scene, camera);
    camera.layers.mask = layers;
    scene.background = background;
    gl.setClearColor(clear, clearAlpha);
    gl.shadowMap.autoUpdate = shadows;

    // 3. Blur it and add it over the frame.
    blur.render(gl, target, null);
    gl.setRenderTarget(null);
    gl.render(overlay, overlayCamera);
    gl.autoClear = autoClear;
  }, 1);

  useEffect(
    () => () => {
      get().gl.info.autoReset = true;
    },
    [get],
  );

  return null;
}
