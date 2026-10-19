import { lazy, Suspense } from 'react';
import { FloorBanner } from '../../features/building/FloorBanner.tsx';
import { ControlHint } from '../../features/navigation/ControlHint.tsx';
import { fontsReady } from '../../ui/fonts.ts';
import { InteractHint } from '../../features/navigation/InteractHint.tsx';
import { NavigationToolbar } from '../../features/navigation/NavigationToolbar.tsx';
import { TwoDView } from '../../features/navigation/TwoDView.tsx';
import { useNavigation } from '../../store/navigation.ts';
import { PerfReadout } from '../../features/quality/PerfReadout.tsx';
import { QualityToast } from '../../features/quality/QualityToast.tsx';
import { PERF_READOUT } from '../../world/perfStats.ts';
import { useInteractionKeys } from '../../features/navigation/useInteractionKeys.ts';
import { CanvasErrorBoundary } from './CanvasErrorBoundary.tsx';

interface ErrorViewProps {
  message: string;
  onRetry: () => void;
  onUseTwoD: () => void;
}

export function LoadingView() {
  return (
    <div className="shell-panel" role="status" aria-live="polite">
      <p className="loading-line">
        <span className="loading-spinner" aria-hidden="true">
          ✻
        </span>
        Starting ForgeVille…
      </p>
      <p className="shell-panel-note">Setting out desks and painting the signs.</p>
    </div>
  );
}

export function ErrorView({ message, onRetry, onUseTwoD }: ErrorViewProps) {
  return (
    <div className="shell-panel shell-panel--error" role="alert">
      <h2>
        <span aria-hidden="true">✕</span> The office hit a snag
      </h2>
      <p>{message}</p>
      <p className="shell-panel-note">Nothing is lost: the office is simulated, and the 2D view has the same team and board.</p>
      <div className="shell-panel-actions">
        <button type="button" onClick={onRetry}>
          Retry
        </button>
        <button type="button" className="is-quiet" onClick={onUseTwoD}>
          Use the 2D view
        </button>
      </div>
    </div>
  );
}

// Signs and screens are painted once, so wait (briefly) for the bundled fonts first.
const OfficeCanvas = lazy(() => Promise.all([import('../../world/OfficeCanvas.tsx'), fontsReady()]).then(([module]) => module));

interface OfficeViewProps {
  mounted: boolean;
  reducedMotion: boolean;
  onReady: () => void;
  onError: (message: string) => void;
}

/**
 * The 3D office with its navigation toolbar. Shows the loading state until the
 * canvas reports it has mounted. The 2D view replaces the canvas when chosen.
 */
export function OfficeView({ mounted, reducedMotion, onReady, onError }: OfficeViewProps) {
  useInteractionKeys();
  const view = useNavigation((s) => s.view);
  const twoD = view === '2d';
  return (
    <>
      {mounted && <NavigationToolbar webgl />}
      {twoD ? (
        <TwoDView />
      ) : (
        <section className="office" aria-label="Office" aria-busy={!mounted}>
          <div className="office-canvas" data-testid="office-canvas">
            <CanvasErrorBoundary onError={onError}>
              <Suspense fallback={null}>
                <OfficeCanvas onReady={onReady} reducedMotion={reducedMotion} />
              </Suspense>
            </CanvasErrorBoundary>
          </div>
          {mounted && <FloorBanner />}
          {mounted && <InteractHint />}
          {mounted && <ControlHint />}
          {mounted && <QualityToast />}
          {mounted && PERF_READOUT && <PerfReadout />}
          {!mounted && (
            <div className="office-loading">
              <LoadingView />
            </div>
          )}
        </section>
      )}
    </>
  );
}

interface FallbackViewProps {
  /** `no-webgl`: the browser has no WebGL. `crashed`: the 3D office failed and the visitor chose 2D. */
  reason: 'no-webgl' | 'crashed';
  onRetry: () => void;
}

/** Non-3D path: the same 2D view the user can choose, with zone selection and desk panels. */
export function FallbackView({ reason, onRetry }: FallbackViewProps) {
  useInteractionKeys();
  return (
    <>
      <div className="shell-panel shell-panel--notice" role="status">
        {reason === 'no-webgl' ? (
          <>
            <h2>The 3D office cannot start</h2>
            <p>WebGL is not available in this browser. You can still use the 2D view below.</p>
          </>
        ) : (
          <>
            <h2>Using the 2D view</h2>
            <p>The 3D office stopped, so here is the same team and board without it.</p>
            <button type="button" className="is-quiet" onClick={onRetry}>
              Try the 3D office again
            </button>
          </>
        )}
      </div>
      <NavigationToolbar webgl={false} />
      <TwoDView />
    </>
  );
}
