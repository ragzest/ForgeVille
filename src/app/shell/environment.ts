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

export function browserEnvironment(): ShellEnvironment {
  return {
    search: window.location.search,
    detectWebGL: () => detectWebGL(),
    prefersReducedMotion: () => prefersReducedMotion(),
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
