import { appendEvent } from './events.ts';
import { refuse, succeed, type CommandOutcome } from './result.ts';
import type { AgentSession, SessionId, SessionState, WorkflowEventType, WorkflowSnapshot } from './types.ts';

interface SessionCommand {
  readonly from: readonly SessionState[];
  readonly to: SessionState;
  readonly event: WorkflowEventType;
  readonly verb: string;
}

const PAUSE: SessionCommand = { from: ['running'], to: 'paused', event: 'session_paused', verb: 'paused' };
const RESUME: SessionCommand = {
  from: ['paused', 'interrupted'],
  to: 'running',
  event: 'session_resumed',
  verb: 'resumed',
};
const INTERRUPT: SessionCommand = {
  from: ['running', 'paused'],
  to: 'interrupted',
  event: 'session_interrupted',
  verb: 'interrupted',
};

function applySessionCommand(snapshot: WorkflowSnapshot, sessionId: SessionId, command: SessionCommand): CommandOutcome {
  const session = snapshot.sessions.find((s) => s.id === sessionId);
  if (!session) return refuse(snapshot, `Session ${sessionId} does not exist.`);

  const name = snapshot.agents.find((a) => a.id === session.agentId)?.name ?? 'The agent';
  if (!command.from.includes(session.state)) {
    return refuse(snapshot, `${name}'s session is ${session.state}; it cannot be ${command.verb}.`);
  }

  const now = snapshot.clock.now;
  const updated: AgentSession = {
    ...session,
    state: command.to,
    lastActivityAt: now,
    transcript: [...session.transcript, { timestamp: now, stream: 'system', text: `Session ${command.verb} by operator.` }],
  };
  const next: WorkflowSnapshot = {
    ...snapshot,
    sessions: snapshot.sessions.map((s) => (s.id === session.id ? updated : s)),
  };

  return succeed(
    appendEvent(next, command.event, `${name}'s simulated session was ${command.verb}.`, {
      agentId: session.agentId,
      sessionId: session.id,
      ...(session.taskId ? { taskId: session.taskId } : {}),
    }),
  );
}

/** running → paused */
export const pauseSession = (snapshot: WorkflowSnapshot, sessionId: SessionId) =>
  applySessionCommand(snapshot, sessionId, PAUSE);

/** paused or interrupted → running */
export const resumeSession = (snapshot: WorkflowSnapshot, sessionId: SessionId) =>
  applySessionCommand(snapshot, sessionId, RESUME);

/** running or paused → interrupted */
export const interruptSession = (snapshot: WorkflowSnapshot, sessionId: SessionId) =>
  applySessionCommand(snapshot, sessionId, INTERRUPT);
