import { appendEvent } from './events.ts';
import { refuse, succeed, type CommandOutcome } from './result.ts';
import {
  REQUIRED_CHECKS,
  type CheckKind,
  type FindingId,
  type PullRequest,
  type PullRequestId,
  type ReviewFinding,
  type ReviewReport,
  type Task,
  type TestRun,
  type WorkflowSnapshot,
} from './types.ts';

export const CHECK_LABELS: Readonly<Record<CheckKind, string>> = {
  unit: 'Unit tests',
  build: 'Build',
  browser: 'Browser tests',
};

/** Everything the merge policy looks at. */
export interface MergePolicyInput {
  readonly pullRequest: PullRequest;
  readonly task: Task | null;
  readonly testRuns: readonly TestRun[];
  readonly reviewReport: ReviewReport | null;
}

export type MergeEligibility =
  | { readonly eligible: true }
  | { readonly eligible: false; readonly reasons: readonly string[] };

/** Most recent run of one check, by start time; later array entries win ties. */
export function latestRun(testRuns: readonly TestRun[], check: CheckKind): TestRun | null {
  let latest: TestRun | null = null;
  for (const run of testRuns) {
    if (run.check !== check) continue;
    if (!latest || Date.parse(run.startedAt) >= Date.parse(latest.startedAt)) latest = run;
  }
  return latest;
}

function checkReason(check: CheckKind, run: TestRun | null): string | null {
  const label = CHECK_LABELS[check];
  if (!run) return `${label}: not run yet.`;
  switch (run.status) {
    case 'passed':
      return null;
    case 'failed':
      return `${label} failed${run.failureReason ? `: ${run.failureReason}` : '.'}`;
    case 'queued':
    case 'running':
      return `${label}: still ${run.status}.`;
  }
}

const REVIEW_REASON = {
  pending: 'Review is still pending.',
  changes_requested: 'Reviewer requested changes.',
} as const;

/**
 * Mock merge policy. Eligible only when the pull request is open, its task is
 * in QA, review is approved, every required check passed on its latest run, and
 * no blocking finding is unresolved. Returns every reason it is not.
 */
export function mergeEligibility({ pullRequest, task, testRuns, reviewReport }: MergePolicyInput): MergeEligibility {
  const reasons: string[] = [];

  if (pullRequest.state === 'merged') reasons.push(`Pull request #${String(pullRequest.number)} is already merged.`);
  if (pullRequest.state === 'closed') reasons.push(`Pull request #${String(pullRequest.number)} is closed.`);

  if (!task) {
    reasons.push('The linked task is missing.');
  } else if (pullRequest.state === 'open' && task.column !== 'qa') {
    reasons.push(`${task.issueKey} must be in QA to merge.`);
  }

  if (!reviewReport) {
    reasons.push('No review has been recorded.');
  } else if (reviewReport.status !== 'approved') {
    reasons.push(REVIEW_REASON[reviewReport.status]);
  }

  for (const check of REQUIRED_CHECKS) {
    const reason = checkReason(check, latestRun(testRuns, check));
    if (reason) reasons.push(reason);
  }

  for (const finding of reviewReport?.findings ?? []) {
    if (finding.severity === 'blocking' && !finding.resolved) {
      reasons.push(`Unresolved blocking finding: ${finding.message}`);
    }
  }

  return reasons.length === 0 ? { eligible: true } : { eligible: false, reasons };
}

/** Latest review report for a pull request, if any. */
export function reviewFor(snapshot: WorkflowSnapshot, pullRequestId: PullRequestId): ReviewReport | null {
  return snapshot.reviewReports.filter((r) => r.pullRequestId === pullRequestId).at(-1) ?? null;
}

/** Collects the policy input for one pull request from a snapshot. */
export function mergePolicyInput(snapshot: WorkflowSnapshot, pullRequest: PullRequest): MergePolicyInput {
  return {
    pullRequest,
    task: snapshot.tasks.find((t) => t.id === pullRequest.taskId) ?? null,
    testRuns: snapshot.testRuns.filter((r) => r.pullRequestId === pullRequest.id),
    reviewReport: reviewFor(snapshot, pullRequest.id),
  };
}

export function mergeEligibilityFor(snapshot: WorkflowSnapshot, pullRequestId: PullRequestId): MergeEligibility {
  const pullRequest = snapshot.pullRequests.find((pr) => pr.id === pullRequestId);
  if (!pullRequest) return { eligible: false, reasons: [`Pull request ${pullRequestId} does not exist.`] };
  return mergeEligibility(mergePolicyInput(snapshot, pullRequest));
}

