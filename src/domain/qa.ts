import { appendEvent } from './events.ts';
import { CHECK_LABELS, returnToAuthor } from './policy.ts';
import { refuse, succeed, type CommandOutcome } from './result.ts';
import type { TestRunId, WorkflowSnapshot } from './types.ts';

/**
 * A required check failed. Marks the run failed with a reason, sends the task
 * back to `in_progress` for the authoring agent, and appends a failure event.
 */
export function failCheck(snapshot: WorkflowSnapshot, testRunId: TestRunId, failureReason: string): CommandOutcome {
  const run = snapshot.testRuns.find((r) => r.id === testRunId);
  if (!run) return refuse(snapshot, `Test run ${testRunId} does not exist.`);

  const pullRequest = snapshot.pullRequests.find((pr) => pr.id === run.pullRequestId);
  if (!pullRequest) return refuse(snapshot, `Pull request ${run.pullRequestId} does not exist.`);
  const label = `Pull request #${String(pullRequest.number)}`;
  if (pullRequest.state !== 'open') return refuse(snapshot, `${label} is ${pullRequest.state}.`);

  const task = snapshot.tasks.find((t) => t.id === pullRequest.taskId);
  if (!task || (task.column !== 'in_progress' && task.column !== 'in_review' && task.column !== 'qa')) {
    return refuse(snapshot, `${task?.issueKey ?? 'The task'} is not under test.`);
  }

  const now = snapshot.clock.now;
  const withRun: WorkflowSnapshot = {
    ...snapshot,
    testRuns: snapshot.testRuns.map((r) =>
      r.id === run.id ? { ...r, status: 'failed', finishedAt: now, failureReason } : r,
    ),
  };

  const check = CHECK_LABELS[run.check];
  return succeed(
    appendEvent(
      returnToAuthor(withRun, pullRequest),
      'check_failed',
      `${check} failed on ${label}: ${failureReason} ${task.issueKey} is back with its author.`,
      {
        projectId: pullRequest.projectId,
        agentId: pullRequest.authorId,
        taskId: task.id,
        pullRequestId: pullRequest.id,
        testRunId: run.id,
      },
    ),
  );
}
