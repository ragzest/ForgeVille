import type { WorkflowSnapshot } from './types.ts';

/**
 * Outcome of a domain command. On failure the snapshot is the unchanged input.
 * `CommandResult` in `services/ports.ts` is this type.
 */
export type CommandOutcome =
  | { readonly ok: true; readonly snapshot: WorkflowSnapshot }
  | { readonly ok: false; readonly reason: string; readonly snapshot: WorkflowSnapshot };

export function succeed(snapshot: WorkflowSnapshot): CommandOutcome {
  return { ok: true, snapshot };
}

export function refuse(snapshot: WorkflowSnapshot, reason: string): CommandOutcome {
  return { ok: false, reason, snapshot };
}
