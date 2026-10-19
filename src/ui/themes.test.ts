import { describe, expect, it } from 'vitest';
import { COLORS } from './tokens.ts';
import { FLOOR_THEME_IDS, FLOOR_THEMES, themeCssVars } from './themes.ts';

const hex = /^#[0-9a-f]{6}$/;

/** WCAG relative luminance contrast between two hex colours. */
function contrast(a: string, b: string): number {
  const lum = (h: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(h.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

describe('floor themes', () => {
  it('has four distinct themes with distinct accents and moods', () => {
    expect(FLOOR_THEME_IDS).toHaveLength(4);
    const themes = FLOOR_THEME_IDS.map((id) => FLOOR_THEMES[id]);
    expect(new Set(themes.map((t) => t.accent)).size).toBe(4);
    expect(new Set(themes.map((t) => t.mood)).size).toBe(4);
    for (const t of themes) expect(t.id).toBe(FLOOR_THEMES[t.id].id);
  });

  it('uses valid colours everywhere', () => {
    for (const id of FLOOR_THEME_IDS) {
      const t = FLOOR_THEMES[id];
      for (const c of [t.accent, t.accentDeep, t.onAccent, t.accentSoft, ...(Object.values(t.scene) as string[])]) expect(c, id).toMatch(hex);
      for (const c of [t.sky.zenith, t.sky.horizon, t.sky.fog, t.sky.sun, t.sky.hemiSky, t.sky.hemiGround]) expect(c, id).toMatch(hex);
      expect(t.sky.fogFar).toBeGreaterThan(t.sky.fogNear);
      expect(t.sky.sunPosition[1], `${id} sun above the horizon`).toBeGreaterThan(0);
    }
  });

  it('keeps accent text and ink text readable', () => {
    for (const id of FLOOR_THEME_IDS) {
      const t = FLOOR_THEMES[id];
      expect(contrast(t.accent, t.onAccent), `${id} on-accent`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t.accentSoft, COLORS.ink), `${id} soft`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t.accent, COLORS.ink), `${id} ink on accent`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('turns lamps on only for the evening moods', () => {
    expect(FLOOR_THEMES['night-studio'].sky.lampsOn).toBe(true);
    expect(FLOOR_THEMES['night-studio'].sky.stars).toBe(true);
    expect(FLOOR_THEMES.workshop.sky.lampsOn).toBe(false);
    expect(FLOOR_THEMES.greenhouse.lush).toBe(true);
  });

  it('exposes the accent to CSS', () => {
    expect(themeCssVars(FLOOR_THEMES.greenhouse)).toMatchObject({ '--fv-accent': FLOOR_THEMES.greenhouse.accent });
  });
});
