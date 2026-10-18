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

export function OfficeView() {
  return (
    <section className="shell-region" aria-label="Office">
      <p>The 3D office will appear here.</p>
    </section>
  );
}

/** Non-3D path. Placeholder regions until E04 (team) and E06 (board). */
export function FallbackView() {
  return (
    <>
      <div className="shell-panel shell-panel--notice" role="status">
        <h2>The 3D office cannot start</h2>
        <p>WebGL is not available in this browser. You can still use the 2D view below.</p>
      </div>
      <div className="shell-fallback">
        <section className="shell-region" aria-labelledby="fallback-team-heading">
          <h2 id="fallback-team-heading">Team</h2>
          <p>No agents to show yet.</p>
        </section>
        <section className="shell-region" aria-labelledby="fallback-board-heading">
          <h2 id="fallback-board-heading">Board</h2>
          <p>No tasks to show yet.</p>
        </section>
      </div>
    </>
  );
}
