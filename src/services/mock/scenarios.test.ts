import { describe, expect, it } from 'vitest';
import {
  isCelebrating,
  mergeEligibilityFor,
  missionControlMetrics,
  presenceOf,
  SCENARIO_IDS,
  type WorkflowSnapshot,
} from '../../domain/index.ts';
import { danglingReferences } from '../../domain/fixtures/integrity.ts';
import { buildScenario, SCENARIOS } from './scenarios.ts';

const task = (s: WorkflowSnapshot, key: string) => {
  const found = s.tasks.find((t) => t.issueKey === key);
  if (!found) throw new Error(`no task ${key}`);
  return found;
};
const presence = (s: WorkflowSnapshot) => Object.fromEntries(s.agents.map((a) => [a.name, presenceOf(s, a.id)]));

describe.each(SCENARIO_IDS)('scenario %s', (id) => {
  const s = buildScenario(id);

  it('loads deterministically', () => {
    expect(buildScenario(id)).toEqual(s);
    expect(buildScenario(id)).not.toBe(s);
    expect(s.scenarioId).toBe(id);
  });

  it('has consistent ids', () => {
    expect(danglingReferences(s)).toEqual([]);
    for (const list of [s.agents, s.tasks, s.sessions, s.pullRequests, s.testRuns, s.reviewReports, s.events]) {
      const ids = list.map((x) => x.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('has an event log in time order that ends no later than the clock', () => {
    expect(s.events.length).toBeGreaterThan(3);
    const times = s.events.map((e) => Date.parse(e.timestamp));
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(Math.max(...times)).toBeLessThanOrEqual(Date.parse(s.clock.now));
  });

  it('has Lantern first with seven agents, a smaller second team, and dependencies', () => {
    expect(s.projects.map((p) => p.name)).toEqual(['Lantern', 'Sprout']);
    const team = (projectId: string) => s.agents.filter((a) => a.projectId === projectId);
    const [lantern, sprout] = s.projects.map((p) => team(p.id));
    expect(lantern).toHaveLength(7);
    expect(sprout?.length).toBeGreaterThanOrEqual(3);
    expect(sprout?.length).toBeLessThanOrEqual(5);
    expect(s.tasks.some((t) => t.projectId === s.projects[1]?.id)).toBe(true);
    expect(s.sessions.some((x) => sprout?.some((a) => a.id === x.agentId))).toBe(true);
    // Names are unique across the building; roles are unique within a team.
    expect(new Set(s.agents.map((a) => a.name)).size).toBe(s.agents.length);
    for (const members of [lantern ?? [], sprout ?? []]) expect(new Set(members.map((a) => a.role)).size).toBe(members.length);
    expect(new Set(s.agents.map((a) => a.runtimeLabel)).size).toBeGreaterThan(1);
    expect(new Set(s.agents.map((a) => a.modelLabel)).size).toBeGreaterThan(1);
    expect(s.agents.every((a) => a.mockUsage === null || a.mockUsage.isMockEstimate)).toBe(true);
    expect(task(s, 'LN-4').dependsOn).toEqual(['task-ln-3']);
  });

  it('is described for the scenario switcher', () => {
    expect(SCENARIOS.find((info) => info.id === id)?.summary).toBeTruthy();
  });
});

describe('scenario contents', () => {
  it('feature in progress: three developers working, nothing to review', () => {
    const s = buildScenario('feature-in-progress');
    expect(presence(s)).toMatchObject({ Ada: 'working', Bruno: 'working', Chen: 'working', Dara: 'idle', Fern: 'idle' });
    // Sprout adds SP-3 (ready) and SP-4 (backlog) to the queue.
    expect(missionControlMetrics(s)).toMatchObject({ openPullRequests: 0, queuedTasks: 5, successfulMerges: 1, blockedTasks: 0 });
  });

  it('review and QA pass: pull request #2 is eligible to merge', () => {
    const s = buildScenario('review-and-qa-pass');
    expect(task(s, 'LN-2').column).toBe('qa');
    expect(mergeEligibilityFor(s, 'pr-2')).toEqual({ eligible: true });
    expect(presence(s)).toMatchObject({ Ada: 'awaiting_review', Fern: 'reviewing' });
    expect(s.events.at(-1)?.message).toMatch(/ready to merge/);
  });

  it('QA failure: the browser check failed and LN-2 is back with Ada', () => {
    const s = buildScenario('qa-failure');
    expect(task(s, 'LN-2')).toMatchObject({ column: 'in_progress', assigneeId: 'agent-ada' });
    expect(s.testRuns.find((r) => r.id === 'run-2-browser')).toMatchObject({ status: 'failed' });
    expect(s.events.at(-1)).toMatchObject({ type: 'check_failed' });
    const eligibility = mergeEligibilityFor(s, 'pr-2');
    expect(eligibility.eligible).toBe(false);
    if (!eligibility.eligible) expect(eligibility.reasons.join(' ')).toMatch(/Browser tests failed: The add button overlaps/);
    expect(presence(s).Ada).toBe('working');
    expect(missionControlMetrics(s).recentFailures).toHaveLength(1);
  });

  it('agent blocked: Chen waits on LN-3 and asked for help', () => {
    const s = buildScenario('agent-blocked');
    expect(task(s, 'LN-4')).toMatchObject({ column: 'blocked', blockedFrom: 'in_progress' });
    expect(task(s, 'LN-3').column).toBe('in_progress');
    expect(presence(s)).toMatchObject({ Chen: 'blocked', Bruno: 'working' });
    expect(s.events.at(-1)).toMatchObject({ type: 'help_requested', links: { agentId: 'agent-chen' } });
    expect(missionControlMetrics(s).blockedTasks).toBe(1);
  });

  it('successful merge: pull request #2 merged under the policy and Ada celebrates', () => {
    const s = buildScenario('successful-merge');
    expect(s.pullRequests.find((pr) => pr.id === 'pr-2')?.state).toBe('merged');
    expect(task(s, 'LN-2').column).toBe('merged');
    expect(s.events.at(-1)).toMatchObject({ type: 'pull_request_merged', links: { pullRequestId: 'pr-2' } });
    expect(isCelebrating(s, 'agent-ada')).toBe(true);
    expect(presence(s).Fern).toBe('idle');
    expect(missionControlMetrics(s)).toMatchObject({ successfulMerges: 2, openPullRequests: 0 });
  });
});

describe('task details in the seed', () => {
  it('gives every task a description and keeps at least one dependency', () => {
    for (const id of SCENARIO_IDS) {
      const snapshot = buildScenario(id);
      for (const task of snapshot.tasks) expect(task.description.length, `${id} ${task.issueKey}`).toBeGreaterThan(10);
      expect(snapshot.tasks.some((t) => t.dependsOn.length > 0)).toBe(true);
    }
  });
});
