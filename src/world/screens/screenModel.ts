import { presenceInputFor, agentPresence, type AgentPresence, type WorkflowSnapshot } from '../../domain/index.ts';
import { runtimeStyle, type RuntimeStyle } from '../../ui/runtimes.ts';

/**
 * What a desk monitor shows, derived from the snapshot. Pure data, so it is
 * tested without WebGL; `drawTerminal` turns it into pixels.
 */

/** How many transcript lines fit on a desk monitor. */
export const SCREEN_LINES = 6;

export type ScreenMode = 'terminal' | 'screensaver';

export type ScreenBanner = { readonly tone: 'danger' | 'amber' | 'review' | 'success'; readonly text: string } | null;

export interface ScreenLine {
  /** `HH:MM`, on the scenario clock. */
  readonly time: string;
  readonly text: string;
  readonly kind: 'command' | 'output' | 'system';
}

export interface ScreenModel {
  readonly mode: ScreenMode;
  readonly name: string;
  /** Screensaver headline and subline, overriding the defaults. */
  readonly caption?: readonly [string, string];
  /** Spinner line above the prompt, e.g. `Working on LN-2`. Empty when there is nothing to say. */
  readonly status: string;
  /** Title-bar text, e.g. `claude code · ada@lantern`. */
  readonly title: string;
  readonly runtime: RuntimeStyle;
  readonly presence: AgentPresence;
  /** Newest last. Empty in screensaver mode. */
  readonly lines: readonly ScreenLine[];
  /** Status strip across the bottom of the screen, when the agent needs attention. */
  readonly banner: ScreenBanner;
  /** Whether the prompt cursor blinks: only while the session is running. */
  readonly live: boolean;
  /** Changes whenever the drawn pixels would change; a texture cache key. */
  readonly key: string;
}

const BANNERS: Readonly<Partial<Record<AgentPresence, ScreenBanner>>> = {
  blocked: { tone: 'danger', text: 'BLOCKED · waiting for help' },
  awaiting_review: { tone: 'amber', text: 'AWAITING REVIEW' },
  reviewing: { tone: 'review', text: 'REVIEWING A PULL REQUEST' },
};

const hhmm = (iso: string) => new Date(iso).toISOString().slice(11, 16);

/** A desk monitor for one agent. Agents with no session show a screensaver. */
export function screenModel(snapshot: WorkflowSnapshot, agentId: string): ScreenModel {
  const agent = snapshot.agents.find((a) => a.id === agentId);
  const input = presenceInputFor(snapshot, agentId);
  const presence = agentPresence(input);
  const runtime = runtimeStyle(agent?.runtimeLabel ?? '');
  const project = snapshot.projects.find((p) => p.id === agent?.projectId)?.name ?? 'office';
  const handle = `${(agent?.name ?? agentId).toLowerCase()}@${project.toLowerCase()}`;
  const session = input.session;

  const lines: ScreenLine[] = (session?.transcript ?? []).slice(-SCREEN_LINES).map((line) => ({
    time: hhmm(line.timestamp),
    text: line.text,
    kind: line.stream === 'system' ? 'system' : line.text.startsWith('$') ? 'command' : 'output',
  }));

  const mode: ScreenMode = session ? 'terminal' : 'screensaver';
  const banner = BANNERS[presence] ?? (session && session.state !== 'running' ? { tone: 'amber', text: `SESSION ${session.state.toUpperCase()}` } as const : null);
  const live = session?.state === 'running' && presence === 'working';
  const title = `${runtime.label.toLowerCase()} · ${handle}`;
  const name = agent?.name ?? agentId;
  const status = live && input.task ? `Working on ${input.task.issueKey}` : '';
  const key = [agentId, mode, presence, session?.state ?? '-', String(session?.transcript.length ?? 0), banner?.text ?? '', title, status].join('|');

  return { mode, name, status, title, runtime, presence, lines, banner, live, key };
}

/** A desk on a floor no project has moved into yet. */
export const VACANT_SCREEN: ScreenModel = {
  mode: 'screensaver',
  name: '',
  status: '',
  title: '',
  runtime: runtimeStyle(''),
  presence: 'idle',
  lines: [],
  banner: null,
  live: false,
  key: 'vacant',
};
