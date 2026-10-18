import { lazy, Suspense } from 'react';
import { ControlHint } from '../../features/navigation/ControlHint.tsx';
import { InteractHint } from '../../features/navigation/InteractHint.tsx';
import { NavigationToolbar } from '../../features/navigation/NavigationToolbar.tsx';
import { TwoDView } from '../../features/navigation/TwoDView.tsx';
import { useNavigation } from '../../store/navigation.ts';
import { useInteractionKeys } from '../../features/navigation/useInteractionKeys.ts';
import { CanvasErrorBoundary } from './CanvasErrorBoundary.tsx';

interface ErrorViewProps {
  message: string;
  onRetry: () => void;
}

export function LoadingView() {
  return (
    <div className="shell-panel" role="status" aria-live="polite">
      <p>Starting ForgeVille…</p>
    </div>
  );
}

export function ErrorView({ message, onRetry }: ErrorViewProps) {
  return (
    <div className="shell-panel shell-panel--error" role="alert">
      <h2>Something went wrong</h2>
      <p>{message}</p>
      <button type="button" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

const OfficeCanvas = lazy(() => import('../../world/OfficeCanvas.tsx'));

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
          {mounted && <InteractHint />}
          {mounted && <ControlHint />}
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

/** Non-3D path: the same 2D view the user can choose, with zone selection and desk panels. */
export function FallbackView() {
  useInteractionKeys();
  return (
    <>
      <div className="shell-panel shell-panel--notice" role="status">
        <h2>The 3D office cannot start</h2>
        <p>WebGL is not available in this browser. You can still use the 2D view below.</p>
      </div>
      <NavigationToolbar webgl={false} />
      <TwoDView />
    </>
  );
}
