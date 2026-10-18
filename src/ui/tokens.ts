/**
 * The one place colours are defined. CSS reads them as `--fv-*` custom
 * properties (set by `applyColorTokens` at startup); 3D materials import them.
 */
export const COLORS = {
  forest: '#1f4d3a',
  emerald: '#2e8b62',
  mint: '#9ee6c0',
  ivory: '#fbf7ee',
  grey: '#e6e3dc',
  charcoal: '#2b2b2b',
  danger: '#c2410c',
  amber: '#b45309',
  /** Scene-only surfaces, derived from the palette above. */
  floor: '#d9c4a1',
  wall: '#f6f1e6',
  trim: '#3a3a36',
  glass: '#cfe8df',
  sky: '#dfeee8',
  rug: '#efe7d6',
} as const;

export type ColorToken = keyof typeof COLORS;

const cssName = (token: string) => `--fv-${token.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

/** Writes every colour token onto an element as a CSS custom property. */
export function applyColorTokens(target: HTMLElement): void {
  for (const [token, value] of Object.entries(COLORS)) {
    target.style.setProperty(cssName(token), value);
  }
}
