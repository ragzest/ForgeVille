import { SCENARIO_IDS, type ScenarioId } from '../domain/index.ts';

/**
 * The scenario named by `?scenario=` in a query string, or null when absent
 * or unknown. S09-01 adds the switcher, URL updates, and an unknown-id notice.
 */
export function scenarioFromSearch(search: string): ScenarioId | null {
  const value = new URLSearchParams(search).get('scenario');
  return SCENARIO_IDS.find((id) => id === value) ?? null;
}
