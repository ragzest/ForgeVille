import { useState } from 'react';
import { createMockWorkflowService, DEFAULT_SCENARIO } from '../services/mock/index.ts';
import { WorkflowProvider } from '../store/WorkflowProvider.tsx';
import { createWorkflowStore, type WorkflowStore } from '../store/workflowStore.ts';
import { scenarioFromSearch } from './scenarioQuery.ts';
import { AppShell } from './shell/AppShell.tsx';
import type { ShellEnvironment } from './shell/environment.ts';
import './shell/shell.css';

interface AppProps {
  environment?: ShellEnvironment;
  store?: WorkflowStore;
}

export function App({ environment, store }: AppProps) {
  // Start on the scenario named in `?scenario=`, if any.
  const [workflow] = useState(
    () =>
      store ??
      createWorkflowStore(
        createMockWorkflowService(scenarioFromSearch(environment?.search ?? window.location.search) ?? DEFAULT_SCENARIO),
      ),
  );
  return (
    <WorkflowProvider store={workflow}>
      {environment ? <AppShell environment={environment} /> : <AppShell />}
    </WorkflowProvider>
  );
}
