/**
 * Milestone 0 performs no external engineering operations: no processes,
 * no network calls to GitHub or agent vendors, no terminal spawn.
 * `findExternalEffects` reports source that would break that rule; a unit
 * test runs it over the domain, service, and store code.
 */
export const FORBIDDEN_PATTERNS: readonly { readonly label: string; readonly pattern: RegExp }[] = [
  { label: 'child_process import', pattern: /['"](node:)?child_process['"]/ },
  { label: 'worker_threads import', pattern: /['"](node:)?worker_threads['"]/ },
  { label: 'node net/http import', pattern: /['"](node:)?(net|http|https|http2|tls|dgram)['"]/ },
  { label: 'GitHub client import', pattern: /['"](@octokit\/[\w-]+|octokit|@actions\/github)['"]/ },
  { label: 'agent SDK import', pattern: /['"](@anthropic-ai\/[\w-]+|openai|@openai\/[\w-]+)['"]/ },
  { label: 'fetch call', pattern: /\bfetch\s*\(/ },
  { label: 'XMLHttpRequest', pattern: /\bXMLHttpRequest\b/ },
  { label: 'WebSocket', pattern: /\bnew\s+WebSocket\b/ },
  { label: 'EventSource', pattern: /\bnew\s+EventSource\b/ },
  { label: 'sendBeacon', pattern: /\bsendBeacon\s*\(/ },
  { label: 'GitHub API URL', pattern: /api\.github\.com/ },
];

/** Labels of every forbidden pattern found in a source file. */
export function findExternalEffects(source: string): string[] {
  return FORBIDDEN_PATTERNS.filter(({ pattern }) => pattern.test(source)).map(({ label }) => label);
}
