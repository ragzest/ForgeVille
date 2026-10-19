import { useState } from 'react';
import { createMockWorkflowService } from '../services/mock/index.ts';
import { WorkflowProvider } from '../store/WorkflowProvider.tsx';
import { createWorkflowStore, type WorkflowStore } from '../store/workflowStore.ts';
import { readScenarioQuery } from './scenarioQuery.ts';
import { AppShell } from './shell/AppShell.tsx';
import type { ShellEnvironment } from './shell/environment.ts';
import './shell/shell.css';

interface AppProps {
  environment?: ShellEnvironment;
  store?: WorkflowStore;
}

export function App({ environment, store }: AppProps) {
  // Start on the scenario named in `?scenario=`, or the default when it is absent or unknown.
  const [workflow] = useState(
    () =>
      store ??
      createWorkflowStore(
        createMockWorkflowService(readScenarioQuery(environment?.search ?? window.location.search).id),
      ),
  );
  return (
    <WorkflowProvider store={workflow}>
      {environment ? <AppShell environment={environment} /> : <AppShell />}
    </WorkflowProvider>
  );
}
