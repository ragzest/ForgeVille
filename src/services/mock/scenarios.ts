import {
  advanceClock,
  failCheck,
  mergePullRequest,
  moveTask,
  SCENARIO_IDS,
  type CommandOutcome,
  type ScenarioId,
  type WorkflowSnapshot,
} from '../../domain/index.ts';
import { log, PROJECT_ID, seedCompany, testRun } from './seed.ts';

export interface ScenarioInfo {
  readonly id: ScenarioId;
  readonly title: string;
  readonly summary: string;
}

export const SCENARIOS: readonly ScenarioInfo[] = [
  {
    id: 'feature-in-progress',
    title: 'Feature in progress',
    summary: 'Ada, Bruno, and Chen are mid-task on Lantern. Dara has work ready.',
  },
  {
    id: 'review-and-qa-pass',
    title: 'Review and QA pass',
    summary: 'Fern approved pull request #2 and every required check passed. It can be merged.',
  },
  {
    id: 'qa-failure',
    title: 'QA failure',
    summary: 'The browser check failed on pull request #2, so LN-2 went back to Ada.',
  },
  {
    id: 'agent-blocked',
    title: 'Agent blocked',
    summary: 'Chen is blocked on LN-4 until the LN-3 sync API lands, and asked for help.',
  },
  {
    id: 'successful-merge',
    title: 'Successful merge',
    summary: 'Pull request #2 passed the merge policy and merged. LN-2 is done.',
  },
];

/** Domain commands must succeed while building seed data; a failure is a bug in the scenario. */
function must(result: CommandOutcome): WorkflowSnapshot {
  if (!result.ok) throw new Error(`Scenario setup failed: ${result.reason}`);
  return result.snapshot;
}

/** LN-2 is in QA with pull request #2 approved; the browser check is still running. */
function ln2InQa(): WorkflowSnapshot {
  let s = seedCompany();
  const at = (minutes: number) => advanceClock(s, minutes).clock.now;

  s = must(moveTask(advanceClock(s, 20), 'task-ln-2', 'in_review'));
  s = {
    ...s,
    tasks: s.tasks.map((t) => (t.id === 'task-ln-2' ? { ...t, pullRequestId: 'pr-2' } : t)),
    pullRequests: [
      ...s.pullRequests,
      {
        id: 'pr-2',
        projectId: PROJECT_ID,
        taskId: 'task-ln-2',
        number: 2,
        title: 'Add-to-list button on article cards',
        authorId: 'agent-ada',
        reviewerId: 'agent-fern',
        sourceBranch: 'feature/add-to-list',
        baseBranch: 'main',
        state: 'open',
        openedAt: s.clock.now,
        mergedAt: null,
      },
    ],
  };
  s = log(s, 0, 'pull_request_opened', 'Ada opened pull request #2 for LN-2; Fern is reviewing.', {
    agentId: 'agent-ada',
    taskId: 'task-ln-2',
    pullRequestId: 'pr-2',
  });

  s = {
    ...s,
    testRuns: [
      ...s.testRuns,
      testRun('run-2-unit', 'pr-2', 'unit', 'passed', at(1), at(3), '31 simulated tests passed.'),
      testRun('run-2-build', 'pr-2', 'build', 'passed', at(1), at(4), 'Simulated build succeeded.'),
    ],
  };
  s = log(s, 4, 'check_passed', 'Unit tests and build passed on pull request #2.', {
    pullRequestId: 'pr-2',
    taskId: 'task-ln-2',
  });

  s = {
    ...s,
    reviewReports: [
      ...s.reviewReports,
      {
        id: 'review-2',
        pullRequestId: 'pr-2',
        reviewerId: 'agent-fern',
        status: 'approved',
        findings: [
          {
            id: 'finding-2-1',
            severity: 'non_blocking',
            message: 'Consider an aria-pressed state on the button.',
            resolved: false,
          },
        ],
        updatedAt: at(10),
      },
    ],
  };
  s = log(s, 10, 'review_approved', 'Fern approved pull request #2 with one non-blocking suggestion.', {
    agentId: 'agent-fern',
    pullRequestId: 'pr-2',
  });

  s = must(moveTask(advanceClock(s, 2), 'task-ln-2', 'qa'));
  s = {
    ...s,
    testRuns: [
      ...s.testRuns,
      testRun('run-2-browser', 'pr-2', 'browser', 'running', s.clock.now, null, 'Eli is running simulated browser checks.'),
    ],
  };
  return advanceClock(s, 8);
}

const BUILDERS: Readonly<Record<ScenarioId, () => WorkflowSnapshot>> = {
  'feature-in-progress': seedCompany,

  'review-and-qa-pass': () => {
    let s = ln2InQa();
    s = {
      ...s,
      testRuns: s.testRuns.map((r) =>
        r.id === 'run-2-browser'
          ? { ...r, status: 'passed', finishedAt: s.clock.now, summary: 'Simulated browser checks passed on desktop and 390px.' }
          : r,
      ),
    };
    return log(s, 0, 'check_passed', 'Eli: browser checks passed on pull request #2. It is ready to merge.', {
      agentId: 'agent-eli',
      pullRequestId: 'pr-2',
      testRunId: 'run-2-browser',
    });
  },

  'qa-failure': () =>
    must(failCheck(ln2InQa(), 'run-2-browser', 'The add button overlaps the article title at 390px wide.')),

  'agent-blocked': () => {
    let s = must(moveTask(advanceClock(seedCompany(), 25), 'task-ln-4', 'blocked'));
    s = log(s, 1, 'help_requested', 'Chen needs the LN-3 sync API before the offline cache can continue. Bruno is still on LN-3.', {
      agentId: 'agent-chen',
      taskId: 'task-ln-4',
    });
    return advanceClock(s, 4);
  },

  'successful-merge': () => must(mergePullRequest(advanceClock(BUILDERS['review-and-qa-pass'](), 5), 'pr-2')),
};

/** Builds a scenario from scratch. Same id, same data, every time. */
export function buildScenario(id: ScenarioId): WorkflowSnapshot {
  return { ...BUILDERS[id](), scenarioId: id };
}

export { SCENARIO_IDS };
