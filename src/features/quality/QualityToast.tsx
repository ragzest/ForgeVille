import { useEffect } from 'react';
import { useQuality } from '../../store/quality.ts';

/** How long the toast stays before it dismisses itself. */
export const TOAST_MS = 6000;

/** Says so when Auto drops a tier. Polite, and gone after a few seconds. */
export function QualityToast() {
  const notice = useQuality((s) => s.notice);
  const dismiss = useQuality((s) => s.dismissNotice);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(dismiss, TOAST_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [notice, dismiss]);
  return (
    <div className="quality-toast-region" role="status" aria-live="polite">
      {notice && (
        <div key={notice.seq} className="quality-toast">
          <p>{notice.message}</p>
          <button type="button" className="is-quiet" aria-label="Dismiss" onClick={dismiss}>
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
