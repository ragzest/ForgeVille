import { useNavigation, type OfficeView } from '../../store/navigation.ts';
import { TRAVEL_ZONES, zoneById } from '../../world/layout.ts';

interface Props {
  /** Whether the 3D office can run. Without WebGL only the 2D view is offered. */
  webgl: boolean;
}

const VIEWS: readonly { view: OfficeView; label: string }[] = [
  { view: 'walk', label: 'Walk' },
  { view: 'overview', label: 'Overview' },
  { view: '2d', label: '2D view' },
];

/**
 * View switch and zone jumps. Plain buttons, so keyboard users can reach every
 * control without pointer lock. Wraps onto several lines on narrow screens.
 */
export function NavigationToolbar({ webgl }: Props) {
  const view = useNavigation((s) => s.view);
  const selectedZone = useNavigation((s) => s.selectedZone);
  const setView = useNavigation((s) => s.setView);
  const travelTo = useNavigation((s) => s.travelTo);
  const selectZone = useNavigation((s) => s.selectZone);

  return (
    <nav className="nav-toolbar" aria-label="Office navigation">
      {webgl && (
        <div className="nav-group" role="group" aria-label="View">
          {VIEWS.map(({ view: v, label }) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => { setView(v); }}>
              {label}
            </button>
          ))}
        </div>
      )}
      <div className="nav-group" role="group" aria-label={webgl && view !== '2d' ? 'Go to zone' : 'Select zone'}>
        {TRAVEL_ZONES.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={selectedZone === id}
            // In 3D the button walks you there; in the 2D view it highlights the zone.
            onClick={() => {
              if (webgl && view !== '2d') travelTo(id);
              else selectZone(id);
            }}
          >
            {zoneById(id).label}
          </button>
        ))}
      </div>
    </nav>
  );
}
