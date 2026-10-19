import type { ScenarioId } from '../../domain/index.ts';
import { SCENARIOS } from '../../services/mock/index.ts';
import { useWorkflow } from '../../store/context.ts';

/**
 * Picks one of the five demo scenarios. The selected value is read from the
 * snapshot, so the control never disagrees with what the views show.
 */
export function ScenarioSwitcher({ onSwitch }: { onSwitch: (id: ScenarioId) => void }) {
  const current = useWorkflow((s) => s.snapshot.scenarioId);
  const info = SCENARIOS.find((s) => s.id === current);

  return (
    <div className="scenario-switcher">
      <label htmlFor="scenario-select">Scenario</label>
      <select
        id="scenario-select"
        value={current}
        aria-describedby="scenario-summary"
        onChange={(e) => {
          const next = SCENARIOS.find((s) => s.id === e.target.value);
          if (next) onSwitch(next.id);
        }}
      >
        {SCENARIOS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.title}
          </option>
        ))}
      </select>
      <span id="scenario-summary" className="visually-hidden">
        {info?.summary}
      </span>
    </div>
  );
}
