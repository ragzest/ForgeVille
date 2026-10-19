import { CanvasTexture, MeshBasicMaterial, SRGBColorSpace } from 'three';
import { UI_FONT } from '../ui/fonts.ts';
import { COLORS } from '../ui/tokens.ts';

export interface FloorLabel {
  readonly material: MeshBasicMaterial;
  /** Width / height of the label, for scaling a unit plane. */
  readonly aspect: number;
}

export interface LabelColors {
  readonly background: string;
  readonly text: string;
  /** Sticker border. Defaults to ink; `null` for none. */
  readonly border?: string | null;
}

const cache = new Map<string, FloorLabel>();

/** Paper sticker with an ink border: the default sign style. */
export const STICKER: LabelColors = { background: COLORS.paper, text: COLORS.ink, border: COLORS.ink };

const FONT_PX = 44;
const PAD_X = 30;
const HEIGHT = 80;
const BORDER = 6;

/**
 * A pill-shaped sticker label drawn into a canvas texture with the bundled UI
 * font. One material per distinct text and colour, cached.
 */
export function floorLabel(text: string, colors: LabelColors = STICKER): FloorLabel {
  const border = colors.border === undefined ? COLORS.ink : colors.border;
  const key = `${colors.background}|${colors.text}|${border ?? '-'}|${text}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    ctx = canvas.getContext('2d');
  } catch {
    ctx = null;
  }
  const font = `600 ${String(FONT_PX)}px ${UI_FONT}`;
  let textWidth = text.length * FONT_PX * 0.55;
  if (ctx) {
    ctx.font = font;
    textWidth = ctx.measureText(text).width;
  }

  canvas.width = Math.ceil(textWidth + PAD_X * 2 + BORDER * 2);
  canvas.height = HEIGHT;

  if (ctx) {
    const inset = border ? BORDER / 2 : 0;
    ctx.beginPath();
    ctx.roundRect(inset, inset, canvas.width - inset * 2, canvas.height - inset * 2, (HEIGHT - inset * 2) / 2);
    ctx.fillStyle = colors.background;
    ctx.fill();
    if (border) {
      ctx.lineWidth = BORDER;
      ctx.strokeStyle = border;
      ctx.stroke();
    }
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
    material: new MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false }),
    aspect: canvas.width / canvas.height,
  };
  cache.set(key, label);
  return label;
}
