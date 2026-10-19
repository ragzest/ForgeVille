import { useState } from 'react';
import { mergeEligibilityFor } from '../../domain/index.ts';
import { COLUMN_LABELS } from '../../domain/index.ts';
import { useInteraction } from '../../store/interaction.ts';
import { useWorkflow } from '../../store/context.ts';
import { useNavigation } from '../../store/navigation.ts';
import { floorSnapshot } from '../../world/building.ts';
import { boardFloor } from '../board/openBoard.ts';
import { CHECK_STATUS, focusPullRequest } from '../../world/screens/qa.ts';
import { clockTime } from '../desks/deskDetails.ts';
import { REVIEW_TEXT, pullRequestDetail } from './prDetail.ts';


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
  const floorId = useNavigation((s) => s.floor);
  // Only this floor's pull requests, like the wall screen.
  const here = floorSnapshot(snapshot, boardFloor(snapshot, floorId));
  const prs = [...here.pullRequests].sort((a, b) => b.number - a.number);
  const prId = chosen ?? focusPullRequest(here)?.id ?? null;
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
        <PullRequestBody key={detail.pullRequest.id} detail={detail} />
      )}
      <p className="panel-note">
        Simulated pull request; no real repository or browser is involved. Press <kbd>Esc</kbd> to close.
      </p>
    </section>
  );
}

type Feedback = { readonly ok: true; readonly text: string } | { readonly ok: false; readonly heading: string; readonly reasons: readonly string[] };

function PullRequestBody({ detail }: { detail: NonNullable<ReturnType<typeof pullRequestDetail>> }) {
  const { pullRequest: pr, task, merge } = detail;
  const mergePullRequest = useWorkflow((s) => s.mergePullRequest);
  const requestChanges = useWorkflow((s) => s.requestChanges);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  // Both actions always go to the port, even when the policy will refuse, so the
  // refusal and its reasons come from the domain, never from the button.
  const doMerge = () => {
    const result = mergePullRequest(pr.id);
    if (result.ok) {
      setFeedback({ ok: true, text: result.snapshot.events.at(-1)?.message ?? 'Merged.' });
      return;
    }
    const after = mergeEligibilityFor(result.snapshot, pr.id);
    setFeedback({ ok: false, heading: 'Not merged:', reasons: after.eligible ? [result.reason] : after.reasons });
  };
  const doRequestChanges = (findingId?: string) => {
    const result = requestChanges(pr.id, findingId);
    setFeedback(
      result.ok
        ? { ok: true, text: result.snapshot.events.at(-1)?.message ?? 'Changes requested.' }
        : { ok: false, heading: 'Changes not requested:', reasons: [result.reason] },
    );
  };

  const label = `Pull request #${String(pr.number)}`;
  const changesBlocked =
    pr.state !== 'open' ? `${label} is ${pr.state}.` : detail.reviewStatus === 'none' ? `${label} has no review to update.` : null;
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
              {f.severity === 'non_blocking' && changesBlocked === null && (
                <button
                  type="button"
                  className="pr-finding-action"
                  onClick={() => {
                    doRequestChanges(f.id);
                  }}
                >
                  Make blocking
                </button>
              )}
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
          <p className="pr-blocked-heading">
            <span aria-hidden="true">✕</span> Merge is blocked:
          </p>
          <ul className="pr-reasons" id="pr-merge-reasons" aria-label="Merge blocked because">
            {merge.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="desk-actions" role="group" aria-label="Pull-request actions">
        <button
          type="button"
          className="pr-merge"
          aria-disabled={!merge.eligible}
          aria-describedby={merge.eligible ? undefined : 'pr-merge-reasons'}
          onClick={doMerge}
        >
          Merge
        </button>
        <button
          type="button"
          className="is-quiet"
          aria-disabled={changesBlocked !== null}
          aria-describedby={changesBlocked ? 'pr-changes-reason' : undefined}
          onClick={() => {
            doRequestChanges();
          }}
        >
          Request changes
        </button>
      </div>
      {changesBlocked && (
        <p className="panel-note" id="pr-changes-reason">
          Request changes: {changesBlocked}
        </p>
      )}
      {feedback &&
        (feedback.ok ? (
          <p className="desk-feedback" role="status">
            <span aria-hidden="true">✓</span> {feedback.text}
          </p>
        ) : (
          <div className="desk-feedback is-refused" role="alert">
            <p className="pr-blocked-heading">
              <span aria-hidden="true">✕</span> {feedback.heading}
            </p>
            <ul className="pr-reasons">
              {feedback.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        ))}
    </>
  );
}
