import { useState } from 'react';
import { COLUMN_LABELS } from '../../domain/index.ts';
import { useInteraction } from '../../store/interaction.ts';
import { useWorkflow } from '../../store/context.ts';
import { CHECK_STATUS, focusPullRequest } from '../../world/screens/qa.ts';
import { clockTime } from '../desks/deskDetails.ts';
import { REVIEW_TEXT, pullRequestDetail } from './prDetail.ts';

const ACTIONS_REASON = 'Merge and request changes arrive with S07-02.';

/** A status as icon and word, coloured by tone; never colour alone. */
function Status({ icon, text, tone }: { icon: string; text: string; tone: string }) {
  return (
    <span className={`qa-status qa-status--${tone}`}>
      <span aria-hidden="true">{icon}</span> {text}
    </span>
  );
}

/**
 * The QA screen, readable: one pull request's branches, checks, run timeline,
 * findings, and what the merge policy would say. Opens on the same pull
 * request the wall screen shows.
 */
export function PullRequestPanel({ title }: { title: string }) {
  const snapshot = useWorkflow((s) => s.snapshot);
  const close = useInteraction((s) => s.close);
  const [chosen, setChosen] = useState<string | null>(null);
  const prs = [...snapshot.pullRequests].sort((a, b) => b.number - a.number);
  const prId = chosen ?? focusPullRequest(snapshot)?.id ?? null;
  const detail = prId ? pullRequestDetail(snapshot, prId) : null;

  return (
    <section className="panel pr-panel" role="dialog" aria-modal="false" aria-labelledby="interaction-panel-title">
      <header className="panel-header">
        <h2 id="interaction-panel-title">{title}</h2>
        <button type="button" className="panel-close" onClick={close} aria-label="Close panel">
          ×
        </button>
      </header>

      {prs.length > 1 && (
        <div className="desk-actions" role="group" aria-label="Pull requests">
          {prs.map((pr) => (
            <button
              key={pr.id}
              type="button"
              className="is-quiet"
              aria-pressed={pr.id === prId}
              onClick={() => {
                setChosen(pr.id);
              }}
            >
              #{pr.number} · {pr.state}
            </button>
          ))}
        </div>
      )}

      {!detail ? (
        <p className="panel-note">No pull requests yet. The QA lab is quiet.</p>
      ) : (
        <PullRequestBody detail={detail} />
      )}
      <p className="panel-note">
        Simulated pull request; no real repository or browser is involved. Press <kbd>Esc</kbd> to close.
      </p>
    </section>
  );
}

function PullRequestBody({ detail }: { detail: NonNullable<ReturnType<typeof pullRequestDetail>> }) {
  const { pullRequest: pr, task, merge } = detail;
  const review = REVIEW_TEXT[detail.reviewStatus];
  const reviewTone = detail.reviewStatus === 'approved' ? 'success' : detail.reviewStatus === 'changes_requested' ? 'danger' : 'muted';

  return (
    <>
      <h3 className="pr-title">
        <span className="pr-number">#{pr.number}</span> {pr.title}
      </h3>
      <dl className="desk-facts">
        <dt>State</dt>
        <dd>{pr.state === 'open' ? 'Open' : pr.state === 'merged' ? 'Merged' : 'Closed'}</dd>
        <dt>Branches</dt>
        <dd>
          <code>{pr.sourceBranch}</code> → <code>{pr.baseBranch}</code>
        </dd>
        <dt>Author</dt>
        <dd>{detail.author}</dd>
        <dt>Reviewer</dt>
        <dd>{detail.reviewer}</dd>
        <dt>Review</dt>
        <dd>
          <Status icon={review.icon} text={review.text} tone={reviewTone} />
        </dd>
        <dt>Task</dt>
        <dd>{task ? `${task.issueKey} · ${COLUMN_LABELS[task.column]}` : 'Missing'}</dd>
      </dl>

      <h4 className="pr-subheading">Checks</h4>
      <ul className="pr-checks" aria-label="Checks">
        {detail.checks.map((row) => {
          const s = CHECK_STATUS[row.status];
          return (
            <li key={row.check}>
              <span>{row.label}</span>
              <Status icon={s.icon} text={s.text} tone={row.status} />
            </li>
          );
        })}
      </ul>

      <h4 className="pr-subheading">Test-run timeline</h4>
      {detail.timeline.length === 0 ? (
        <p className="panel-note">No checks have run yet.</p>
      ) : (
        <ol className="pr-timeline" aria-label="Test-run timeline">
          {detail.timeline.map((run) => {
            const s = CHECK_STATUS[run.status];
            return (
              <li key={run.id} className={`pr-run pr-run--${run.status}`}>
                <time dateTime={run.startedAt}>{clockTime(run.startedAt)}</time>
                <span className="pr-run-body">
                  <strong>{run.label}</strong> <Status icon={s.icon} text={s.text} tone={run.status} />
                  {run.finishedAt && <span className="two-d-muted"> · finished {clockTime(run.finishedAt)}</span>}
                  <span className="pr-run-summary">{run.summary}</span>
                  {run.failureReason && <span className="pr-run-failure">Why it failed: {run.failureReason}</span>}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <h4 className="pr-subheading">Review findings</h4>
      {detail.findings.length === 0 ? (
        <p className="panel-note">No findings.</p>
      ) : (
        <ul className="pr-findings" aria-label="Review findings">
          {detail.findings.map((f) => (
            <li key={f.id}>
              <Status
                icon={f.severity === 'blocking' ? '⛔' : '💬'}
                text={f.severity === 'blocking' ? 'Blocking' : 'Non-blocking'}
                tone={f.severity === 'blocking' ? 'danger' : 'muted'}
              />{' '}
              {f.message} <span className="two-d-muted">· {f.resolved ? 'resolved' : 'open'}</span>
            </li>
          ))}
        </ul>
      )}

      <h4 className="pr-subheading">Screenshots</h4>
      <div className="pr-shots">
        {['Desktop', 'Phone'].map((size) => (
          <figure key={size} className="pr-shot">
            <div className="pr-shot-frame" aria-hidden="true" />
            <figcaption>
              Simulated screenshot · {task?.issueKey ?? `#${String(pr.number)}`} · {size}
            </figcaption>
          </figure>
        ))}
      </div>

      <h4 className="pr-subheading">Merge</h4>
      {merge.eligible ? (
        <p className="desk-feedback">
          <span aria-hidden="true">✓</span> The merge policy would allow this merge.
        </p>
      ) : (
        <div className="desk-feedback is-refused">
          <p className="pr-blocked-heading">Merge is blocked:</p>
          <ul className="pr-reasons" aria-label="Merge blocked because">
            {merge.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="desk-actions" role="group" aria-label="Pull-request actions">
        <button type="button" disabled aria-describedby="pr-actions-reason">
          Merge
        </button>
        <button type="button" disabled aria-describedby="pr-actions-reason">
          Request changes
        </button>
      </div>
      <p className="panel-note" id="pr-actions-reason">
        {ACTIONS_REASON}
      </p>
    </>
  );
}
