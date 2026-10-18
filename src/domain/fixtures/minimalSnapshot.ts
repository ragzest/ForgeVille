import type { WorkflowSnapshot } from '../types.ts';

/**
 * Smallest snapshot that exercises every entity type. For tests only;
 * demo scenarios live in the mock service.
 */
export function minimalSnapshot(): WorkflowSnapshot {
  return {
    scenarioId: 'feature-in-progress',
    clock: { now: '2026-01-05T10:00:00.000Z' },
    projects: [{ id: 'project-forgeville', name: 'ForgeVille', description: 'The office itself.' }],
    agents: [
      {
        id: 'agent-ada',
        projectId: 'project-forgeville',
        name: 'Ada',
        role: 'Developer',
        avatar: 'fox',
        runtimeLabel: 'Claude Code',
        modelLabel: 'Opus',
        mockUsage: { isMockEstimate: true, tokens: 12_000, costUsd: 0.4 },
      },
      {
        id: 'agent-rex',
        projectId: 'project-forgeville',
        name: 'Rex',
        role: 'Reviewer',
        avatar: 'owl',
        runtimeLabel: 'Codex',
        modelLabel: 'GPT',
        mockUsage: null,
      },
    ],
    tasks: [
      {
        id: 'task-login',
        projectId: 'project-forgeville',
        issueKey: 'FV-1',
        title: 'Add login screen',
        column: 'in_review',
        blockedFrom: null,
        assigneeId: 'agent-ada',
        priority: 'high',
        dependsOn: [],
        branch: 'feature/login',
        pullRequestId: 'pr-login',
      },
    ],
    sessions: [
      {
        id: 'session-ada-1',
        agentId: 'agent-ada',
        taskId: 'task-login',
        state: 'running',
        startedAt: '2026-01-05T09:00:00.000Z',
        lastActivityAt: '2026-01-05T09:55:00.000Z',
        transcript: [
          { timestamp: '2026-01-05T09:00:00.000Z', stream: 'system', text: 'Simulated session started.' },
          { timestamp: '2026-01-05T09:55:00.000Z', stream: 'stdout', text: 'Opened pull request #1.' },
        ],
      },
    ],
    pullRequests: [
      {
        id: 'pr-login',
        projectId: 'project-forgeville',
        taskId: 'task-login',
        number: 1,
        title: 'Add login screen',
        authorId: 'agent-ada',
        reviewerId: 'agent-rex',
        sourceBranch: 'feature/login',
        baseBranch: 'main',
        state: 'open',
        openedAt: '2026-01-05T09:55:00.000Z',
        mergedAt: null,
      },
    ],
    testRuns: [
      {
        id: 'run-login-unit',
        pullRequestId: 'pr-login',
        check: 'unit',
        status: 'passed',
        startedAt: '2026-01-05T09:56:00.000Z',
        finishedAt: '2026-01-05T09:57:00.000Z',
        summary: '12 simulated tests passed.',
        failureReason: null,
      },
    ],
    reviewReports: [
      {
        id: 'review-login',
        pullRequestId: 'pr-login',
        reviewerId: 'agent-rex',
        status: 'pending',
        findings: [
          { id: 'finding-login-1', severity: 'non_blocking', message: 'Rename the submit handler.', resolved: false },
        ],
        updatedAt: '2026-01-05T09:58:00.000Z',
      },
    ],
    events: [
      {
        id: 'event-1',
        timestamp: '2026-01-05T09:55:00.000Z',
        type: 'pull_request_opened',
        message: 'Ada opened pull request #1 for FV-1.',
        links: { agentId: 'agent-ada', taskId: 'task-login', pullRequestId: 'pr-login' },
      },
    ],
  };
}
