/**
 * The one place shared colours are defined. CSS reads them as `--fv-*` custom
 * properties (set by `applyColorTokens` at startup); 3D materials import them.
 *
 * Floor-specific colours (walls, wood, sky, accent) live in `themes.ts`. The
 * tokens here are the same on every floor, so a status always looks the same.
 */
export const COLORS = {
  /** Outlines, borders, and body text: a soft blue-black, never pure black. */
  ink: '#1f1d2b',
  /** Panel paper. */
  paper: '#fffdf6',
  /** Page background behind the office. */
  cream: '#f6efe2',
  /** Muted text and dividers. */
  inkSoft: '#5b5870',
  line: '#e4dccb',
  /** Brand accent: forge ember. Floors may override `--fv-accent`. */
  ember: '#ff8a5b',
  emberDeep: '#c4532a',

  // Status. Constant across floors; always paired with an icon and text.
  success: '#2fb37a',
  successSoft: '#d4f5e4',
  /** Success for text on paper, or a fill under white text. */
  successDeep: '#1f7a52',
  danger: '#e5484d',
  dangerSoft: '#fde1e1',
  /** Danger for text on paper, or a fill under white text. */
  dangerDeep: '#c4271f',
  amber: '#f5a524',
  amberSoft: '#fff1d1',
  /** Review: distinct from success and blocked. */
  review: '#7c6cf2',
  reviewSoft: '#e8e4ff',
  /** Review for text on paper, or a fill under white text. */
  reviewDeep: '#5b4bd6',

  // Scene constants shared by every floor.
  screen: '#1b1b29',
  screenBar: '#2a2a3d',
  skin: '#f1c9a5',
  trousers: '#3d4152',
  metal: '#5c677d',
  bezel: '#2b2d42',
  whiteboard: '#fffdf6',
} as const;

export type ColorToken = keyof typeof COLORS;

/**
 * Every text-on-background pairing the panels use, as [text, background].
 * Each must reach 4.5:1 (`tokens.test.ts`). Floor accents are checked in
 * `themes.test.ts`, terminal colours in `terminal.test.ts`.
 */
export const PANEL_TEXT_PAIRS: readonly (readonly [text: string, background: string, where: string])[] = [
  [COLORS.ink, COLORS.paper, 'body text on panels'],
  [COLORS.ink, COLORS.cream, 'body text on the page'],
  [COLORS.inkSoft, COLORS.paper, 'notes on panels'],
  [COLORS.inkSoft, COLORS.cream, 'notes on the page and muted chips'],
  [COLORS.inkSoft, COLORS.line, 'notes on dividers'],
  [COLORS.ink, COLORS.successSoft, 'working badge, passed check'],
  [COLORS.ink, COLORS.dangerSoft, 'refused feedback, failed check'],
  [COLORS.dangerDeep, COLORS.dangerSoft, 'refused heading on its soft fill'],
  [COLORS.ink, COLORS.amberSoft, 'running check'],
  [COLORS.ink, COLORS.reviewSoft, 'review chip'],
  [COLORS.ink, COLORS.amber, 'awaiting-review badge and banner'],
  ['#ffffff', COLORS.dangerDeep, 'blocked badge and banner'],
  ['#ffffff', COLORS.reviewDeep, 'reviewing badge and banner'],
  ['#ffffff', COLORS.successDeep, 'merged banner'],
  [COLORS.dangerDeep, COLORS.paper, 'urgent priority, failing run'],
  [COLORS.successDeep, COLORS.paper, 'success text'],
  [COLORS.reviewDeep, COLORS.paper, 'review text'],
];

/** WCAG 2.x contrast ratio between two `#rrggbb` colours. */
export function contrastRatio(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((p, q) => q - p) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Shirt colours for characters, assigned by desk. Bright, so people pop against any floor. */
export const CHARACTER_COLORS = ['#e63946', '#457b9d', '#2a9d8f', '#f4a261', '#9b5de5', '#00bbf9', '#f15bb5', '#06d6a0'] as const;

/** Hair colours, assigned by desk. */
export const HAIR_COLORS = ['#3b2a20', '#8a4b2a', '#1f1d2b', '#d9a441', '#6b3e2e', '#b5651d', '#2d2a3e', '#a0522d'] as const;

export const cssName = (token: string) => `--fv-${token.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

/** Writes every colour token onto an element as a CSS custom property. */
export function applyColorTokens(target: HTMLElement): void {
  for (const [token, value] of Object.entries(COLORS)) {
    target.style.setProperty(cssName(token), value);
  }
}
