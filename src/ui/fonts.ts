import '@fontsource-variable/fredoka';
import '@fontsource-variable/jetbrains-mono';

/**
 * Bundled fonts (no network at runtime). Canvas textures in the 3D office use
 * the same stacks, so signs and screens match the panels.
 */
export const UI_FONT = `'Fredoka Variable', 'Fredoka', ui-rounded, system-ui, -apple-system, 'Segoe UI', sans-serif`;
export const MONO_FONT = `'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace`;

/**
 * Resolves once both fonts are usable, or after `timeoutMs`, whichever comes
 * first. Canvas textures are cached, so the office waits for this before it
 * paints its first sign.
 */
export function fontsReady(timeoutMs = 1500): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return Promise.resolve();
  const load = Promise.all([
    document.fonts.load(`600 32px 'Fredoka Variable'`),
    document.fonts.load(`400 16px 'JetBrains Mono Variable'`),
  ]).then(
    () => undefined,
    () => undefined,
  );
  const timeout = new Promise<void>((resolve) => {
    window.setTimeout(resolve, timeoutMs);
  });
  return Promise.race([load, timeout]);
}
