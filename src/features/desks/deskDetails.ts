import { presenceInputFor, agentPresence } from '../../domain/index.ts';
import type {
  Agent,
  AgentId,
  AgentPresence,
  AgentSession,
  PullRequest,
  Task,
  Timestamp,
  WorkflowEvent,
  WorkflowSnapshot,
} from '../../domain/index.ts';

/** How many of the agent's events the desk panel lists. */
export const RECENT_EVENT_COUNT = 5;

export interface DeskDetails {
  readonly agent: Agent;
  readonly presence: AgentPresence;
  readonly task: Task | null;
  readonly session: AgentSession | null;
  readonly pullRequest: PullRequest | null;
  /** Session activity, or the agent's latest event when there is no session. */
  readonly lastActivityAt: Timestamp | null;
  /** Newest first. */
  readonly recentEvents: readonly WorkflowEvent[];
}

/** The id the world and the 2D roster both use for an agent's desk. */
export function deskId(agentId: AgentId): string {
  return `desk:${agentId}`;
}

/** The agent id in a desk id, or null when the id is not a desk. */
export function agentIdFromDesk(id: string): AgentId | null {
  return id.startsWith('desk:') ? id.slice('desk:'.length) : null;
}

/** Everything the desk panel shows, derived from the snapshot. Null for an unknown agent. */
export function deskDetails(snapshot: WorkflowSnapshot, agentId: AgentId): DeskDetails | null {
  const agent = snapshot.agents.find((a) => a.id === agentId);
  if (!agent) return null;

  const input = presenceInputFor(snapshot, agentId);
  const events = snapshot.events.filter((e) => e.links.agentId === agentId);
  const recentEvents = events.slice(-RECENT_EVENT_COUNT).reverse();
  const pullRequest = snapshot.pullRequests.find((pr) => pr.id === input.task?.pullRequestId) ?? null;

  return {
    agent,
    presence: agentPresence(input),
    task: input.task,
    session: input.session,
    pullRequest,
    lastActivityAt: input.session?.lastActivityAt ?? recentEvents[0]?.timestamp ?? null,
    recentEvents,
  };
}

/** "5 min ago" on the scenario clock; "just now" under a minute. */
export function timeAgo(at: Timestamp, now: Timestamp): string {
  const minutes = Math.floor((Date.parse(now) - Date.parse(at)) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${String(minutes)} min ago`;
  const hours = Math.floor(minutes / 60);
  return `${String(hours)} h ago`;
}

/** Clock time of a timestamp, in UTC so the demo reads the same everywhere. */
export function clockTime(at: Timestamp): string {
  return new Date(at).toISOString().slice(11, 16);
}

export type SessionCommand = 'pause' | 'resume' | 'interrupt';

export interface SessionControl {
  readonly command: SessionCommand;
  readonly label: string;
  readonly enabled: boolean;
  /** Why the button is unavailable. Empty when enabled. */
  readonly reason: string;
}

const CONTROL_RULES: readonly { command: SessionCommand; label: string; from: readonly AgentSession['state'][]; needs: string }[] = [
  { command: 'pause', label: 'Pause', from: ['running'], needs: 'a running session' },
  { command: 'resume', label: 'Resume', from: ['paused', 'interrupted'], needs: 'a paused or interrupted session' },
  { command: 'interrupt', label: 'Interrupt', from: ['running', 'paused'], needs: 'a running or paused session' },
];

/**
 * Which session buttons are available for the current session state. Mirrors
 * the domain rules so buttons read right; the port still has the final say.
 */
export function sessionControls(session: AgentSession | null): readonly SessionControl[] {
  return CONTROL_RULES.map(({ command, label, from, needs }) => {
    if (!session) return { command, label, enabled: false, reason: `${label} needs a simulated session; there is none.` };
    const enabled = from.includes(session.state);
    return { command, label, enabled, reason: enabled ? '' : `${label} needs ${needs}; this one is ${session.state}.` };
  });
}
