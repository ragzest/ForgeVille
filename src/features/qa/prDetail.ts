import {
  CHECK_LABELS,
  mergeEligibilityFor,
  reviewFor,
  type CheckKind,
  type MergeEligibility,
  type PullRequest,
  type PullRequestId,
  type ReviewFinding,
  type ReviewStatus,
  type Task,
  type Timestamp,
  type WorkflowSnapshot,
} from '../../domain/index.ts';
import { checkRows, type CheckStatus, type QaRow } from '../../world/screens/qa.ts';

export interface TimelineEntry {
  readonly id: string;
  readonly check: CheckKind;
  readonly label: string;
  readonly status: CheckStatus;
  readonly startedAt: Timestamp;
  readonly finishedAt: Timestamp | null;
  readonly summary: string;
  readonly failureReason: string | null;
}

export interface PullRequestDetail {
  readonly pullRequest: PullRequest;
  readonly task: Task | null;
  readonly author: string;
  readonly reviewer: string;
  /** `none` when no review has been recorded. */
  readonly reviewStatus: ReviewStatus | 'none';
  readonly checks: readonly QaRow[];
  /** Every run of every check, oldest first. */
  readonly timeline: readonly TimelineEntry[];
  readonly findings: readonly ReviewFinding[];
  /** What the merge policy would say right now. */
  readonly merge: MergeEligibility;
}

export const REVIEW_TEXT: Readonly<Record<PullRequestDetail['reviewStatus'], { icon: string; text: string }>> = {
  approved: { icon: '✓', text: 'Approved' },
  changes_requested: { icon: '✕', text: 'Changes requested' },
  pending: { icon: '…', text: 'Pending' },
  none: { icon: '–', text: 'No review yet' },
};

/** Everything the pull-request panel shows, from the snapshot and the domain's own policy. */
export function pullRequestDetail(snapshot: WorkflowSnapshot, pullRequestId: PullRequestId): PullRequestDetail | null {
  const pullRequest = snapshot.pullRequests.find((p) => p.id === pullRequestId);
  if (!pullRequest) return null;
  const name = (id: string | null) => snapshot.agents.find((a) => a.id === id)?.name ?? 'Nobody';
  const review = reviewFor(snapshot, pullRequest.id);
  const timeline = snapshot.testRuns
    .filter((r) => r.pullRequestId === pullRequest.id)
    .map((r) => ({
      id: r.id,
      check: r.check,
      label: CHECK_LABELS[r.check],
      status: r.status,
      startedAt: r.startedAt,
      finishedAt: r.finishedAt,
      summary: r.summary,
      failureReason: r.failureReason,
    }))
    .sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));

  return {
    pullRequest,
    task: snapshot.tasks.find((t) => t.id === pullRequest.taskId) ?? null,
    author: name(pullRequest.authorId),
    reviewer: name(review?.reviewerId ?? pullRequest.reviewerId),
    reviewStatus: review?.status ?? 'none',
    checks: checkRows(snapshot, pullRequest.id),
    timeline,
    findings: review?.findings ?? [],
    merge: mergeEligibilityFor(snapshot, pullRequest.id),
  };
}
