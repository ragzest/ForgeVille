import { CanvasTexture, MeshBasicMaterial, SRGBColorSpace } from 'three';
import { COLORS } from '../ui/tokens.ts';

export interface FloorLabel {
  readonly material: MeshBasicMaterial;
  /** Width / height of the label, for scaling a unit plane. */
  readonly aspect: number;
}

const cache = new Map<string, FloorLabel>();

const PILL = { background: COLORS.forest, text: COLORS.ivory };

const FONT_PX = 44;
const PAD_X = 28;
const HEIGHT = 76;

/**
 * A pill-shaped text label drawn into a canvas texture. Uses the system font,
 * so nothing is downloaded. One material per distinct text, cached.
 */
export function floorLabel(text: string, colors: { background: string; text: string } = PILL): FloorLabel {
  const key = `${colors.background}|${colors.text}|${text}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = `600 ${String(FONT_PX)}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  let textWidth = text.length * FONT_PX * 0.55;
  if (ctx) {
    ctx.font = font;
    textWidth = ctx.measureText(text).width;
  }

  canvas.width = Math.ceil(textWidth + PAD_X * 2);
  canvas.height = HEIGHT;

  if (ctx) {
    ctx.fillStyle = colors.background;
    ctx.beginPath();
    ctx.roundRect(0, 0, canvas.width, canvas.height, HEIGHT / 2);
    ctx.fill();
    ctx.font = font;
    ctx.fillStyle = colors.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;

  const label: FloorLabel = {
    material: new MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }),
    aspect: canvas.width / canvas.height,
  };
  cache.set(key, label);
  return label;
}
