import { useState, type ReactNode } from 'react';
import { WorkflowStoreContext } from './context.ts';
import { createWorkflowStore, type WorkflowStore } from './workflowStore.ts';

interface Props {
  /** Defaults to a store over the mock workflow service. */
  store?: WorkflowStore;
  children: ReactNode;
}

/** Makes one shared workflow store available to the panels and the 3D office. */
export function WorkflowProvider({ store, children }: Props) {
  const [value] = useState(() => store ?? createWorkflowStore());
  return <WorkflowStoreContext.Provider value={value}>{children}</WorkflowStoreContext.Provider>;
}
