/**
 * How each coding-agent runtime is told apart on screens, badges, and desks.
 * Display only: a colour and a short glyph, never a vendor logo, and never a
 * hint that a real runtime is attached.
 */
export interface RuntimeStyle {
  /** Display label, as stored on the agent (e.g. "Claude Code"). */
  readonly label: string;
  /** Accent for the terminal title bar, desk light, and badges. */
  readonly accent: string;
  /** Text drawn on top of `accent`. */
  readonly onAccent: string;
  /** Terminal prompt glyph. */
  readonly prompt: string;
}

const STYLES: Readonly<Record<string, Omit<RuntimeStyle, 'label'>>> = {
  'claude code': { accent: '#d97757', onAccent: '#1f1410', prompt: '✻' },
  codex: { accent: '#7dd3c0', onAccent: '#0f2621', prompt: '›' },
  pi: { accent: '#f2c14e', onAccent: '#2a1f05', prompt: 'π' },
  opencode: { accent: '#8fb3ff', onAccent: '#0e1a33', prompt: '⌘' },
};

const FALLBACK: Omit<RuntimeStyle, 'label'> = { accent: '#b8b2a7', onAccent: '#1e1d1a', prompt: '$' };

export function runtimeStyle(label: string): RuntimeStyle {
  return { label: label || 'Agent', ...(STYLES[label.trim().toLowerCase()] ?? FALLBACK) };
}
