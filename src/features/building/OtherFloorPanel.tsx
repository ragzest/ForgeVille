import { useInteraction } from '../../store/interaction.ts';
import { useNavigation } from '../../store/navigation.ts';
import { useWorkflow } from '../../store/context.ts';
import { floorById, floorOfAgent, floorTitle } from '../../world/building.ts';
import { deskLabel } from '../../world/interaction.ts';
import { deskId } from '../desks/deskDetails.ts';

/**
 * Shown instead of a desk panel when the agent works on another floor: the
 * visitor is not in that room, so the panel offers the ride rather than
 * pretending they are. Going there opens the desk on arrival.
 */
export function OtherFloorPanel({ agentId }: { agentId: string }) {
  const snapshot = useWorkflow((s) => s.snapshot);
  const current = floorById(useNavigation((s) => s.floor));
  const goToFloor = useNavigation((s) => s.goToFloor);
  const close = useInteraction((s) => s.close);
  const activate = useInteraction((s) => s.activate);
  const agent = snapshot.agents.find((a) => a.id === agentId);
  const floor = floorOfAgent(snapshot, agentId);
  const name = agent?.name ?? agentId;
  const project = snapshot.projects.find((p) => p.id === agent?.projectId)?.name;

  return (
    <section className="panel" role="dialog" aria-modal="false" aria-labelledby="interaction-panel-title">
      <header className="panel-header">
        <h2 id="interaction-panel-title">{deskLabel(name)}</h2>
        <button type="button" className="panel-close" onClick={close} aria-label="Close panel">
          ×
        </button>
      </header>
      {floor && (
        <>
          <p>
            {name} works on <strong>{floorTitle(floor)}</strong>
            {project ? ` with the ${project} team` : ''}. You are on {floorTitle(current)}.
          </p>
          <div className="desk-actions">
            <button
              type="button"
              className="btn"
              onClick={() => {
                goToFloor(floor.id);
                activate({ id: deskId(agentId), label: deskLabel(name) });
              }}
            >
              Go to floor {floor.level}
            </button>
          </div>
        </>
      )}
      <p className="panel-note">
        Press <kbd>Esc</kbd> to close.
      </p>
    </section>
  );
}
