import { advanceClock, appendEvent } from '../../domain/index.ts';
import type {
  Agent,
  AgentSession,
  EventLinks,
  PullRequest,
  Task,
  TestRun,
  Timestamp,
  WorkflowEventType,
  WorkflowSnapshot,
} from '../../domain/index.ts';

/** All scenarios start here. Fixed, so every load is identical. */
export const SEED_START: Timestamp = '2026-03-02T08:30:00.000Z';

export const PROJECT_ID = 'project-lantern';

/** Six to eight agents with distinct names, roles, and labels. Labels are display text only. */
export const AGENTS: readonly Agent[] = [
  agent('agent-ada', 'Ada', 'Frontend developer', 'fox', 'Claude Code', 'Opus', 48_200, 1.92),
  agent('agent-bruno', 'Bruno', 'Backend developer', 'bear', 'Codex', 'GPT-5', 39_800, 1.31),
  agent('agent-chen', 'Chen', 'Full-stack developer', 'otter', 'OpenCode', 'Qwen Coder', 27_500, 0.44),
  agent('agent-dara', 'Dara', 'Mobile developer', 'hare', 'Pi', 'Gemini', 12_100, 0.29),
  agent('agent-eli', 'Eli', 'QA engineer', 'owl', 'Claude Code', 'Sonnet', 21_700, 0.52),
  agent('agent-fern', 'Fern', 'Code reviewer', 'heron', 'Codex', 'GPT-5', 18_900, 0.61),
  agent('agent-gus', 'Gus', 'Tech lead', 'badger', 'Claude Code', 'Opus', 9_400, 0.37),
];

function agent(
  id: string,
  name: string,
  role: string,
  avatar: string,
  runtimeLabel: string,
  modelLabel: string,
  tokens: number,
  costUsd: number,
): Agent {
  return {
    id,
    projectId: PROJECT_ID,
    name,
    role,
    avatar,
    runtimeLabel,
    modelLabel,
    // Invented numbers for the demo. Always shown as a mock estimate.
    mockUsage: { isMockEstimate: true, tokens, costUsd },
  };
}

export function task(
  id: string,
  issueKey: string,
  title: string,
  column: Task['column'],
  assigneeId: string | null,
  priority: Task['priority'],
  extra: Partial<Pick<Task, 'dependsOn' | 'branch' | 'pullRequestId'>> = {},
): Task {
  return {
    id,
    projectId: PROJECT_ID,
    issueKey,
    title,
    column,
    blockedFrom: null,
    assigneeId,
    priority,
    dependsOn: extra.dependsOn ?? [],
    branch: extra.branch ?? null,
    pullRequestId: extra.pullRequestId ?? null,
  };
}

export function session(
  id: string,
  agentId: string,
  taskId: string | null,
  startedAt: Timestamp,
  lines: readonly [Timestamp, 'stdout' | 'system', string][],
): AgentSession {
  return {
    id,
    agentId,
    taskId,
    state: 'running',
    startedAt,
    lastActivityAt: lines.at(-1)?.[0] ?? startedAt,
    transcript: [
      { timestamp: startedAt, stream: 'system', text: 'Simulated session started. No real process is running.' },
      ...lines.map(([timestamp, stream, text]) => ({ timestamp, stream, text })),
    ],
  };
}

export function testRun(
  id: string,
  pullRequestId: string,
  check: TestRun['check'],
  status: TestRun['status'],
  startedAt: Timestamp,
  finishedAt: Timestamp | null,
  summary: string,
): TestRun {
  return { id, pullRequestId, check, status, startedAt, finishedAt, summary, failureReason: null };
}

/** Appends an event after moving the clock, so the log reads as a timeline. */
export function log(
  snapshot: WorkflowSnapshot,
  minutes: number,
  type: WorkflowEventType,
  message: string,
  links: EventLinks,
): WorkflowSnapshot {
  return appendEvent(advanceClock(snapshot, minutes), type, message, { projectId: PROJECT_ID, ...links });
}

const MERGED_PR: PullRequest = {
  id: 'pr-1',
  projectId: PROJECT_ID,
  taskId: 'task-ln-1',
  number: 1,
  title: 'Reading list data model',
  authorId: 'agent-bruno',
  reviewerId: 'agent-fern',
  sourceBranch: 'feature/reading-list-model',
  baseBranch: 'main',
  state: 'merged',
  openedAt: '2026-02-27T13:00:00.000Z',
  mergedAt: '2026-02-27T16:20:00.000Z',
};

/**
 * Shared starting point: day two of building Lantern. LN-1 shipped last week;
 * three developers are mid-task; the offline cache (LN-4) depends on the sync API (LN-3).
 */
