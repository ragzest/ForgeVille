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

/** The second team, on floor 2. Small on purpose: it shows the building is shared, not a second workflow. */
export const SPROUT_PROJECT_ID = 'project-sprout';

/** Lantern's seven agents, with distinct names, roles, and labels. Labels are display text only. */
export const AGENTS: readonly Agent[] = [
  agent('agent-ada', 'Ada', 'Frontend developer', 'fox', 'Claude Code', 'Opus', 48_200, 1.92),
  agent('agent-bruno', 'Bruno', 'Backend developer', 'bear', 'Codex', 'GPT-5', 39_800, 1.31),
  agent('agent-chen', 'Chen', 'Full-stack developer', 'otter', 'OpenCode', 'Qwen Coder', 27_500, 0.44),
  agent('agent-dara', 'Dara', 'Mobile developer', 'hare', 'Pi', 'Gemini', 12_100, 0.29),
  agent('agent-eli', 'Eli', 'QA engineer', 'owl', 'Claude Code', 'Sonnet', 21_700, 0.52),
  agent('agent-fern', 'Fern', 'Code reviewer', 'heron', 'Codex', 'GPT-5', 18_900, 0.61),
  agent('agent-gus', 'Gus', 'Tech lead', 'badger', 'Claude Code', 'Opus', 9_400, 0.37),
];

/** Sprout's four agents. Names never repeat Lantern's, so a name alone says which floor someone is on. */
export const SPROUT_AGENTS: readonly Agent[] = [
  agent('agent-hana', 'Hana', 'Frontend developer', 'hare', 'Claude Code', 'Sonnet', 15_300, 0.41, SPROUT_PROJECT_ID),
  agent('agent-ivo', 'Ivo', 'Backend developer', 'bear', 'OpenCode', 'Qwen Coder', 22_800, 0.36, SPROUT_PROJECT_ID),
  agent('agent-juno', 'Juno', 'QA engineer', 'owl', 'Pi', 'Gemini', 6_200, 0.14, SPROUT_PROJECT_ID),
  agent('agent-kit', 'Kit', 'Tech lead', 'otter', 'Codex', 'GPT-5', 8_700, 0.29, SPROUT_PROJECT_ID),
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
  projectId: string = PROJECT_ID,
): Agent {
  return {
    id,
    projectId,
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
  extra: Partial<Pick<Task, 'projectId' | 'description' | 'dependsOn' | 'branch' | 'pullRequestId'>> = {},
): Task {
  return {
    id,
    projectId: extra.projectId ?? PROJECT_ID,
    issueKey,
    title,
    description: extra.description ?? '',
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

/** Appends an event after moving the clock, so the log reads as a timeline. Lantern's unless `links.projectId` says otherwise. */
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
      {
        id: SPROUT_PROJECT_ID,
        name: 'Sprout',
        description: 'A plant-care app that reminds you when to water. The second team in the building; also simulated.',
      },
    ],
    agents: [...AGENTS, ...SPROUT_AGENTS],
    tasks: [
      task('task-ln-1', 'LN-1', 'Reading list data model', 'merged', 'agent-bruno', 'high', {
        description: 'Tables and types for saved articles, so every other reading-list task has somewhere to store data.',
        branch: 'feature/reading-list-model',
        pullRequestId: 'pr-1',
      }),
      task('task-ln-2', 'LN-2', 'Add-to-list button on article cards', 'in_progress', 'agent-ada', 'high', {
        description: 'A button on each article card that saves it to the reading list, with a filled state once saved.',
        dependsOn: ['task-ln-1'],
        branch: 'feature/add-to-list',
      }),
      task('task-ln-3', 'LN-3', 'Sync API for saved articles', 'in_progress', 'agent-bruno', 'urgent', {
        description: 'Endpoints that sync saved articles between devices. The offline cache builds on this.',
        dependsOn: ['task-ln-1'],
        branch: 'feature/sync-api',
      }),
      task('task-ln-4', 'LN-4', 'Offline cache for saved articles', 'in_progress', 'agent-chen', 'medium', {
        description: 'Keep saved articles readable without a connection, using the sync API as the source of truth.',
        dependsOn: ['task-ln-3'],
        branch: 'feature/offline-cache',
      }),
      task('task-ln-5', 'LN-5', 'Reading settings screen', 'ready', 'agent-dara', 'medium', {
        description: 'Font size, theme, and line spacing for the reader view.',
      }),
      task('task-ln-6', 'LN-6', 'Onboarding copy', 'backlog', null, 'low', {
        description: 'Short first-run text that explains saving and syncing.',
      }),
      task('task-ln-7', 'LN-7', 'Dark mode', 'backlog', null, 'low', {
        description: 'A dark theme for the whole app, following the system setting.',
      }),
      ...sproutTasks(),
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
      session('session-ivo', 'agent-ivo', 'task-sp-1', t('08:40'), [
        [t('08:44'), 'stdout', 'Modelling watering intervals per plant'],
        [t('08:57'), 'stdout', '$ npm test -- schedule (simulated) — 6 passed'],
      ]),
      session('session-hana', 'agent-hana', 'task-sp-2', t('08:45'), [
        [t('08:48'), 'stdout', 'Editing src/components/PlantCard.tsx'],
        [t('08:56'), 'stdout', 'Adding a droplet badge for plants due today'],
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
  s = log(s, 0, 'session_started', 'Ivo started a simulated session on SP-1, upstairs on the Sprout floor.', {
    projectId: SPROUT_PROJECT_ID,
    agentId: 'agent-ivo',
    taskId: 'task-sp-1',
    sessionId: 'session-ivo',
  });
  s = log(s, 5, 'session_started', 'Bruno started a simulated session on LN-3.', {
    agentId: 'agent-bruno',
    taskId: 'task-ln-3',
    sessionId: 'session-bruno',
  });
  s = log(s, 0, 'session_started', 'Hana started a simulated session on SP-2.', {
    projectId: SPROUT_PROJECT_ID,
    agentId: 'agent-hana',
    taskId: 'task-sp-2',
    sessionId: 'session-hana',
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

/** Sprout's board: two tasks under way, one ready, one waiting in the backlog. */
function sproutTasks(): Task[] {
  const projectId = SPROUT_PROJECT_ID;
  return [
    task('task-sp-1', 'SP-1', 'Watering schedule model', 'in_progress', 'agent-ivo', 'high', {
      projectId,
      description: 'How often each plant needs water, so reminders have something to count down from.',
      branch: 'feature/watering-schedule',
    }),
    task('task-sp-2', 'SP-2', 'Plant cards with photos', 'in_progress', 'agent-hana', 'medium', {
      projectId,
      description: 'A card per plant with its photo, name, and a badge when it is due for water.',
      branch: 'feature/plant-cards',
    }),
    task('task-sp-3', 'SP-3', 'Watering reminders', 'ready', 'agent-kit', 'medium', {
      projectId,
      description: 'A daily reminder listing the plants that are due, built on the schedule model.',
      dependsOn: ['task-sp-1'],
    }),
    task('task-sp-4', 'SP-4', 'Care tips copy', 'backlog', null, 'low', {
      projectId,
      description: 'Short care tips for the ten most common houseplants.',
    }),
  ];
}
