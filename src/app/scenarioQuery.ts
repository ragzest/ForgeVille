import { SCENARIO_IDS, type ScenarioId } from '../domain/index.ts';
import { DEFAULT_SCENARIO } from '../services/mock/index.ts';

/**
 * The scenario named by `?scenario=` in a query string, or null when absent
 * or unknown.
 */
export function scenarioFromSearch(search: string): ScenarioId | null {
  const value = new URLSearchParams(search).get('scenario');
  return SCENARIO_IDS.find((id) => id === value) ?? null;
}

export interface ScenarioQuery {
  /** Scenario to start on: the one asked for, or the default. */
  readonly id: ScenarioId;
  /** The `?scenario=` value when it names no scenario, for the fallback notice. */
  readonly unknown: string | null;
}

/** Reads `?scenario=`, falling back to the default scenario and reporting an unknown id. */
export function readScenarioQuery(search: string): ScenarioQuery {
  const value = new URLSearchParams(search).get('scenario');
  const id = scenarioFromSearch(search);
  return { id: id ?? DEFAULT_SCENARIO, unknown: id === null && value !== null ? value : null };
}

/** The query string with `scenario=` set to `id`. Other parameters are kept. */
export function withScenario(search: string, id: ScenarioId): string {
  const params = new URLSearchParams(search);
  params.set('scenario', id);
  return `?${params.toString()}`;
}
