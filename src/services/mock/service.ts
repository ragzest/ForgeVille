import {
  advanceClock,
  interruptSession,
  mergePullRequest,
  moveTask,
  pauseSession,
  requestChanges,
  resumeSession,
  type CommandOutcome,
  type ScenarioId,
  type WorkflowSnapshot,
} from '../../domain/index.ts';
import type { CommandResult, WorkflowPort } from '../ports.ts';
import { buildScenario } from './scenarios.ts';

export const DEFAULT_SCENARIO: ScenarioId = 'feature-in-progress';

/** Each accepted command moves the scenario clock on by this much. */
export const COMMAND_TICK_MINUTES = 1;

/**
 * In-memory workflow backend. Commands delegate to domain functions; nothing
 * leaves the page. A refused command returns the unchanged snapshot.
 */
export function createMockWorkflowService(initial: ScenarioId = DEFAULT_SCENARIO): WorkflowPort {
  let current: WorkflowSnapshot = buildScenario(initial);

  const run = (command: (s: WorkflowSnapshot) => CommandOutcome): CommandResult => {
    const result = command(advanceClock(current, COMMAND_TICK_MINUTES));
    if (!result.ok) return { ok: false, reason: result.reason, snapshot: current };
    current = result.snapshot;
    return result;
  };

  return {
    getSnapshot: () => current,
    loadScenario: (id) => {
      current = buildScenario(id);
      return current;
    },
    moveTask: (taskId, to) => run((s) => moveTask(s, taskId, to)),
    pauseSession: (sessionId) => run((s) => pauseSession(s, sessionId)),
    resumeSession: (sessionId) => run((s) => resumeSession(s, sessionId)),
    interruptSession: (sessionId) => run((s) => interruptSession(s, sessionId)),
    requestChanges: (pullRequestId, findingId) => run((s) => requestChanges(s, pullRequestId, findingId)),
    mergePullRequest: (pullRequestId) => run((s) => mergePullRequest(s, pullRequestId)),
  };
}
