import { createStore, type StoreApi } from 'zustand/vanilla';
import type { ScenarioId, TaskColumn, WorkflowSnapshot } from '../domain/index.ts';
import { createMockWorkflowService } from '../services/mock/index.ts';
import type { CommandResult, WorkflowPort } from '../services/ports.ts';

export interface WorkflowState {
  /** The one domain snapshot every view reads. */
  readonly snapshot: WorkflowSnapshot;
  /** Outcome of the most recent command, for showing refusal reasons. */
  readonly lastResult: CommandResult | null;

  loadScenario(id: ScenarioId): void;
  moveTask(taskId: string, to: TaskColumn): CommandResult;
  pauseSession(sessionId: string): CommandResult;
  resumeSession(sessionId: string): CommandResult;
  interruptSession(sessionId: string): CommandResult;
  requestChanges(pullRequestId: string, findingId?: string): CommandResult;
  mergePullRequest(pullRequestId: string): CommandResult;
}

export type WorkflowStore = StoreApi<WorkflowState>;

/**
 * Shared store over a workflow port. It never edits the snapshot itself:
 * every change comes back from a port command.
 */
export function createWorkflowStore(port: WorkflowPort = createMockWorkflowService()): WorkflowStore {
  return createStore<WorkflowState>()((set) => {
    const dispatch = (result: CommandResult): CommandResult => {
      set({ snapshot: result.snapshot, lastResult: result });
      return result;
    };

    return {
      snapshot: port.getSnapshot(),
      lastResult: null,
      loadScenario: (id) => {
        set({ snapshot: port.loadScenario(id), lastResult: null });
      },
      moveTask: (taskId, to) => dispatch(port.moveTask(taskId, to)),
      pauseSession: (sessionId) => dispatch(port.pauseSession(sessionId)),
      resumeSession: (sessionId) => dispatch(port.resumeSession(sessionId)),
      interruptSession: (sessionId) => dispatch(port.interruptSession(sessionId)),
      requestChanges: (pullRequestId, findingId) => dispatch(port.requestChanges(pullRequestId, findingId)),
      mergePullRequest: (pullRequestId) => dispatch(port.mergePullRequest(pullRequestId)),
    };
  });
}
