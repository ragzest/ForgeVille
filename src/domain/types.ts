/**
 * Domain types for the simulated company. One snapshot holds everything;
 * views derive from it and never keep a second copy of workflow state.
 */

/** ISO 8601 timestamp on the scenario clock, e.g. `2026-01-05T09:30:00.000Z`. */
export type Timestamp = string;

export type ProjectId = string;
export type AgentId = string;
export type TaskId = string;
export type SessionId = string;
export type PullRequestId = string;
export type TestRunId = string;
export type ReviewReportId = string;
export type FindingId = string;
export type EventId = string;

export type ScenarioId =
  | 'feature-in-progress'
  | 'review-and-qa-pass'
  | 'qa-failure'
  | 'agent-blocked'
  | 'successful-merge';

export const SCENARIO_IDS = [
  'feature-in-progress',
  'review-and-qa-pass',
  'qa-failure',
  'agent-blocked',
  'successful-merge',
] as const satisfies readonly ScenarioId[];

// ---------------------------------------------------------------------------
// Projects

export interface Project {
  readonly id: ProjectId;
  readonly name: string;
  readonly description: string;
}

// ---------------------------------------------------------------------------
// Agents

/** Derived from session and task state. Never stored on the agent. */
export type AgentPresence = 'working' | 'idle' | 'blocked' | 'awaiting_review' | 'reviewing';

/** Usage numbers are invented for the demo and must be labelled as such. */
export interface MockUsageEstimate {
  readonly isMockEstimate: true;
  readonly tokens: number;
  readonly costUsd: number;
}

export interface Agent {
  readonly id: AgentId;
  readonly projectId: ProjectId;
  readonly name: string;
  readonly role: string;
  /** Key for a simple generated avatar, not an asset URL. */
  readonly avatar: string;
  /** Display label such as "Claude Code". Not a client handle. */
  readonly runtimeLabel: string;
  /** Display label such as "Opus". Not a client handle. */
  readonly modelLabel: string;
  readonly mockUsage: MockUsageEstimate | null;
}

// ---------------------------------------------------------------------------
// Tasks

export type TaskColumn = 'backlog' | 'ready' | 'in_progress' | 'in_review' | 'qa' | 'blocked' | 'merged';

export const TASK_COLUMNS = [
  'backlog',
  'ready',
  'in_progress',
  'in_review',
  'qa',
  'blocked',
  'merged',
] as const satisfies readonly TaskColumn[];

/** Columns a task may be blocked from, and therefore return to. */
export type BlockableColumn = Extract<TaskColumn, 'in_progress' | 'in_review' | 'qa'>;

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  readonly id: TaskId;
  readonly projectId: ProjectId;
  /** Human-facing issue key, e.g. `FV-12`. */
  readonly issueKey: string;
  readonly title: string;
  /** A sentence or two on what the task is for. */
  readonly description: string;
  readonly column: TaskColumn;
  /** Set while `column` is `blocked`; otherwise `null`. */
  readonly blockedFrom: BlockableColumn | null;
  readonly assigneeId: AgentId | null;
  readonly priority: TaskPriority;
  readonly dependsOn: readonly TaskId[];
  readonly branch: string | null;
  readonly pullRequestId: PullRequestId | null;
}

// ---------------------------------------------------------------------------
// Sessions

export type SessionState = 'running' | 'paused' | 'interrupted' | 'completed';

export type TranscriptStream = 'stdout' | 'system';

export interface TranscriptLine {
  readonly timestamp: Timestamp;
  readonly stream: TranscriptStream;
  readonly text: string;
}

/** A simulated coding session. No process exists behind it. */
export interface AgentSession {
  readonly id: SessionId;
  readonly agentId: AgentId;
  readonly taskId: TaskId | null;
  readonly state: SessionState;
  readonly startedAt: Timestamp;
  readonly lastActivityAt: Timestamp;
  readonly transcript: readonly TranscriptLine[];
}

// ---------------------------------------------------------------------------
// Pull requests, checks, and reviews

export type PullRequestState = 'open' | 'merged' | 'closed';

export interface PullRequest {
  readonly id: PullRequestId;
  readonly projectId: ProjectId;
  readonly taskId: TaskId;
  readonly number: number;
  readonly title: string;
  readonly authorId: AgentId;
  /** Agent currently reviewing, if any. */
  readonly reviewerId: AgentId | null;
  readonly sourceBranch: string;
  readonly baseBranch: string;
  readonly state: PullRequestState;
  readonly openedAt: Timestamp;
  readonly mergedAt: Timestamp | null;
}

export type CheckKind = 'unit' | 'build' | 'browser';

/** Checks that must pass before a merge. */
export const REQUIRED_CHECKS = ['unit', 'build', 'browser'] as const satisfies readonly CheckKind[];

export type TestRunStatus = 'queued' | 'running' | 'passed' | 'failed';

export interface TestRun {
  readonly id: TestRunId;
  readonly pullRequestId: PullRequestId;
  readonly check: CheckKind;
  readonly status: TestRunStatus;
  readonly startedAt: Timestamp;
  readonly finishedAt: Timestamp | null;
  readonly summary: string;
  /** Why the check failed, shown in the UI. `null` unless `status` is `failed`. */
  readonly failureReason: string | null;
}

export type ReviewStatus = 'pending' | 'approved' | 'changes_requested';

export type FindingSeverity = 'blocking' | 'non_blocking';

export interface ReviewFinding {
  readonly id: FindingId;
  readonly severity: FindingSeverity;
  readonly message: string;
  readonly resolved: boolean;
}

export interface ReviewReport {
  readonly id: ReviewReportId;
  readonly pullRequestId: PullRequestId;
  readonly reviewerId: AgentId;
  readonly status: ReviewStatus;
  readonly findings: readonly ReviewFinding[];
  readonly updatedAt: Timestamp;
}

// ---------------------------------------------------------------------------
// Events

export type WorkflowEventType =
  | 'task_moved'
  | 'task_blocked'
  | 'help_requested'
  | 'session_started'
  | 'session_paused'
  | 'session_resumed'
  | 'session_interrupted'
  | 'pull_request_opened'
  | 'review_approved'
  | 'changes_requested'
  | 'check_passed'
  | 'check_failed'
  | 'pull_request_merged';

/** Ids an event refers to. Only the relevant ones are set. */
export interface EventLinks {
  readonly projectId?: ProjectId;
  readonly agentId?: AgentId;
  readonly taskId?: TaskId;
  readonly sessionId?: SessionId;
  readonly pullRequestId?: PullRequestId;
  readonly testRunId?: TestRunId;
}

export interface WorkflowEvent {
  readonly id: EventId;
  readonly timestamp: Timestamp;
  readonly type: WorkflowEventType;
  readonly message: string;
  readonly links: EventLinks;
}

// ---------------------------------------------------------------------------
// Snapshot

export interface ScenarioClock {
  /** Current time in the scenario. Presentation hints expire against this. */
  readonly now: Timestamp;
}

export interface WorkflowSnapshot {
  readonly scenarioId: ScenarioId;
  readonly clock: ScenarioClock;
  readonly projects: readonly Project[];
  readonly agents: readonly Agent[];
  readonly tasks: readonly Task[];
  readonly sessions: readonly AgentSession[];
  readonly pullRequests: readonly PullRequest[];
  readonly testRuns: readonly TestRun[];
  readonly reviewReports: readonly ReviewReport[];
  /** Oldest first. */
  readonly events: readonly WorkflowEvent[];
}
