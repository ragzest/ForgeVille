import { useEffect, useState } from 'react';

/**
 * Tells the player how to move and how to get the mouse back. Re-renders only
 * when pointer lock changes, never while the player moves.
 */
export function ControlHint() {
  const [locked, setLocked] = useState(() => document.pointerLockElement !== null);

  useEffect(() => {
    const onChange = () => {
      setLocked(document.pointerLockElement !== null);
    };
    document.addEventListener('pointerlockchange', onChange);
    return () => {
      document.removeEventListener('pointerlockchange', onChange);
    };
  }, []);

  return (
    <div className="control-hint" aria-live="polite">
      {locked ? (
        <p>
          <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> or arrows to move · <kbd>Shift</kbd> to run · <kbd>Esc</kbd>{' '}
          to release the mouse
        </p>
      ) : (
        <p>
          Click the office to look around · <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> or arrows to move ·{' '}
          <kbd>Shift</kbd> to run
        </p>
      )}
    </div>
  );
}
