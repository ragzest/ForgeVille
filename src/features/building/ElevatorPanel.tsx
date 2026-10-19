import { useInteraction } from '../../store/interaction.ts';
import { useNavigation } from '../../store/navigation.ts';
import { useWorkflow } from '../../store/context.ts';
import { buildingDirectory, floorSummary, floorSummaryText, floorTitle } from '../../world/building.ts';

/**
 * The elevator: every floor, its theme, who works there, and a live summary
 * of each team. Riding keeps the visitor's spot in the floor plan. Vacant
 * floors are open to visit.
 */
export function ElevatorPanel({ title }: { title: string }) {
  const snapshot = useWorkflow((s) => s.snapshot);
  const current = useNavigation((s) => s.floor);
  const goToFloor = useNavigation((s) => s.goToFloor);
  const close = useInteraction((s) => s.close);
  // Top floor first, like a real elevator panel.
  const floors = [...buildingDirectory(snapshot)].reverse();

  return (
    <section className="panel elevator-panel" role="dialog" aria-modal="false" aria-labelledby="interaction-panel-title">
      <header className="panel-header">
        <h2 id="interaction-panel-title">{title}</h2>
        <button type="button" className="panel-close" onClick={close} aria-label="Close panel">
          ×
        </button>
      </header>
      <p className="panel-note">Each floor has its own look. Projects move in from the ground floor up.</p>
      <ol className="elevator-floors" aria-label="Floors">
        {floors.map(({ floor, project }) => {
          const here = floor.id === current;
          const summary = floorSummary(snapshot, floor.id);
          return (
            <li key={floor.id} className="elevator-floor" style={{ '--floor-accent': floor.theme.accent } as React.CSSProperties}>
              <span className="elevator-level" aria-hidden="true">
                {floor.level}
              </span>
              <span className="elevator-copy">
                <strong>{floor.theme.name}</strong>
                <span className="two-d-muted">{floor.theme.tagline}</span>
                <span className={project ? 'elevator-occupant' : 'elevator-occupant is-vacant'}>
                  {project ? `${project.name} team` : 'Vacant'}
                </span>
                {summary && (
                  <span className={summary.blockedTasks > 0 ? 'elevator-summary is-blocked' : 'elevator-summary'} data-floor-summary={floor.id}>
                    {floorSummaryText(summary)}
                  </span>
                )}
              </span>
              <button
                type="button"
                className="btn"
                disabled={here}
                aria-label={here ? `${floorTitle(floor)}, you are here` : `Go to ${floorTitle(floor)}`}
                onClick={() => {
                  close();
                  goToFloor(floor.id);
                }}
              >
                {here ? 'You are here' : 'Go'}
              </button>
            </li>
          );
        })}
      </ol>
      <p className="panel-note">
        Press <kbd>Esc</kbd> to close.
      </p>
    </section>
  );
}
