import { describe, expect, it } from 'vitest';
import { pauseSession } from '../../domain/index.ts';
import { SCENARIO_IDS } from '../../domain/index.ts';
import { buildScenario } from '../../services/mock/scenarios.ts';
import { runtimeStyle } from '../../ui/runtimes.ts';
import { SCREEN_LINES, VACANT_SCREEN, screenModel, transcriptLines } from './screenModel.ts';

describe('desk screen model', () => {
  it('shows the latest transcript lines for a working agent, with a live cursor', () => {
    const snapshot = buildScenario('feature-in-progress');
    const ada = screenModel(snapshot, 'agent-ada');
    expect(ada.mode).toBe('terminal');
    expect(ada.live).toBe(true);
    expect(ada.title).toBe('claude code · ada@lantern');
    expect(ada.status).toBe('Working on LN-2');
    expect(ada.lines.length).toBeLessThanOrEqual(SCREEN_LINES);
    expect(ada.lines.at(-1)?.text).toBe('Editing src/components/ArticleCard.tsx');
    expect(ada.lines.find((l) => l.text.startsWith('$'))?.kind).toBe('command');
    expect(ada.lines[0]?.time).toMatch(/^\d\d:\d\d$/);
    expect(ada.banner).toBeNull();
  });

  it('shows a screensaver when the agent has no session', () => {
    const fern = screenModel(buildScenario('feature-in-progress'), 'agent-fern');
    expect(fern.mode).toBe('screensaver');
    expect(fern.lines).toEqual([]);
    expect(fern.live).toBe(false);
  });

  it('puts a blocked banner on a blocked agent and stops the cursor', () => {
    const chen = screenModel(buildScenario('agent-blocked'), 'agent-chen');
    expect(chen.banner).toEqual({ tone: 'danger', text: 'BLOCKED · waiting for help' });
    expect(chen.live).toBe(false);
  });

  it('marks a paused session and changes its cache key', () => {
    const snapshot = buildScenario('feature-in-progress');
    const before = screenModel(snapshot, 'agent-bruno');
    const paused = pauseSession(snapshot, 'session-bruno');
    if (!paused.ok) throw new Error(paused.reason);
    const after = screenModel(paused.snapshot, 'agent-bruno');
    expect(after.banner?.text).toBe('SESSION PAUSED');
    expect(after.live).toBe(false);
    expect(after.key).not.toBe(before.key);
  });

  it('styles runtimes by label, with a fallback', () => {
    expect(runtimeStyle('Claude Code').accent).not.toBe(runtimeStyle('Codex').accent);
    expect(runtimeStyle('Pi').prompt).toBe('π');
    expect(runtimeStyle('Something new').label).toBe('Something new');
    expect(VACANT_SCREEN.mode).toBe('screensaver');
  });

  it('gives the terminal panel the whole transcript, ending on the monitor\'s last line', () => {
    for (const id of SCENARIO_IDS) {
      const snapshot = buildScenario(id);
      for (const agent of snapshot.agents) {
        const monitor = screenModel(snapshot, agent.id);
        const panel = screenModel(snapshot, agent.id, { fullTranscript: true });
        const session = snapshot.sessions.filter((s) => s.agentId === agent.id).at(-1) ?? null;
        expect(panel.lines).toEqual(transcriptLines(session));
        expect(panel.lines.at(-1)).toEqual(monitor.lines.at(-1));
        expect(panel.lines.slice(-SCREEN_LINES)).toEqual(monitor.lines);
        expect(panel.banner).toEqual(monitor.banner);
        expect(panel.live).toBe(monitor.live);
      }
    }
  });
});
