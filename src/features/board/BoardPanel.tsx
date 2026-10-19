import type { CSSProperties } from 'react';
import { COLUMN_LABELS } from '../../domain/index.ts';
import { useInteraction } from '../../store/interaction.ts';
import { useNavigation } from '../../store/navigation.ts';
import { useWorkflow } from '../../store/context.ts';
import { COLUMN_NOTE, PRIORITY_LABELS, floorBoard } from '../../world/screens/board.ts';
import { boardFloor } from './openBoard.ts';

/**
 * The whiteboard, readable: every column and card from the same `floorBoard`
 * view model the wall paints, with the wall's colours. Selecting a card shows
 * a read-only detail; moves arrive with S06-02.
 */
export function BoardPanel({ title }: { title: string }) {
  const snapshot = useWorkflow((s) => s.snapshot);
  const floorId = useNavigation((s) => s.floor);
  const selectedTaskId = useNavigation((s) => s.selectedTaskId);
  const selectTask = useNavigation((s) => s.selectTask);
  const close = useInteraction((s) => s.close);
  const board = floorBoard(snapshot, boardFloor(snapshot, floorId));
  const selected = snapshot.tasks.find((t) => t.id === selectedTaskId) ?? null;
  const name = (id: string | null) => snapshot.agents.find((a) => a.id === id)?.name ?? 'Unassigned';

  return (
    <section className="panel board-panel" role="dialog" aria-modal="false" aria-labelledby="interaction-panel-title">
      <header className="panel-header">
        <h2 id="interaction-panel-title">{title}</h2>
        <button type="button" className="panel-close" onClick={close} aria-label="Close panel">
          ×
        </button>
      </header>
      <p className="panel-note">
        {board.heading}. Simulated tasks; pick a card for details. Press <kbd>Esc</kbd> to close.
      </p>

      <div className="board-columns">
        {board.columns.map((col) => {
          const colors = COLUMN_NOTE[col.column];
          const headingId = `board-col-${col.column}`;
          return (
            <section
              key={col.column}
              className="board-column"
              aria-labelledby={headingId}
              style={{ '--chip': colors.chip, '--note': colors.note } as CSSProperties}
            >
              <h3 id={headingId} className="board-chip">
                {col.label} <span className="board-count">· {col.cards.length}</span>
              </h3>
              {col.cards.length === 0 ? (
                <p className="board-empty">No tasks in {col.label}.</p>
              ) : (
                <ul className="board-cards">
                  {col.cards.map((card) => (
                    <li key={card.taskId}>
                      <button
                        type="button"
                        className="board-note"
                        aria-pressed={selectedTaskId === card.taskId}
                        onClick={() => {
                          selectTask(selectedTaskId === card.taskId ? null : card.taskId);
                        }}
                      >
                        <span className="board-note-key">{card.issueKey}</span>
                        <span className="board-note-title">{card.title}</span>
                        <span className="board-note-meta">{card.assignee}</span>
                        <span className="board-note-meta">
                          <span className={`board-priority board-priority--${card.priority}`}>{PRIORITY_LABELS[card.priority]}</span> ·{' '}
                          {card.status}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {selected && (
        <section className="board-detail" aria-labelledby="board-detail-heading">
          <h3 id="board-detail-heading">
            {selected.issueKey} · {selected.title}
          </h3>
          <dl className="desk-facts">
            <dt>Column</dt>
            <dd>{COLUMN_LABELS[selected.column]}</dd>
            <dt>Assignee</dt>
            <dd>{name(selected.assigneeId)}</dd>
            <dt>Priority</dt>
            <dd>{PRIORITY_LABELS[selected.priority]}</dd>
            <dt>Branch</dt>
            <dd>{selected.branch ? <code>{selected.branch}</code> : '—'}</dd>
            <dt>Depends on</dt>
            <dd>
              {selected.dependsOn.length === 0
                ? 'Nothing'
                : selected.dependsOn.map((id) => snapshot.tasks.find((t) => t.id === id)?.issueKey ?? id).join(', ')}
            </dd>
          </dl>
          <p className="panel-note">Read-only for now. Simulated moves arrive with S06-02.</p>
        </section>
      )}
    </section>
  );
}
