import { COLORS } from './tokens.ts';

/**
 * Terminal colours, a soft Dracula variant. Shared by the desk monitors
 * (painted on a canvas) and the terminal panel (CSS), so both read the same.
 */
export const TERMINAL_COLORS = {
  bg: COLORS.screen,
  bar: COLORS.screenBar,
  fg: '#eeeef6',
  /** Timestamps and empty-state copy; 4.5:1 or better on `bg`. */
  dim: '#9a9ab8',
  /** Commands (`$ …`). */
  green: '#50fa7b',
  /** System lines. */
  cyan: '#8be9fd',
  /** The spinner status line. */
  orange: '#ff9e64',
} as const;

/** Window buttons in the title bar: close, minimise, zoom. Decoration only. */
export const WINDOW_DOTS = ['#ff5f57', '#febc2e', '#28c840'] as const;
