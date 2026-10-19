import { COLUMN_LABELS, TASK_COLUMNS, presenceOf } from '../../domain/index.ts';
import { useNavigation } from '../../store/navigation.ts';
import { useWorkflow } from '../../store/context.ts';
import { TRAVEL_ZONES, zoneById, type ZoneId } from '../../world/layout.ts';
import { interactionStore, useInteraction } from '../../store/interaction.ts';
import { deskLabel } from '../../world/interaction.ts';
import { PresenceBadge } from '../PresenceBadge.tsx';
import { deskId } from '../desks/deskDetails.ts';

const ZONE_NOTES: Readonly<Record<ZoneId, string>> = {
  reception: 'Project plaque and front desk.',
  desks: 'One desk per agent.',
  qa: 'QA screen and test stations.',
  board: 'Kanban board with every task.',
  status: 'Project status display.',
  meeting: 'Round table for six.',
  greenery: 'Plants and windows.',
};

/**
 * The office without 3D: zones, the team, and a read-only task list, all from
 * the same snapshot as the 3D office. Used when WebGL fails or the user picks it.
 */
export function TwoDView() {
  const snapshot = useWorkflow((s) => s.snapshot);
  const selectedZone = useNavigation((s) => s.selectedZone);
  const selectZone = useNavigation((s) => s.selectZone);
  const selectedTaskId = useNavigation((s) => s.selectedTaskId);
  const openId = useInteraction((s) => s.open?.id ?? null);

  const agentName = (id: string | null) => snapshot.agents.find((a) => a.id === id)?.name ?? 'Unassigned';

  return (
    <div className="two-d">
      <section className="shell-region" aria-labelledby="two-d-zones-heading">
        <h2 id="two-d-zones-heading">Zones</h2>
        <ul className="two-d-list">
          {TRAVEL_ZONES.map((id) => (
            <li key={id}>
              <button type="button" className="zone-button" aria-pressed={selectedZone === id} onClick={() => { selectZone(id); }}>
                {zoneById(id).label}
              </button>
              <span className="two-d-muted">{ZONE_NOTES[id]}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="shell-region" aria-labelledby="fallback-team-heading">
        <h2 id="fallback-team-heading">Team</h2>
        <ul className="two-d-list">
          {snapshot.agents.map((agent) => {
            const id = deskId(agent.id);
            const label = deskLabel(agent.name);
            return (
              <li key={agent.id} className={selectedZone === 'desks' ? 'is-highlighted' : undefined}>
                <strong>{agent.name}</strong> <span className="two-d-muted">{agent.role}</span>
                <PresenceBadge presence={presenceOf(snapshot, agent.id)} />
                <button
                  type="button"
                  className="zone-button"
                  aria-pressed={openId === id}
                  aria-label={`Open ${label}`}
                  onClick={() => {
                    interactionStore.getState().activate({ id, label });
                  }}
                >
                  Open desk
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="shell-region" aria-labelledby="fallback-board-heading">
        <h2 id="fallback-board-heading">Board</h2>
        <p className="two-d-muted">Read-only until the board stories (E06).</p>
        {TASK_COLUMNS.map((column) => {
          const tasks = snapshot.tasks.filter((t) => t.column === column);
          return (
            <div key={column} className={selectedZone === 'board' ? 'two-d-column is-highlighted' : 'two-d-column'}>
              <h3>
                {COLUMN_LABELS[column]} <span className="two-d-muted">({tasks.length})</span>
              </h3>
              {tasks.length === 0 ? (
                <p className="two-d-muted">No tasks.</p>
              ) : (
                <ul className="two-d-list">
                  {tasks.map((t) => (
                    <li key={t.id} className={selectedTaskId === t.id ? 'is-selected' : undefined}>
                      <strong>{t.issueKey}</strong> {t.title} <span className="two-d-muted">· {agentName(t.assigneeId)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
