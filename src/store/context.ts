import { createContext, useContext } from 'react';
import { useStore } from 'zustand';
import type { WorkflowState, WorkflowStore } from './workflowStore.ts';

export const WorkflowStoreContext = createContext<WorkflowStore | null>(null);

/** Reads a slice of the shared workflow state; re-renders only when that slice changes. */
export function useWorkflow<T>(selector: (state: WorkflowState) => T): T {
  const store = useContext(WorkflowStoreContext);
  if (!store) throw new Error('useWorkflow must be used inside <WorkflowProvider>.');
  return useStore(store, selector);
}
