import { WorkflowProvider } from '../store/WorkflowProvider.tsx';
import type { WorkflowStore } from '../store/workflowStore.ts';
import { AppShell } from './shell/AppShell.tsx';
import type { ShellEnvironment } from './shell/environment.ts';
import './shell/shell.css';

interface AppProps {
  environment?: ShellEnvironment;
  store?: WorkflowStore;
}

export function App({ environment, store }: AppProps) {
  return (
    <WorkflowProvider {...(store ? { store } : {})}>
      {environment ? <AppShell environment={environment} /> : <AppShell />}
    </WorkflowProvider>
  );
}
