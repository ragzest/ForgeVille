import { useEffect, useRef, useState } from 'react';
import { useNavigation } from '../../store/navigation.ts';
import { floorById, floorTitle } from '../../world/building.ts';

/** How long the arrival banner stays up after the elevator stops. */
export const BANNER_MS = 2200;

/**
 * "Floor 2 · Greenhouse" for a moment after changing floors. Not shown on the
 * first load. Reduced motion keeps it still; the CSS handles the fade.
 */
export function FloorBanner() {
  const floorId = useNavigation((s) => s.floor);
  const first = useRef<string>(floorId);
  const [shown, setShown] = useState<string | null>(null);

  useEffect(() => {
    if (floorId === first.current) return;
    first.current = '';
    setShown(floorId);
    const timer = window.setTimeout(() => {
      setShown(null);
    }, BANNER_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [floorId]);

  if (shown !== floorId) return null;
  const floor = floorById(floorId);
  return (
    <div key={floorId} className="floor-banner" role="status">
      <span className="floor-banner-level">{floor.level}</span>
      <span>
        <strong>{floorTitle(floor)}</strong>
        <span className="floor-banner-tagline">{floor.theme.tagline}</span>
      </span>
    </div>
  );
}
