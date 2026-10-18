import { describe, expect, it } from 'vitest';
import { scenarioFromSearch } from './scenarioQuery.ts';

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
