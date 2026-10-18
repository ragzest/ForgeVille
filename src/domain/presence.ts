import type { AgentId, AgentPresence, AgentSession, Task, Timestamp, WorkflowSnapshot } from './types.ts';

export interface PresenceInput {
  /** The agent's current session, if any. */
  readonly session: AgentSession | null;
  /** The task the agent is assigned to, if any. */
  readonly task: Task | null;
  /** True when the agent is the reviewer on an open pull request. */
  readonly isActiveReviewer: boolean;
}

/**
 * Presence from session and task state. Order matters:
 * reviewing > blocked > awaiting_review > working > idle.
 */
export function agentPresence({ session, task, isActiveReviewer }: PresenceInput): AgentPresence {
  if (isActiveReviewer) return 'reviewing';
  if (task?.column === 'blocked') return 'blocked';
  if (task?.column === 'in_review' || task?.column === 'qa') return 'awaiting_review';
  if (session?.state === 'running' && task?.column === 'in_progress') return 'working';
  return 'idle';
}

/**
 * Picks the presence inputs for one agent from a snapshot.
 * Session: the agent's latest session. Task: the session's task when it is
 * assigned to the agent, otherwise the agent's first unmerged assigned task.
 */
export function presenceInputFor(snapshot: WorkflowSnapshot, agentId: AgentId): PresenceInput {
  const sessions = snapshot.sessions.filter((s) => s.agentId === agentId);
  const session = sessions.at(-1) ?? null;

  const assigned = snapshot.tasks.filter((t) => t.assigneeId === agentId && t.column !== 'merged');
  const task = assigned.find((t) => t.id === session?.taskId) ?? assigned[0] ?? null;

  const isActiveReviewer = snapshot.pullRequests.some((pr) => pr.state === 'open' && pr.reviewerId === agentId);

  return { session, task, isActiveReviewer };
}

export function presenceOf(snapshot: WorkflowSnapshot, agentId: AgentId): AgentPresence {
  return agentPresence(presenceInputFor(snapshot, agentId));
}

/** How long the celebration hint lasts after a simulated merge, on the scenario clock. */
export const CELEBRATION_MS = 30_000;

/**
 * Presentation hint only: true shortly after a merge event that names this agent.
 * Derived from events and the scenario clock; never stored, never merge proof.
 */
export function isCelebrating(snapshot: WorkflowSnapshot, agentId: AgentId, now: Timestamp = snapshot.clock.now): boolean {
  const nowMs = Date.parse(now);
  return snapshot.events.some((e) => {
    if (e.type !== 'pull_request_merged' || e.links.agentId !== agentId) return false;
    const age = nowMs - Date.parse(e.timestamp);
    return age >= 0 && age < CELEBRATION_MS;
  });
}
