import { describe, expect, it } from 'vitest';
import { applyColorTokens, COLORS } from './tokens.ts';

describe('colour tokens', () => {
  it('are valid hex colours', () => {
    for (const value of Object.values(COLORS)) expect(value).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('are written to CSS custom properties', () => {
    const el = document.createElement('div');
    applyColorTokens(el);
    expect(el.style.getPropertyValue('--fv-forest')).toBe(COLORS.forest);
    expect(el.style.getPropertyValue('--fv-ivory')).toBe(COLORS.ivory);
    expect(el.style.getPropertyValue('--fv-charcoal')).toBe(COLORS.charcoal);
  });
});
