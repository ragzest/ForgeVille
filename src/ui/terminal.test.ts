import { describe, expect, it } from 'vitest';
import { runtimeStyle } from './runtimes.ts';
import { TERMINAL_COLORS } from './terminal.ts';
import { contrastRatio } from './tokens.ts';

describe('terminal colours', () => {
  it('keeps every transcript colour readable on the screen background', () => {
    const { bg, fg, dim, green, cyan, orange } = TERMINAL_COLORS;
    for (const [name, text] of Object.entries({ fg, dim, green, cyan, orange })) {
      expect(contrastRatio(text, bg), name).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps runtime title-bar text readable on its accent', () => {
    for (const label of ['Claude Code', 'Codex', 'Pi', 'OpenCode', 'Unknown runtime']) {
      const style = runtimeStyle(label);
      expect(contrastRatio(style.onAccent, style.accent), label).toBeGreaterThanOrEqual(4.5);
    }
  });
});
