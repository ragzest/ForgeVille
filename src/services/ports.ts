import type { ScenarioId, TaskColumn, WorkflowSnapshot } from '../domain/index.ts';

/** Every command returns the resulting snapshot; failures leave it unchanged. */
export type CommandResult =
  | { readonly ok: true; readonly snapshot: WorkflowSnapshot }
  | { readonly ok: false; readonly reason: string; readonly snapshot: WorkflowSnapshot };

/**
 * What any workflow backend must implement. Milestone 0 ships only the mock.
 * Future adapters implement this same interface and are never imported by milestone-0 UI.
 */
export interface WorkflowPort {
  getSnapshot(): WorkflowSnapshot;
  loadScenario(id: ScenarioId): WorkflowSnapshot;
  moveTask(taskId: string, to: TaskColumn): CommandResult;
  pauseSession(sessionId: string): CommandResult;
  resumeSession(sessionId: string): CommandResult;
  interruptSession(sessionId: string): CommandResult;
  requestChanges(pullRequestId: string, findingId?: string): CommandResult;
  mergePullRequest(pullRequestId: string): CommandResult;
}
