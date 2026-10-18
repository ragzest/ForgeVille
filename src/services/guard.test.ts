import { describe, expect, it } from 'vitest';
import { findExternalEffects } from './guard.ts';

// Raw source of everything the workflow runs on, minus tests and this guard's own pattern list.
const sources = import.meta.glob<string>(
  ['/src/domain/**/*.ts', '/src/services/**/*.ts', '/src/store/**/*.ts', '!**/*.test.ts', '!/src/services/guard.ts'],
  { query: '?raw', import: 'default', eager: true },
);

describe('external-effect guard', () => {
  it('scans the mock service, domain, and store sources', () => {
    const files = Object.keys(sources);
    expect(files).toContain('/src/services/mock/service.ts');
    expect(files).toContain('/src/services/mock/scenarios.ts');
    expect(files).toContain('/src/store/workflowStore.ts');
    expect(files).toContain('/src/domain/policy.ts');
  });

  it.each(Object.entries(sources))('%s has no process, network, GitHub, or agent SDK access', (_file, source) => {
    expect(findExternalEffects(source)).toEqual([]);
  });

  it('scenario construction does not use Math.random', () => {
    for (const [file, source] of Object.entries(sources)) {
      expect(source.includes('Math.random'), file).toBe(false);
    }
  });

  it('catches the things it forbids', () => {
    expect(findExternalEffects("import { spawn } from 'node:child_process';")).toEqual(['child_process import']);
    expect(findExternalEffects("const cp = require('child_process');")).toEqual(['child_process import']);
    expect(findExternalEffects("import { Octokit } from '@octokit/rest';")).toEqual(['GitHub client import']);
    expect(findExternalEffects("await fetch('https://api.github.com/repos')")).toEqual(['fetch call', 'GitHub API URL']);
    expect(findExternalEffects('const ws = new WebSocket(url);')).toEqual(['WebSocket']);
    expect(findExternalEffects("import Anthropic from '@anthropic-ai/sdk';")).toEqual(['agent SDK import']);
    expect(findExternalEffects('const x = prefetchList();')).toEqual([]);
  });
});
