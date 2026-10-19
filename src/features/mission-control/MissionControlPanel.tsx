import { useEffect, useMemo, useState } from 'react';
import { useInteraction } from '../../store/interaction.ts';
import { useWorkflow } from '../../store/context.ts';
import { interactionStore } from '../../store/interaction.ts';
import { useNavigation } from '../../store/navigation.ts';
import { deskLabel } from '../../world/interaction.ts';
import { deskId } from '../desks/deskDetails.ts';
import { missionControlView } from './missionControl.ts';

/** Below this width the overlay starts as a one-line summary button. */
export const NARROW_QUERY = '(max-width: 640px)';

function matches(query: string): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
}

function useMediaQuery(query: string): boolean {
  const [match, setMatch] = useState(() => matches(query));
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const list = window.matchMedia(query);
    const update = () => {
      setMatch(list.matches);
    };
    update();
    list.addEventListener('change', update);
    return () => {
      list.removeEventListener('change', update);
    };
  }, [query]);
  return match;
}

/**
 * Mission control: the company at a glance. The current floor's four status
 * numbers, the building's eight totals from `missionControlMetrics`, and the
 * newest events from every floor, opened from the project status display.
 * Nothing here is counted by the component itself.
 */
export function MissionControlPanel() {
  const snapshot = useWorkflow((s) => s.snapshot);
  const close = useInteraction((s) => s.close);
  const floorId = useNavigation((s) => s.floor);
  const view = useMemo(() => missionControlView(snapshot, floorId), [snapshot, floorId]);
  const narrow = useMediaQuery(NARROW_QUERY);
  const [expanded, setExpanded] = useState(false);
  const showBody = !narrow || expanded;

  return (
    <section className="panel mission-panel" role="dialog" aria-modal="false" aria-labelledby="interaction-panel-title">
      <header className="panel-header">
        <h2 id="interaction-panel-title">Mission control</h2>
        <button type="button" className="panel-close" onClick={close} aria-label="Close panel">
          ×
        </button>
      </header>

      {narrow && (
        <button
          type="button"
          className="mission-summary"
          aria-expanded={expanded}
          aria-controls="mission-body"
          onClick={() => {
            setExpanded((on) => !on);
          }}
        >
          <span>{view.summary}</span>
          <span className="mission-summary-toggle">{expanded ? 'Hide details' : 'Show details'}</span>
        </button>
      )}

      {showBody && (
        <div id="mission-body">
          <p className="panel-note mission-sub">
            <span className="sim-tag">Simulated</span> Counted from the same snapshot as the board, desks, and QA lab.
          </p>
          <section className="mission-section" aria-labelledby="mission-floor-heading">
            <h3 id="mission-floor-heading" className="pr-subheading">
              This floor <span className="mission-section-note">· {view.floor.title}</span>
            </h3>
            {view.floor.occupied ? (
              <>
                <p className="panel-note">The same four numbers as this floor&rsquo;s status display.</p>
                <ul className="mission-tiles" aria-label="This floor">
                  {view.floor.tiles.map((tile) => (
                    <li key={tile.label} className={`mission-tile mission-tile--${tile.tone}`} data-floor-metric={tile.label}>
                      <span className="mission-tile-label">{tile.label}</span>
                      <span className="mission-tile-value">{tile.value}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="panel-note">Nobody works on this floor yet.</p>
            )}
          </section>

          <h3 id="mission-building-heading" className="pr-subheading">
            Building <span className="mission-section-note">· all floors</span>
          </h3>
          <ul className="mission-tiles" aria-label="Building metrics">
            {view.tiles.map((tile) => (
              <li key={tile.key} className={`mission-tile mission-tile--${tile.tone}`} data-metric={tile.key}>
                <span className="mission-tile-label">{tile.label}</span>
                <span className="mission-tile-value">
                  <span className="mission-tile-icon" aria-hidden="true">
                    {tile.icon}
                  </span>
                  {tile.value}
                </span>
                <span className="mission-tile-note">{tile.note}</span>
              </li>
            ))}
          </ul>

          <h3 className="pr-subheading">Recent events</h3>
          {view.events.length === 0 ? (
            <p className="panel-note">No events yet. The office is quiet.</p>
          ) : (
            <ol className="mission-events" aria-label="Recent events">
              {view.events.map((event) => (
                <li key={event.id} className={event.flag ? `is-${event.flag.tone}` : undefined}>
                  <time dateTime={event.timestamp}>{event.time}</time>
                  <span>
                    {event.flag && (
                      <span className={`mission-flag mission-flag--${event.flag.tone}`}>
                        <span aria-hidden="true">{event.flag.icon}</span> {event.flag.text}
                      </span>
                    )}
                    {event.flag ? ` ${event.message}` : event.message}
                  </span>
                  {event.agent && (
                    <button
                      type="button"
                      className="mission-event-desk is-quiet"
                      aria-label={`Open ${deskLabel(event.agent.name)}`}
                      onClick={() => {
                        if (!event.agent) return;
                        interactionStore.getState().activate({ id: deskId(event.agent.id), label: deskLabel(event.agent.name) });
                      }}
                    >
                      Desk
                    </button>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
      <p className="panel-note">
        Read-only. Press <kbd>Esc</kbd> to close.
      </p>
    </section>
  );
}
