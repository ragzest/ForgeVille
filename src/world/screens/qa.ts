import {
  CHECK_LABELS,
  REQUIRED_CHECKS,
  latestRun,
  type CheckKind,
  type PullRequest,
  type PullRequestId,
  type TestRunStatus,
  type WorkflowSnapshot,
} from '../../domain/index.ts';
import { COLORS } from '../../ui/tokens.ts';

/**
 * The QA corner's view model. The QA wall screen paints it and the
 * pull-request panel renders it, so both use the same words and icons.
 * Pure and free of three.js.
 */

export type CheckStatus = TestRunStatus | 'not_run';

/** Status as icon and word; colour only repeats them. */
export const CHECK_STATUS: Readonly<Record<CheckStatus, { icon: string; text: string; color: string }>> = {
  passed: { icon: '✓', text: 'Passed', color: COLORS.success },
  failed: { icon: '✕', text: 'Failed', color: COLORS.danger },
  running: { icon: '◐', text: 'Running', color: COLORS.amber },
  queued: { icon: '…', text: 'Queued', color: COLORS.inkSoft },
  not_run: { icon: '–', text: 'Not run', color: COLORS.inkSoft },
};

export interface QaRow {
  readonly check: CheckKind;
  readonly label: string;
  readonly status: CheckStatus;
}

export interface QaDisplay {
  /** e.g. `PR #2 · Add-to-list button`, or null when there is no pull request. */
  readonly heading: string | null;
  readonly rows: readonly QaRow[];
}

/** The pull request the QA corner shows: the newest open one, or the newest of all. */
export function focusPullRequest(snapshot: WorkflowSnapshot): PullRequest | null {
  const prs = [...snapshot.pullRequests].sort((a, b) => b.number - a.number);
  return prs.find((p) => p.state === 'open') ?? prs[0] ?? null;
}

/** One row per required check, from its latest run (the run the merge policy reads). */
export function checkRows(snapshot: WorkflowSnapshot, pullRequestId: PullRequestId): QaRow[] {
  const runs = snapshot.testRuns.filter((r) => r.pullRequestId === pullRequestId);
  return REQUIRED_CHECKS.map((check) => ({
    check,
    label: CHECK_LABELS[check],
    status: latestRun(runs, check)?.status ?? 'not_run',
  }));
}

export function prHeading(pr: PullRequest): string {
  return `PR #${String(pr.number)} · ${pr.title}${pr.state === 'merged' ? ' (merged)' : ''}`;
}

/** The QA wall screen: the focus pull request and its required checks. */
export function qaDisplay(snapshot: WorkflowSnapshot): QaDisplay {
  const pr = focusPullRequest(snapshot);
  if (!pr) return { heading: null, rows: [] };
  return { heading: prHeading(pr), rows: checkRows(snapshot, pr.id) };
}