export function seedCompany(): WorkflowSnapshot {
  const t = (hhmm: string) => `2026-03-02T${hhmm}:00.000Z`;

  let s: WorkflowSnapshot = {
    scenarioId: 'feature-in-progress',
    clock: { now: SEED_START },
    projects: [
      {
        id: PROJECT_ID,
        name: 'Lantern',
        description: 'A cozy reading-list app the ForgeVille team is building. Everything here is simulated.',
      },
    ],
    agents: AGENTS,
    tasks: [
      task('task-ln-1', 'LN-1', 'Reading list data model', 'merged', 'agent-bruno', 'high', {
        branch: 'feature/reading-list-model',
        pullRequestId: 'pr-1',
      }),
      task('task-ln-2', 'LN-2', 'Add-to-list button on article cards', 'in_progress', 'agent-ada', 'high', {
        dependsOn: ['task-ln-1'],
        branch: 'feature/add-to-list',
      }),
      task('task-ln-3', 'LN-3', 'Sync API for saved articles', 'in_progress', 'agent-bruno', 'urgent', {
        dependsOn: ['task-ln-1'],
        branch: 'feature/sync-api',
      }),
      task('task-ln-4', 'LN-4', 'Offline cache for saved articles', 'in_progress', 'agent-chen', 'medium', {
        dependsOn: ['task-ln-3'],
        branch: 'feature/offline-cache',
      }),
      task('task-ln-5', 'LN-5', 'Reading settings screen', 'ready', 'agent-dara', 'medium'),
      task('task-ln-6', 'LN-6', 'Onboarding copy', 'backlog', null, 'low'),
      task('task-ln-7', 'LN-7', 'Dark mode', 'backlog', null, 'low'),
    ],
    sessions: [
      session('session-ada', 'agent-ada', 'task-ln-2', t('08:40'), [
        [t('08:42'), 'stdout', '$ npm test -- ArticleCard (simulated)'],
        [t('08:43'), 'stdout', '✓ renders the add-to-list button (simulated)'],
        [t('08:55'), 'stdout', 'Editing src/components/ArticleCard.tsx'],
      ]),
      session('session-bruno', 'agent-bruno', 'task-ln-3', t('08:45'), [
        [t('08:47'), 'stdout', 'Drafting POST /saved-articles handler'],
        [t('08:58'), 'stdout', '$ npm run typecheck (simulated) — 0 errors'],
      ]),
      session('session-chen', 'agent-chen', 'task-ln-4', t('08:50'), [
        [t('08:52'), 'stdout', 'Reading the LN-3 sync API draft'],
        [t('08:59'), 'stdout', 'Sketching IndexedDB schema for cached articles'],
      ]),
    ],
    pullRequests: [MERGED_PR],
    testRuns: [
      testRun('run-1-unit', 'pr-1', 'unit', 'passed', '2026-02-27T13:05:00.000Z', '2026-02-27T13:07:00.000Z', '24 simulated tests passed.'),
      testRun('run-1-build', 'pr-1', 'build', 'passed', '2026-02-27T13:05:00.000Z', '2026-02-27T13:08:00.000Z', 'Simulated build succeeded.'),
      testRun('run-1-browser', 'pr-1', 'browser', 'passed', '2026-02-27T14:10:00.000Z', '2026-02-27T14:25:00.000Z', 'Simulated browser checks passed.'),
    ],
    reviewReports: [
      {
        id: 'review-1',
        pullRequestId: 'pr-1',
        reviewerId: 'agent-fern',
        status: 'approved',
        findings: [],
        updatedAt: '2026-02-27T15:00:00.000Z',
      },
    ],
    events: [],
  };

  s = log(s, 0, 'pull_request_merged', 'Last week: pull request #1 merged; LN-1 reading list data model is done.', {
    agentId: 'agent-bruno',
    taskId: 'task-ln-1',
    pullRequestId: 'pr-1',
  });
  s = log(s, 10, 'session_started', 'Ada started a simulated session on LN-2.', {
    agentId: 'agent-ada',
    taskId: 'task-ln-2',
    sessionId: 'session-ada',
  });
  s = log(s, 5, 'session_started', 'Bruno started a simulated session on LN-3.', {
    agentId: 'agent-bruno',
    taskId: 'task-ln-3',
    sessionId: 'session-bruno',
  });
  s = log(s, 5, 'session_started', 'Chen started a simulated session on LN-4, which depends on LN-3.', {
    agentId: 'agent-chen',
    taskId: 'task-ln-4',
    sessionId: 'session-chen',
  });
  s = log(s, 10, 'task_moved', 'LN-5 reading settings is ready for Dara.', {
    agentId: 'agent-dara',
    taskId: 'task-ln-5',
  });
  return advanceClock(s, 5);
}
