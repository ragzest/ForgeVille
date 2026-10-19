import {
  FAILURE_EVENT_TYPES,
  missionControlMetrics,
  type MissionControlMetrics,
  type Timestamp,
  type WorkflowEventType,
  type WorkflowSnapshot,
} from '../../domain/index.ts';
import { interactionStore } from '../../store/interaction.ts';
import { statusTilesFrom, type StatusTile } from '../../world/screens/displays.ts';
import { clockTime } from '../desks/deskDetails.ts';

/** Same id and label as the status display landmark, so every route opens the same overlay. */
export const STATUS_TARGET = { id: 'status-display', label: 'Project status display' } as const;

export function openMissionControl(): void {
  interactionStore.getState().activate(STATUS_TARGET);
}

export const RECENT_EVENT_COUNT = 8;

export type TileTone = 'neutral' | 'success' | 'review' | 'danger';

export interface MissionTile {
  readonly key: keyof MissionControlMetrics;
  readonly label: string;
  readonly value: string;
  /** Repeats the meaning of the tone, so colour is never the only signal. */
  readonly icon: string;
  readonly tone: TileTone;
  /** A few words on what the number means right now. */
  readonly note: string;
}

export interface FeedEvent {
  readonly id: string;
  readonly timestamp: Timestamp;
  readonly time: string;
  readonly message: string;
  /** Icon and word for events that need attention; null for routine ones. */
  readonly flag: { readonly icon: string; readonly text: string; readonly tone: 'danger' | 'amber' | 'success' } | null;
}

export interface MissionControlView {
  readonly tiles: readonly MissionTile[];
  /** The status display's four tiles, from the same metrics as `tiles`. */
  readonly statusTiles: readonly StatusTile[];
  readonly events: readonly FeedEvent[];
  /** One line for the collapsed overlay on a narrow screen. */
  readonly summary: string;
}

const FLAGS: Partial<Record<WorkflowEventType, FeedEvent['flag']>> = {
  task_blocked: { icon: '⛔', text: 'Blocked', tone: 'danger' },
  help_requested: { icon: '✋', text: 'Help', tone: 'amber' },
  changes_requested: { icon: '↩', text: 'Changes', tone: 'amber' },
  session_interrupted: { icon: '⏹', text: 'Stopped', tone: 'amber' },
  pull_request_merged: { icon: '★', text: 'Merged', tone: 'success' },
};
for (const type of FAILURE_EVENT_TYPES) FLAGS[type] = { icon: '✕', text: 'Failed', tone: 'danger' };

const plural = (n: number, one: string, many: string) => `${String(n)} ${n === 1 ? one : many}`;

/** The eight mission-control tiles. Every value comes from `missionControlMetrics`. */
export function missionTiles(m: MissionControlMetrics): MissionTile[] {
  const failures = m.recentFailures.length;
  const newestFailure = m.recentFailures[0];
  return [
    { key: 'totalProjects', label: 'Projects', value: String(m.totalProjects), icon: '🏢', tone: 'neutral', note: 'In the building' },
    { key: 'activeAgents', label: 'Active agents', value: String(m.activeAgents), icon: '⌨', tone: 'success', note: 'Working or reviewing' },
    { key: 'queuedTasks', label: 'Queued tasks', value: String(m.queuedTasks), icon: '📋', tone: 'neutral', note: 'Backlog and ready' },
    { key: 'openPullRequests', label: 'Open PRs', value: String(m.openPullRequests), icon: '🔍', tone: 'review', note: 'Not merged or closed' },
    {
      key: 'blockedTasks',
      label: 'Blocked tasks',
      value: String(m.blockedTasks),
      icon: m.blockedTasks > 0 ? '⛔' : '✓',
      tone: m.blockedTasks > 0 ? 'danger' : 'neutral',
      note: m.blockedTasks > 0 ? 'Needs attention' : 'Nothing blocked',
    },
    { key: 'successfulMerges', label: 'Merges', value: String(m.successfulMerges), icon: '★', tone: 'success', note: 'Merged pull requests' },
    {
      key: 'recentFailures',
      label: 'Recent failures',
      value: String(failures),
      icon: failures > 0 ? '✕' : '✓',
      tone: failures > 0 ? 'danger' : 'neutral',
      // The feed has the full message; the tile keeps its first clause ("Browser tests failed on …").
      note: newestFailure ? `Latest: ${newestFailure.message.split(':')[0] ?? newestFailure.message}` : 'No failed checks',
    },
    {
      key: 'qaPassRate',
      label: 'QA pass rate',
      value: m.qaPassRate === null ? '—' : `${String(Math.round(m.qaPassRate * 100))}%`,
      icon: m.qaPassRate === null ? '…' : m.qaPassRate === 1 ? '✓' : '✕',
      tone: m.qaPassRate === null ? 'neutral' : m.qaPassRate === 1 ? 'success' : 'danger',
      note: m.qaPassRate === null ? 'No checks finished yet' : m.qaPassRate === 1 ? 'Every finished check passed' : 'Some checks failed',
    },
  ];
}

/** The newest events first; for equal timestamps the later-logged event comes first (as the metrics do). */
export function recentEvents(snapshot: WorkflowSnapshot, limit: number = RECENT_EVENT_COUNT): FeedEvent[] {
  return snapshot.events
    .map((event, index) => ({ event, index }))
    .sort((a, b) => Date.parse(b.event.timestamp) - Date.parse(a.event.timestamp) || b.index - a.index)
    .slice(0, Math.max(0, limit))
    .map(({ event }) => ({
      id: event.id,
      timestamp: event.timestamp,
      time: clockTime(event.timestamp),
      message: event.message,
      flag: FLAGS[event.type] ?? null,
    }));
}

/** Everything the overlay shows, from one `missionControlMetrics` call. */
export function missionControlView(snapshot: WorkflowSnapshot): MissionControlView {
  const m = missionControlMetrics(snapshot);
  return {
    tiles: missionTiles(m),
    statusTiles: statusTilesFrom(m),
    events: recentEvents(snapshot),
    summary: [
      `${String(m.activeAgents)} active`,
      `⛔ ${plural(m.blockedTasks, 'blocked', 'blocked')}`,
      `✕ ${plural(m.recentFailures.length, 'failure', 'failures')}`,
    ].join(' · '),
  };
}
