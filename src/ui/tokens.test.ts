import { describe, expect, it } from 'vitest';
import { applyColorTokens, CHARACTER_COLORS, COLORS, contrastRatio, HAIR_COLORS, PANEL_TEXT_PAIRS } from './tokens.ts';

describe('colour tokens', () => {
  it('are valid hex colours', () => {
    for (const value of [...Object.values(COLORS), ...CHARACTER_COLORS, ...HAIR_COLORS]) expect(value).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('are written to CSS custom properties', () => {
    const el = document.createElement('div');
    applyColorTokens(el);
    expect(el.style.getPropertyValue('--fv-ink')).toBe(COLORS.ink);
    expect(el.style.getPropertyValue('--fv-paper')).toBe(COLORS.paper);
    expect(el.style.getPropertyValue('--fv-ink-soft')).toBe(COLORS.inkSoft);
    expect(el.style.getPropertyValue('--fv-danger')).toBe(COLORS.danger);
  });

  it('keeps status colours distinct from each other', () => {
    const statuses = [COLORS.success, COLORS.danger, COLORS.amber, COLORS.review];
    expect(new Set(statuses).size).toBe(statuses.length);
  });

  it('keeps every panel text pairing at 4.5:1 or better', () => {
    for (const [text, background, where] of PANEL_TEXT_PAIRS) {
      expect(contrastRatio(text, background), where).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('measures contrast like WCAG', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    // Plain status fills are too light for white text; the deep variants exist for that.
    expect(contrastRatio('#ffffff', COLORS.danger)).toBeLessThan(4.5);
  });
});
