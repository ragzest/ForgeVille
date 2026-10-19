import { SCENARIOS } from '../../services/mock/index.ts';
import { useWorkflow } from '../../store/context.ts';

/**
 * Says that `?scenario=` named no scenario and which one loaded instead.
 * Non-blocking: it sits under the header and never takes focus.
 */
export function ScenarioNotice({ unknown, onDismiss }: { unknown: string; onDismiss: () => void }) {
  const current = useWorkflow((s) => s.snapshot.scenarioId);
  const title = SCENARIOS.find((s) => s.id === current)?.title ?? current;

  return (
    <div className="scenario-notice" role="status" data-testid="scenario-notice">
      <p>
        There is no scenario called <code>{unknown || '(empty)'}</code>. Showing <strong>{title}</strong> instead.
      </p>
      <button type="button" className="panel-close" onClick={onDismiss} aria-label="Dismiss notice">
        ×
      </button>
    </div>
  );
}
