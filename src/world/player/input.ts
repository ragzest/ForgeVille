/**
 * Keyboard input for the player. Pure helpers plus a small listener that keeps
 * the set of held movement keys outside React.
 */

/** True when keys belong to the focused element (a text field or a panel that captures keys), not to the player. */
export function isKeyCaptureTarget(element: Element | null): boolean {
  if (!element) return false;
  const tag = element.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (element instanceof HTMLElement && element.isContentEditable) return true;
  return element.closest('[data-captures-keys]') !== null;
}

export type MoveKey = 'forward' | 'back' | 'left' | 'right' | 'run';

/** `KeyboardEvent.code` → movement intent. Codes follow physical position, so AZERTY users get the same layout. */
export const KEY_BINDINGS: Readonly<Record<string, MoveKey>> = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'back',
  ArrowDown: 'back',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  ShiftLeft: 'run',
  ShiftRight: 'run',
};

export interface MoveInput {
  /** -1..1, positive is forward. */
  readonly forward: number;
  /** -1..1, positive is right. */
  readonly strafe: number;
  readonly run: boolean;
}

export const NO_INPUT: MoveInput = { forward: 0, strafe: 0, run: false };

export function inputFromKeys(held: ReadonlySet<MoveKey>): MoveInput {
  const forward = (held.has('forward') ? 1 : 0) - (held.has('back') ? 1 : 0);
  const strafe = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0);
  return { forward, strafe, run: held.has('run') };
}

export interface KeyTracker {
  /** Current movement intent; empty while keys are captured elsewhere. */
  read(): MoveInput;
  dispose(): void;
}

/**
 * Listens on `target` (normally `window`) for movement keys. Keys pressed while
 * an input or `[data-captures-keys]` element has focus are ignored, and moving
 * focus into one drops any held keys.
 */
export function trackMovementKeys(target: Window, doc: Document = target.document): KeyTracker {
  const held = new Set<MoveKey>();
  // Keys pressed since the last read, so a tap shorter than one frame still moves the player.
  const tapped = new Set<MoveKey>();

  const onKeyDown = (e: KeyboardEvent) => {
    const key = KEY_BINDINGS[e.code];
    if (!key || isKeyCaptureTarget(doc.activeElement)) return;
    held.add(key);
    tapped.add(key);
    // Arrow keys would otherwise scroll the page.
    if (e.code.startsWith('Arrow')) e.preventDefault();
  };
  const onKeyUp = (e: KeyboardEvent) => {
    const key = KEY_BINDINGS[e.code];
    if (key) held.delete(key);
  };
  const clear = () => {
    held.clear();
    tapped.clear();
  };
  const onFocusIn = () => {
    if (isKeyCaptureTarget(doc.activeElement)) clear();
  };

  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);
  target.addEventListener('blur', clear);
  doc.addEventListener('focusin', onFocusIn);

  return {
    read: () => {
      if (isKeyCaptureTarget(doc.activeElement)) return NO_INPUT;
      const input = inputFromKeys(new Set([...held, ...tapped]));
      tapped.clear();
      return input;
    },
    dispose: () => {
      target.removeEventListener('keydown', onKeyDown);
      target.removeEventListener('keyup', onKeyUp);
      target.removeEventListener('blur', clear);
      doc.removeEventListener('focusin', onFocusIn);
    },
  };
}
