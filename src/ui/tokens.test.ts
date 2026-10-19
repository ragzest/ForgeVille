import { describe, expect, it } from 'vitest';
import { applyColorTokens, CHARACTER_COLORS, COLORS, HAIR_COLORS } from './tokens.ts';

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
});
