import type { CSSProperties } from 'react';
import { useInteraction } from '../../store/interaction.ts';
import { useNavigation } from '../../store/navigation.ts';
import { useWorkflow } from '../../store/context.ts';
import { COLUMN_NOTE, PRIORITY_LABELS, floorBoard } from '../../world/screens/board.ts';
import { boardFloor } from './openBoard.ts';
import { TaskDetail } from './TaskDetail.tsx';

/**
 * The whiteboard, readable: every column and card from the same `floorBoard`
 * view model the wall paints, with the wall's colours. Selecting a card shows
 * its detail and the moves the domain allows.
 */
export function BoardPanel({ title }: { title: string }) {
  const snapshot = useWorkflow((s) => s.snapshot);
  const floorId = useNavigation((s) => s.floor);
  const selectedTaskId = useNavigation((s) => s.selectedTaskId);
  const selectTask = useNavigation((s) => s.selectTask);
  const close = useInteraction((s) => s.close);
  const board = floorBoard(snapshot, boardFloor(snapshot, floorId));
  const selected = snapshot.tasks.find((t) => t.id === selectedTaskId) ?? null;

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

      {selected && <TaskDetail key={selected.id} taskId={selected.id} />}
    </section>
  );
}
