import type { StoreApi } from 'zustand/vanilla';
import type { ScenarioId, WorkflowSnapshot } from '../domain/index.ts';
import { agentIdFromDesk } from '../features/desks/deskDetails.ts';
import type { InteractionState } from '../store/interaction.ts';
import type { NavigationState } from '../store/navigation.ts';
import type { WorkflowStore } from '../store/workflowStore.ts';
import { withScenario } from './scenarioQuery.ts';

export interface SwitchScenarioDeps {
  readonly workflow: WorkflowStore;
  readonly interaction: StoreApi<InteractionState>;
  readonly navigation: StoreApi<NavigationState>;
  /** The address bar's query string. Omitted in tests that do not care about the URL. */
  readonly url?: { readonly read: () => string; readonly write: (search: string) => void };
}

/** True when an interaction target still points at something in the snapshot. */
function targetExists(snapshot: WorkflowSnapshot, id: string): boolean {
  const agentId = agentIdFromDesk(id);
  return agentId === null || snapshot.agents.some((a) => a.id === agentId);
}

/**
 * Loads a scenario and drops selections that point at things the new
 * scenario does not have. The floor, view, and player position stay put.
 */
export function switchScenario(id: ScenarioId, deps: SwitchScenarioDeps): void {
  deps.workflow.getState().loadScenario(id);
  const snapshot = deps.workflow.getState().snapshot;

  const nav = deps.navigation.getState();
  if (nav.selectedTaskId !== null && !snapshot.tasks.some((t) => t.id === nav.selectedTaskId)) nav.selectTask(null);

  const interaction = deps.interaction.getState();
  if (interaction.open && !targetExists(snapshot, interaction.open.id)) interaction.close();
  if (interaction.focused && !targetExists(snapshot, interaction.focused.id)) interaction.setFocused(null);

  if (deps.url) deps.url.write(withScenario(deps.url.read(), id));
}