/**
 * The only way a task reaches `merged`. Refuses with every policy reason when
 * the pull request is not eligible, leaving the snapshot unchanged.
 */
export function mergePullRequest(snapshot: WorkflowSnapshot, pullRequestId: PullRequestId): CommandOutcome {
  const eligibility = mergeEligibilityFor(snapshot, pullRequestId);
  if (!eligibility.eligible) {
    return refuse(snapshot, eligibility.reasons.join(' '));
  }

  const pullRequest = snapshot.pullRequests.find((pr) => pr.id === pullRequestId);
  if (!pullRequest) return refuse(snapshot, `Pull request ${pullRequestId} does not exist.`);
  const now = snapshot.clock.now;

  const merged: WorkflowSnapshot = {
    ...snapshot,
    pullRequests: snapshot.pullRequests.map((pr) =>
      pr.id === pullRequest.id ? { ...pr, state: 'merged', mergedAt: now } : pr,
    ),
    tasks: snapshot.tasks.map((t) =>
      t.id === pullRequest.taskId ? { ...t, column: 'merged', blockedFrom: null } : t,
    ),
  };

  const issueKey = snapshot.tasks.find((t) => t.id === pullRequest.taskId)?.issueKey ?? pullRequest.taskId;
  return succeed(
    appendEvent(merged, 'pull_request_merged', `Pull request #${String(pullRequest.number)} merged; ${issueKey} is done.`, {
      projectId: pullRequest.projectId,
      agentId: pullRequest.authorId,
      taskId: pullRequest.taskId,
      pullRequestId: pullRequest.id,
    }),
  );
}

/** Sends a task in review or QA back to its author. Other columns are left alone. */
export function returnToAuthor(snapshot: WorkflowSnapshot, pullRequest: PullRequest): WorkflowSnapshot {
  return {
    ...snapshot,
    tasks: snapshot.tasks.map((t) =>
      t.id === pullRequest.taskId && (t.column === 'in_review' || t.column === 'qa')
        ? { ...t, column: 'in_progress', blockedFrom: null, assigneeId: pullRequest.authorId }
        : t,
    ),
  };
}

const DEFAULT_FINDING_MESSAGE = 'Reviewer requested changes.';

/**
 * Records a blocking finding and sets the review to changes requested. With
 * `findingId`, that existing finding becomes blocking and unresolved; without
 * it, a new blocking finding is added. A task in review or QA returns to
 * `in_progress` for the author.
 */
export function requestChanges(
  snapshot: WorkflowSnapshot,
  pullRequestId: PullRequestId,
  findingId?: FindingId,
): CommandOutcome {
  const pullRequest = snapshot.pullRequests.find((pr) => pr.id === pullRequestId);
  if (!pullRequest) return refuse(snapshot, `Pull request ${pullRequestId} does not exist.`);
  const label = `Pull request #${String(pullRequest.number)}`;
  if (pullRequest.state !== 'open') return refuse(snapshot, `${label} is ${pullRequest.state}.`);

  const review = reviewFor(snapshot, pullRequest.id);
  if (!review) return refuse(snapshot, `${label} has no review to update.`);

  let findings: readonly ReviewFinding[];
  let recorded: ReviewFinding;
  if (findingId !== undefined) {
    const existing = review.findings.find((f) => f.id === findingId);
    if (!existing) return refuse(snapshot, `Finding ${findingId} is not on ${label}.`);
    recorded = { ...existing, severity: 'blocking', resolved: false };
    findings = review.findings.map((f) => (f.id === findingId ? recorded : f));
  } else {
    recorded = {
      id: `${review.id}-finding-${String(review.findings.length + 1)}`,
      severity: 'blocking',
      message: DEFAULT_FINDING_MESSAGE,
      resolved: false,
    };
    findings = [...review.findings, recorded];
  }

  const updated: ReviewReport = { ...review, status: 'changes_requested', findings, updatedAt: snapshot.clock.now };
  const withReview: WorkflowSnapshot = {
    ...snapshot,
    reviewReports: snapshot.reviewReports.map((r) => (r.id === review.id ? updated : r)),
  };

  return succeed(
    appendEvent(returnToAuthor(withReview, pullRequest), 'changes_requested', `Changes requested on ${label}: ${recorded.message}`, {
      projectId: pullRequest.projectId,
      agentId: pullRequest.authorId,
      taskId: pullRequest.taskId,
      pullRequestId: pullRequest.id,
    }),
  );
}
