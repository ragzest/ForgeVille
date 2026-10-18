import { presenceOf } from './presence.ts';
import { REQUIRED_CHECKS, type CheckKind, type WorkflowEvent, type WorkflowEventType, type WorkflowSnapshot } from './types.ts';

/** Event types that count as failures in mission control. */
export const FAILURE_EVENT_TYPES = ['check_failed'] as const satisfies readonly WorkflowEventType[];

export const DEFAULT_RECENT_FAILURES = 5;

export interface MissionControlMetrics {
  readonly totalProjects: number;
  /** Agents whose presence is working or reviewing. */
  readonly activeAgents: number;
  /** Tasks in backlog or ready. */
  readonly queuedTasks: number;
  /** Pull requests that are neither merged nor closed. */
  readonly openPullRequests: number;
  readonly blockedTasks: number;
  /** Pull requests in the merged state. */
  readonly successfulMerges: number;
  /** Failure events, newest first. */
  readonly recentFailures: readonly WorkflowEvent[];
  /** Passed required-check runs over finished required-check runs; `null` when none finished. */
  readonly qaPassRate: number | null;
}

const isRequired = (check: CheckKind) => (REQUIRED_CHECKS as readonly CheckKind[]).includes(check);
const isFailure = (type: WorkflowEventType) => (FAILURE_EVENT_TYPES as readonly WorkflowEventType[]).includes(type);

/** Mission-control numbers, all derived from the snapshot. */
export function missionControlMetrics(
  snapshot: WorkflowSnapshot,
  recentFailureLimit: number = DEFAULT_RECENT_FAILURES,
): MissionControlMetrics {
  const activeAgents = snapshot.agents.filter((agent) => {
    const presence = presenceOf(snapshot, agent.id);
    return presence === 'working' || presence === 'reviewing';
  }).length;

  const finished = snapshot.testRuns.filter(
    (run) => isRequired(run.check) && (run.status === 'passed' || run.status === 'failed'),
  );
  const passed = finished.filter((run) => run.status === 'passed').length;

  // Newest first; for equal timestamps the later-logged event comes first.
  const recentFailures = snapshot.events
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => isFailure(event.type))
    .sort((a, b) => Date.parse(b.event.timestamp) - Date.parse(a.event.timestamp) || b.index - a.index)
    .slice(0, Math.max(0, recentFailureLimit))
    .map(({ event }) => event);

  return {
    totalProjects: snapshot.projects.length,
    activeAgents,
    queuedTasks: snapshot.tasks.filter((t) => t.column === 'backlog' || t.column === 'ready').length,
    openPullRequests: snapshot.pullRequests.filter((pr) => pr.state === 'open').length,
    blockedTasks: snapshot.tasks.filter((t) => t.column === 'blocked').length,
    successfulMerges: snapshot.pullRequests.filter((pr) => pr.state === 'merged').length,
    recentFailures,
    qaPassRate: finished.length === 0 ? null : passed / finished.length,
  };
}
