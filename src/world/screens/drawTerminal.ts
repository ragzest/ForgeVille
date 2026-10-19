import { CanvasTexture, SRGBColorSpace } from 'three';
import { COLORS } from '../../ui/tokens.ts';
import { MONO_FONT, UI_FONT } from '../../ui/fonts.ts';
import { TERMINAL_COLORS, WINDOW_DOTS } from '../../ui/terminal.ts';
import type { ScreenModel } from './screenModel.ts';

/**
 * Paints a desk monitor: a terminal window with the session transcript, or a
 * screensaver when the agent has no session. Every screen carries a visible
 * "SIMULATED" tag, so a glance at a monitor never suggests a real process.
 */

export const SCREEN_PX = { width: 640, height: 384 } as const;

const TERM = TERMINAL_COLORS;

// Deep fills, so the white banner text stays readable (amber keeps ink text).
const TONES = { danger: COLORS.dangerDeep, amber: COLORS.amber, review: COLORS.reviewDeep, success: COLORS.successDeep } as const;

export interface PaintedScreen {
  readonly texture: CanvasTexture;
  /** Where the prompt cursor sits, as 0–1 fractions of the screen from the top left. */
  readonly cursor: { readonly x: number; readonly y: number } | null;
}

function fit(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > max) cut = cut.slice(0, -1);
  return `${cut}…`;
}

function pill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();
}

function paintTerminal(ctx: CanvasRenderingContext2D, model: ScreenModel): PaintedScreen['cursor'] {
  const { width, height } = SCREEN_PX;
  ctx.fillStyle = TERM.bg;
  ctx.fillRect(0, 0, width, height);

  // Title bar with window dots, title, and the simulated tag.
  const barH = 40;
  ctx.fillStyle = TERM.bar;
  ctx.fillRect(0, 0, width, barH);
  WINDOW_DOTS.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(22 + i * 22, barH / 2, 7, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.font = `600 18px ${UI_FONT}`;
  const tag = 'SIMULATED';
  const tagW = ctx.measureText(tag).width + 20;
  pill(ctx, width - tagW - 12, 9, tagW, 22, model.runtime.accent);
  ctx.fillStyle = model.runtime.onAccent;
  ctx.textBaseline = 'middle';
  ctx.fillText(tag, width - tagW - 2, barH / 2 + 1);
  ctx.fillStyle = TERM.fg;
  ctx.font = `500 17px ${MONO_FONT}`;
  ctx.fillText(fit(ctx, model.title, width - tagW - 110), 90, barH / 2 + 1);

  // Transcript.
  const lineH = 34;
  let y = barH + 26;
  ctx.font = `400 19px ${MONO_FONT}`;
  for (const line of model.lines) {
    ctx.fillStyle = TERM.dim;
    ctx.fillText(line.time, 16, y);
    const x = 84;
    if (line.kind === 'command') {
      ctx.fillStyle = TERM.green;
      ctx.fillText(fit(ctx, line.text, width - x - 16), x, y);
    } else {
      ctx.fillStyle = line.kind === 'system' ? TERM.cyan : TERM.fg;
      ctx.fillText(fit(ctx, line.text, width - x - 16), x, y);
    }
    y += lineH;
  }

  if (model.status) {
    ctx.fillStyle = TERM.orange;
    ctx.fillText(`${model.runtime.prompt} ${model.status}…`, 16, y);
    y += lineH;
  }

  // Prompt.
  ctx.fillStyle = model.runtime.accent;
  ctx.font = `700 20px ${MONO_FONT}`;
  ctx.fillText('›', 16, y);
  const cursor = { x: 40 / width, y: y / height };

  if (model.banner) {
    const h = 44;
    ctx.fillStyle = TONES[model.banner.tone];
    ctx.fillRect(0, height - h, width, h);
    ctx.fillStyle = model.banner.tone === 'amber' ? COLORS.ink : '#ffffff';
    ctx.font = `700 21px ${UI_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(model.banner.text, width / 2, height - h / 2 + 1);
    ctx.textAlign = 'left';
  }
  return model.live ? cursor : null;
}

function paintScreensaver(ctx: CanvasRenderingContext2D, model: ScreenModel) {
  const { width, height } = SCREEN_PX;
  const g = ctx.createLinearGradient(0, 0, width, height);
  g.addColorStop(0, '#26264a');
  g.addColorStop(1, '#3b2a55');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = model.runtime.accent;
  ctx.font = `700 64px ${UI_FONT}`;
  ctx.fillText(model.runtime.prompt, width / 2, height / 2 - 50);
  ctx.fillStyle = '#eeeef6';
  ctx.font = `600 30px ${UI_FONT}`;
  const [headline, subline] = model.caption ?? (model.name ? [`${model.name} is free`, 'No simulated session'] : ['Vacant desk', 'Ready for the next project']);
  ctx.fillText(fit(ctx, headline, width - 40), width / 2, height / 2 + 18);
  ctx.fillStyle = TERM.dim;
  ctx.font = `500 20px ${UI_FONT}`;
  ctx.fillText(fit(ctx, subline, width - 40), width / 2, height / 2 + 60);
  ctx.textAlign = 'left';
}

const cache = new Map<string, PaintedScreen>();

/** The painted screen for a model, cached by `model.key`. Null where canvas is unavailable. */
export function paintScreen(model: ScreenModel): PaintedScreen | null {
  const hit = cache.get(model.key);
  if (hit) return hit;
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = SCREEN_PX.width;
  canvas.height = SCREEN_PX.height;
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    ctx = canvas.getContext('2d');
  } catch {
    ctx = null;
  }
  if (!ctx) return null;
  ctx.textBaseline = 'middle';
  const cursor = model.mode === 'terminal' ? paintTerminal(ctx, model) : (paintScreensaver(ctx, model), null);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  const painted = { texture, cursor };
  // Keep the cache small: screens repaint when a scenario changes.
  if (cache.size > 64) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) {
      cache.get(oldest)?.texture.dispose();
      cache.delete(oldest);
    }
  }
  cache.set(model.key, painted);
  return painted;
}
