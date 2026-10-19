import { useState } from 'react';
import { COLUMN_LABELS, type TaskColumn } from '../../domain/index.ts';
import { useWorkflow } from '../../store/context.ts';
import { PRIORITY_LABELS } from '../../world/screens/board.ts';
import { moveOptions } from './moves.ts';

/**
 * One task, in full, with the moves the domain allows. Legal moves are
 * buttons; illegal ones can still be tried, and come back refused with the
 * domain's reason. Every move goes through the workflow port.
 */
export function TaskDetail({ taskId }: { taskId: string }) {
  const snapshot = useWorkflow((s) => s.snapshot);
  const moveTask = useWorkflow((s) => s.moveTask);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const task = snapshot.tasks.find((t) => t.id === taskId);
  if (!task) return null;

  const name = (id: string | null) => snapshot.agents.find((a) => a.id === id)?.name ?? 'Unassigned';
  const pr = snapshot.pullRequests.find((p) => p.id === task.pullRequestId) ?? null;
  const options = moveOptions(snapshot, task.id);
  const legal = options.filter((o) => o.legal);
  const illegal = options.filter((o) => !o.legal);

  const move = (to: TaskColumn) => {
    const result = moveTask(task.id, to);
    setFeedback(
      result.ok
        ? { ok: true, text: result.snapshot.events.at(-1)?.message ?? 'Moved.' }
        : { ok: false, text: result.reason },
    );
  };

  return (
    <section className="board-detail" aria-labelledby="board-detail-heading">
      <h3 id="board-detail-heading">
        {task.issueKey} · {task.title}
      </h3>
      <p className="board-detail-description">{task.description || 'No description.'}</p>
      <dl className="desk-facts">
        <dt>Column</dt>
        <dd>
          {COLUMN_LABELS[task.column]}
          {task.blockedFrom ? ` (from ${COLUMN_LABELS[task.blockedFrom]})` : ''}
        </dd>
        <dt>Assignee</dt>
        <dd>{name(task.assigneeId)}</dd>
        <dt>Priority</dt>
        <dd>{PRIORITY_LABELS[task.priority]}</dd>
        <dt>Branch</dt>
        <dd>{task.branch ? <code>{task.branch}</code> : '—'}</dd>
        <dt>Pull request</dt>
        <dd>{pr ? `#${String(pr.number)} · ${pr.title} (${pr.state})` : 'None yet'}</dd>
        <dt>Depends on</dt>
        <dd>
          {task.dependsOn.length === 0 ? (
            'Nothing'
          ) : (
            <ul className="board-deps">
              {task.dependsOn.map((id) => {
                const dep = snapshot.tasks.find((t) => t.id === id);
                if (!dep) return <li key={id}>{id} (missing)</li>;
                return (
                  <li key={id}>
                    <strong>{dep.issueKey}</strong> {dep.title} · {COLUMN_LABELS[dep.column]}
                    {dep.column === 'merged' ? ' ✓' : ' (not merged yet)'}
                  </li>
                );
              })}
            </ul>
          )}
        </dd>
      </dl>

      <h4 className="board-moves-heading">Simulate a move</h4>
      {legal.length === 0 ? (
        <p className="panel-note">No moves are open to {task.issueKey} from {COLUMN_LABELS[task.column]} on the board.</p>
      ) : (
        <div className="desk-actions" role="group" aria-label="Legal moves">
          {legal.map((o) => (
            <button
              key={o.to}
              type="button"
              onClick={() => {
                move(o.to);
              }}
            >
              Move to {o.label}
            </button>
          ))}
        </div>
      )}
      <details className="board-illegal">
        <summary>Try a move the rules refuse</summary>
        <p className="panel-note">These go to the workflow too, and come back with the reason.</p>
        <div className="desk-actions" role="group" aria-label="Refused moves">
          {illegal.map((o) => (
            <button
              key={o.to}
              type="button"
              className="is-quiet"
              onClick={() => {
                move(o.to);
              }}
            >
              Try {o.label}
            </button>
          ))}
        </div>
      </details>

      {feedback && (
        <p className={feedback.ok ? 'desk-feedback' : 'desk-feedback is-refused'} role={feedback.ok ? 'status' : 'alert'}>
          <span aria-hidden="true">{feedback.ok ? '✓' : '✕'}</span> {feedback.ok ? feedback.text : `Not moved: ${feedback.text}`}
        </p>
      )}
    </section>
  );
}
