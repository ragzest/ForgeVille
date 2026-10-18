import { describe, expect, it } from 'vitest';
import { minimalSnapshot } from './fixtures/minimalSnapshot.ts';
import { presenceOf } from './presence.ts';
import { interruptSession, pauseSession, resumeSession } from './sessions.ts';
import type { WorkflowSnapshot } from './types.ts';

const ID = 'session-ada-1';
const inProgress = (): WorkflowSnapshot => {
  const s = minimalSnapshot();
  return { ...s, pullRequests: [], tasks: s.tasks.map((t) => ({ ...t, column: 'in_progress', pullRequestId: null })) };
};
const stateOf = (s: WorkflowSnapshot) => s.sessions.find((x) => x.id === ID)?.state;

describe('session commands', () => {
  it('pauses a running session, records a system line and an event, and stops presenting as working', () => {
    const before = inProgress();
    expect(presenceOf(before, 'agent-ada')).toBe('working');

    const result = pauseSession(before, ID);

    expect(result.ok).toBe(true);
    expect(stateOf(result.snapshot)).toBe('paused');
    expect(result.snapshot.sessions[0]?.transcript.at(-1)).toEqual({
      timestamp: before.clock.now,
      stream: 'system',
      text: 'Session paused by operator.',
    });
    expect(result.snapshot.events.at(-1)).toMatchObject({ type: 'session_paused', links: { sessionId: ID } });
    expect(presenceOf(result.snapshot, 'agent-ada')).toBe('idle');
  });

  it('resumes a paused or interrupted session', () => {
    const paused = pauseSession(inProgress(), ID).snapshot;
    expect(stateOf(resumeSession(paused, ID).snapshot)).toBe('running');

    const interrupted = interruptSession(inProgress(), ID).snapshot;
    expect(stateOf(interrupted)).toBe('interrupted');
    const resumed = resumeSession(interrupted, ID);
    expect(stateOf(resumed.snapshot)).toBe('running');
    expect(presenceOf(resumed.snapshot, 'agent-ada')).toBe('working');
  });

  it('refuses commands that do not fit the current state, leaving the snapshot unchanged', () => {
    const running = inProgress();
    expect(resumeSession(running, ID)).toEqual({
      ok: false,
      reason: "Ada's session is running; it cannot be resumed.",
      snapshot: running,
    });

    const paused = pauseSession(running, ID).snapshot;
    expect(pauseSession(paused, ID)).toMatchObject({ ok: false, snapshot: paused });

    const completed = { ...running, sessions: running.sessions.map((s) => ({ ...s, state: 'completed' as const })) };
    expect(interruptSession(completed, ID).ok).toBe(false);
    expect(resumeSession(completed, ID).ok).toBe(false);

    expect(pauseSession(running, 'session-nope')).toMatchObject({ ok: false, reason: 'Session session-nope does not exist.' });
  });
});
