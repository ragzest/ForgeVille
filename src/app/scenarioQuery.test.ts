import { describe, expect, it } from 'vitest';
import { DEFAULT_SCENARIO } from '../services/mock/index.ts';
import { readScenarioQuery, scenarioFromSearch, withScenario } from './scenarioQuery.ts';

describe('scenarioFromSearch', () => {
  it('reads a known scenario id', () => {
    expect(scenarioFromSearch('?scenario=agent-blocked')).toBe('agent-blocked');
    expect(scenarioFromSearch('?shell=error&scenario=successful-merge')).toBe('successful-merge');
  });

  it('ignores a missing or unknown id', () => {
    expect(scenarioFromSearch('')).toBeNull();
    expect(scenarioFromSearch('?scenario=nope')).toBeNull();
  });
});

describe('readScenarioQuery', () => {
  it('starts on a known id with nothing to report', () => {
    expect(readScenarioQuery('?scenario=qa-failure')).toEqual({ id: 'qa-failure', unknown: null });
  });

  it('uses the default when the parameter is absent', () => {
    expect(readScenarioQuery('')).toEqual({ id: DEFAULT_SCENARIO, unknown: null });
  });

  it('falls back to the default and reports an unknown id', () => {
    expect(readScenarioQuery('?scenario=nope')).toEqual({ id: DEFAULT_SCENARIO, unknown: 'nope' });
    expect(readScenarioQuery('?scenario=')).toEqual({ id: DEFAULT_SCENARIO, unknown: '' });
  });
});

describe('withScenario', () => {
  it('sets the scenario and keeps other parameters', () => {
    expect(withScenario('', 'qa-failure')).toBe('?scenario=qa-failure');
    expect(withScenario('?shell=error&scenario=nope', 'agent-blocked')).toBe('?shell=error&scenario=agent-blocked');
  });

  it('round-trips through readScenarioQuery', () => {
    expect(readScenarioQuery(withScenario('?x=1', 'successful-merge')).id).toBe('successful-merge');
  });
});
