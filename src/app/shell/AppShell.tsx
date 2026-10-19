import { useCallback, useEffect, useState } from 'react';
import { bootShell, type BootResult, type ShellStatus } from './boot.ts';
import { browserEnvironment, type ShellEnvironment } from './environment.ts';
import { PreferencesContext, type ShellPreferences } from './preferences.ts';
import { InteractionPanel } from '../../features/navigation/InteractionPanel.tsx';
import { useNavigation } from '../../store/navigation.ts';
import { useWorkflow } from '../../store/context.ts';
import { themeCssVars } from '../../ui/themes.ts';
import { floorById, floorTitle, occupantOf } from '../../world/building.ts';
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

  // The page chrome takes the current floor's accent.
  const floor = floorById(useNavigation((s) => s.floor));
  const occupant = useWorkflow((s) => occupantOf(s.snapshot, floor.id)?.name ?? null);

  // Ready only once the canvas has mounted.
  const status: ShellStatus = state.status === 'ready' && !officeMounted ? 'loading' : state.status;

  return (
    <PreferencesContext.Provider value={preferences}>
      <div
        className="shell"
        data-shell-status={status}
        data-reduced-motion={preferences.reducedMotion}
        data-floor={floor.id}
        style={themeCssVars(floor.theme)}
      >
        <header className="shell-header">
          <h1>
            <span className="brand-mark" aria-hidden="true">
              ✻
            </span>
            ForgeVille
          </h1>
          <p className="floor-chip" aria-label={`You are on ${floorTitle(floor)}`}>
            <span className="floor-chip-level">{floor.level}</span>
            {floor.theme.name}
            <span className="floor-chip-occupant">{occupant ? `${occupant} team` : 'Vacant'}</span>
          </p>
          <p className="shell-tag">
            <span className="sim-tag">Simulated</span> Nothing here runs real agents.
          </p>
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
        {/* Object panels. Empty, with nothing focusable, until one opens. */}
        <div id="overlay-root" className="shell-overlays" data-testid="overlay-root">
          {((state.status === 'ready' && officeMounted) || state.status === 'no-webgl') && <InteractionPanel />}
        </div>
      </div>
    </PreferencesContext.Provider>
  );
}
