import { useCallback, useEffect, useState } from 'react';
import { bootShell, type BootResult, type ShellStatus } from './boot.ts';
import { browserEnvironment, type ShellEnvironment } from './environment.ts';
import { PreferencesContext, type ShellPreferences } from './preferences.ts';
import { InteractionPanel } from '../../features/navigation/InteractionPanel.tsx';
import { ErrorView, FallbackView, LoadingView, OfficeView } from './ShellViews.tsx';

interface AppShellProps {
  environment?: ShellEnvironment;
}

type ShellState = { status: 'loading' } | BootResult;

export function AppShell({ environment }: AppShellProps) {
  const [env] = useState<ShellEnvironment>(() => environment ?? browserEnvironment());
  const [preferences] = useState<ShellPreferences>(() => ({ reducedMotion: env.prefersReducedMotion() }));
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ShellState>({ status: 'loading' });
  const [officeMounted, setOfficeMounted] = useState(false);

  // Boot after the loading state has painted.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setState(bootShell(env, attempt));
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [env, attempt]);

  const retry = () => {
    setState({ status: 'loading' });
    setOfficeMounted(false);
    setAttempt((n) => n + 1);
  };

  const markOfficeReady = useCallback(() => {
    setOfficeMounted(true);
  }, []);
  const failOffice = useCallback((message: string) => {
    setState({ status: 'error', message });
  }, []);

  // Ready only once the canvas has mounted.
  const status: ShellStatus = state.status === 'ready' && !officeMounted ? 'loading' : state.status;

  return (
    <PreferencesContext.Provider value={preferences}>
      <div className="shell" data-shell-status={status} data-reduced-motion={preferences.reducedMotion}>
        <header className="shell-header">
          <h1>ForgeVille</h1>
          <p className="shell-tag">Simulated office. Nothing here runs real agents.</p>
        </header>
        <main className="shell-main" aria-busy={status === 'loading'}>
          {state.status === 'loading' && <LoadingView />}
          {state.status === 'error' && <ErrorView message={state.message} onRetry={retry} />}
          {state.status === 'no-webgl' && <FallbackView />}
          {state.status === 'ready' && (
            <OfficeView
              mounted={officeMounted}
              reducedMotion={preferences.reducedMotion}
              onReady={markOfficeReady}
              onError={failOffice}
            />
          )}
        </main>
        {/* Panels mount here in later stories. Empty, with nothing focusable. */}
        <div id="overlay-root" className="shell-overlays" data-testid="overlay-root">
          {state.status === 'ready' && officeMounted && <InteractionPanel />}
        </div>
      </div>
    </PreferencesContext.Provider>
  );
}
