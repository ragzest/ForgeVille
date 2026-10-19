/**
 * Browser facts the shell reads at boot. Injected so tests can stub them.
 */
export interface ShellEnvironment {
  /** URL query string, e.g. `?shell=error`. */
  search: string;
  /** True when a WebGL context can be created. */
  detectWebGL: () => boolean;
  /** True when the user asked the OS for reduced motion. */
  prefersReducedMotion: () => boolean;
  /** Calls back when the OS reduced-motion setting changes; returns an unsubscribe. Optional so tests can skip it. */
  watchReducedMotion?: (onChange: (reduce: boolean) => void) => () => void;
  /** Replaces the URL's query string without adding a history entry. Optional so tests can skip it. */
  replaceSearch?: (search: string) => void;
}

export function detectWebGL(doc: Document = document): boolean {
  try {
    const canvas = doc.createElement('canvas');
    const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    return context !== null;
  } catch {
    return false;
  }
}

export function prefersReducedMotion(win: Window = window): boolean {
  if (typeof win.matchMedia !== 'function') {
    return false;
  }
  return win.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Follows the OS reduced-motion setting while the page is open. */
export function watchReducedMotion(onChange: (reduce: boolean) => void, win: Window = window): () => void {
  if (typeof win.matchMedia !== 'function') return () => undefined;
  const query = win.matchMedia('(prefers-reduced-motion: reduce)');
  const listener = (event: MediaQueryListEvent) => {
    onChange(event.matches);
  };
  query.addEventListener('change', listener);
  return () => {
    query.removeEventListener('change', listener);
  };
}

export function browserEnvironment(): ShellEnvironment {
  return {
    search: window.location.search,
    detectWebGL: () => detectWebGL(),
    prefersReducedMotion: () => prefersReducedMotion(),
    watchReducedMotion: (onChange) => watchReducedMotion(onChange),
    replaceSearch: (search) => {
      replaceSearch(search);
    },
  };
}

/** Swaps the query string in place: switching scenarios should not fill Back with history. */
export function replaceSearch(search: string, win: Window = window): void {
  const { pathname, hash } = win.location;
  win.history.replaceState(win.history.state, '', `${pathname}${search}${hash}`);
}
