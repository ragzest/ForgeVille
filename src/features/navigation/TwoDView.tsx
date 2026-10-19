import { presenceOf } from '../../domain/index.ts';
import { useNavigation } from '../../store/navigation.ts';
import { useWorkflow } from '../../store/context.ts';
import { TRAVEL_ZONES, zoneById, type ZoneId } from '../../world/layout.ts';
import { interactionStore, useInteraction } from '../../store/interaction.ts';
import { deskLabel } from '../../world/interaction.ts';
import { PresenceBadge } from '../PresenceBadge.tsx';
import { BOARD_TARGET, boardFloor, openBoard } from '../board/openBoard.ts';
import { QA_TARGET, openQa } from '../qa/openQa.ts';
import { STATUS_TARGET, openMissionControl } from '../mission-control/missionControl.ts';
import { statusTiles } from '../../world/screens/displays.ts';
import { CHECK_STATUS, qaDisplay } from '../../world/screens/qa.ts';
import { EMPTY_COLUMN_COPY, PRIORITY_LABELS, floorBoard } from '../../world/screens/board.ts';
import { deskId } from '../desks/deskDetails.ts';
import { floorById, floorSnapshot, floorTitle, occupantOf } from '../../world/building.ts';

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
  // A vacant floor lists the first occupied floor's team, and says so.
  const listed = floorById(boardFloor(snapshot, floorId));
  const home = occupantOf(snapshot, listed.id);
  const vacant = home !== null && listed.id !== floorId;

  const here = floorSnapshot(snapshot, listed.id);
  const board = floorBoard(snapshot, listed.id);
  const qa = qaDisplay(here);
  const tiles = statusTiles(here);

  return (
    <div className="two-d">
      {vacant && (
        <div className="shell-panel shell-panel--notice two-d-vacant" role="status">
          <p>
            <strong>{floorTitle(floorById(floorId))}</strong> is vacant. The {home.name} team works on{' '}
            {floorTitle(listed)}; the lists below are theirs.
          </p>
          <button
            type="button"
            className="btn"
            onClick={() => {
              goToFloor(listed.id);
            }}
          >
            Go to {floorTitle(listed)}
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
                  if (id === 'qa') openQa();
                  if (id === 'status') openMissionControl();
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
        {home && (
          <p className="two-d-muted">
            {home.name} team · {floorTitle(listed)}
          </p>
        )}
        <ul className="two-d-list">
          {here.agents.map((agent) => {
            const id = deskId(agent.id);
            const label = deskLabel(agent.name);
            return (
              <li key={agent.id} className={selectedZone === 'desks' ? 'two-d-agent is-highlighted' : 'two-d-agent'}>
                <span>
                  <strong>{agent.name}</strong> <span className="two-d-muted">{agent.role}</span>
                </span>
                <PresenceBadge presence={presenceOf(here, agent.id)} />
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

      <section className="shell-region" aria-labelledby="two-d-qa-heading">
        <h2 id="two-d-qa-heading">QA lab</h2>
        <p className="two-d-muted">{qa.heading ?? 'No pull requests yet.'}</p>
        {qa.rows.length > 0 && (
          <ul className={selectedZone === 'qa' ? 'two-d-list is-highlighted' : 'two-d-list'}>
            {qa.rows.map((row) => (
              <li key={row.check}>
                {row.label}{' '}
                <span className={`qa-status qa-status--${row.status}`}>
                  <span aria-hidden="true">{CHECK_STATUS[row.status].icon}</span> {CHECK_STATUS[row.status].text}
                </span>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="btn" aria-pressed={openId === QA_TARGET.id} onClick={openQa}>
          Open QA screen
        </button>
      </section>

      <section className="shell-region" aria-labelledby="two-d-status-heading">
        <h2 id="two-d-status-heading">Project status</h2>
        <ul className={selectedZone === 'status' ? 'two-d-list is-highlighted' : 'two-d-list'}>
          {tiles.map((tile) => (
            <li key={tile.label}>
              {tile.label} <strong>{tile.value}</strong>
            </li>
          ))}
        </ul>
        <button type="button" className="btn" aria-pressed={openId === STATUS_TARGET.id} onClick={openMissionControl}>
          Open mission control
        </button>
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
              <p className="two-d-muted">{EMPTY_COLUMN_COPY[col.column]}</p>
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
