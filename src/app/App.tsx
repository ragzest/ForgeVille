import { AppShell } from './shell/AppShell.tsx';
import type { ShellEnvironment } from './shell/environment.ts';
import './shell/shell.css';

interface AppProps {
  environment?: ShellEnvironment;
}

export function App({ environment }: AppProps) {
  return environment ? <AppShell environment={environment} /> : <AppShell />;
}
