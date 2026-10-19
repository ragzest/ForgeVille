import { presenceOf } from '../../domain/index.ts';
import { useNavigation } from '../../store/navigation.ts';
import { useWorkflow } from '../../store/context.ts';
import { TRAVEL_ZONES, zoneById, type ZoneId } from '../../world/layout.ts';
import { interactionStore, useInteraction } from '../../store/interaction.ts';
import { deskLabel } from '../../world/interaction.ts';
import { PresenceBadge } from '../PresenceBadge.tsx';
import { BOARD_TARGET, boardFloor, openBoard } from '../board/openBoard.ts';
import { PRIORITY_LABELS, floorBoard } from '../../world/screens/board.ts';
import { deskId } from '../desks/deskDetails.ts';
import { buildingDirectory, floorById, floorTitle } from '../../world/building.ts';

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
  const floorId = useNavigation((s) => s.floor);
  const goToFloor = useNavigation((s) => s.goToFloor);
  const home = buildingDirectory(snapshot).find((o) => o.project !== null);
  const vacant = home !== undefined && home.floor.id !== floorId;

  const board = floorBoard(snapshot, boardFloor(snapshot, floorId));

  return (
    <div className="two-d">
      {vacant && (
        <div className="shell-panel shell-panel--notice two-d-vacant" role="status">
          <p>
            <strong>{floorTitle(floorById(floorId))}</strong> is vacant. The {home.project?.name} team works on{' '}
            {floorTitle(home.floor)}; the lists below are theirs.
          </p>
          <button
            type="button"
            className="btn"
            onClick={() => {
              goToFloor(home.floor.id);
            }}
          >
            Go to {floorTitle(home.floor)}
          </button>
        </div>
      )}
      <section className="shell-region" aria-labelledby="two-d-zones-heading">
        <h2 id="two-d-zones-heading">Zones</h2>
        <ul className="two-d-list">
          {TRAVEL_ZONES.map((id) => (
            <li key={id}>
              <button
                type="button"
                className="zone-button"
                aria-pressed={selectedZone === id}
                onClick={() => {
                  selectZone(id);
                  if (id === 'board') openBoard();
                }}
              >
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
        <p className="two-d-muted">The same cards as the whiteboard.</p>
        <button type="button" className="btn" aria-pressed={openId === BOARD_TARGET.id} onClick={openBoard}>
          Open board
        </button>
        {board.columns.map((col) => (
          <div key={col.column} className={selectedZone === 'board' ? 'two-d-column is-highlighted' : 'two-d-column'}>
            <h3>
              {col.label} <span className="two-d-muted">({col.cards.length})</span>
            </h3>
            {col.cards.length === 0 ? (
              <p className="two-d-muted">No tasks in {col.label}.</p>
            ) : (
              <ul className="two-d-list">
                {col.cards.map((card) => (
                  <li key={card.taskId} className={selectedTaskId === card.taskId ? 'is-selected' : undefined}>
                    <strong>{card.issueKey}</strong> {card.title}{' '}
                    <span className="two-d-muted">
                      · {card.assignee} · {PRIORITY_LABELS[card.priority]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
