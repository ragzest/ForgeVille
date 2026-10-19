import { useState } from 'react';
import { COLUMN_LABELS } from '../../domain/index.ts';
import { useInteraction } from '../../store/interaction.ts';
import { useNavigation } from '../../store/navigation.ts';
import { useWorkflow } from '../../store/context.ts';
import { runtimeStyle } from '../../ui/runtimes.ts';
import { PresenceBadge } from '../PresenceBadge.tsx';
import { TerminalView } from '../terminal/TerminalView.tsx';
import { clockTime, deskDetails, deskId, sessionControls, timeAgo, type SessionCommand } from './deskDetails.ts';


const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const count = new Intl.NumberFormat('en-US');

/**
 * Who the agent is and what they are doing, for one agent id. The world desk
 * and the 2D roster both open this panel, so it reads only the snapshot.
 */
export function DeskPanel({ agentId, title }: { agentId: string; title: string }) {
  const snapshot = useWorkflow((s) => s.snapshot);
  const close = useInteraction((s) => s.close);
  const terminal = useInteraction((s) => s.terminal);
  const showTerminal = useInteraction((s) => s.showTerminal);
  const selectedTaskId = useNavigation((s) => s.selectedTaskId);
  const selectTask = useNavigation((s) => s.selectTask);
  const pauseSession = useWorkflow((s) => s.pauseSession);
  const resumeSession = useWorkflow((s) => s.resumeSession);
  const interruptSession = useWorkflow((s) => s.interruptSession);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const details = deskDetails(snapshot, agentId);
  const now = snapshot.clock.now;

  // Every session command goes through the workflow port; the panel only shows what comes back.
  const run = (command: SessionCommand, sessionId: string) => {
    const send = { pause: pauseSession, resume: resumeSession, interrupt: interruptSession }[command];
    const result = send(sessionId);
    setFeedback(
      result.ok
        ? { ok: true, text: result.snapshot.events.at(-1)?.message ?? 'Done.' }
        : { ok: false, text: result.reason },
    );
  };

  return (
    <section className={terminal ? 'panel desk-panel is-terminal' : 'panel desk-panel'} role="dialog" aria-modal="false" aria-labelledby="interaction-panel-title">
      <header className="panel-header">
        <h2 id="interaction-panel-title">{title}</h2>
        <button type="button" className="panel-close" onClick={close} aria-label="Close panel">
          ×
        </button>
      </header>

      {!details ? (
        <p className="panel-note">No agent has id {agentId} in this scenario.</p>
      ) : terminal ? (
        <>
          <TerminalView agentId={agentId} />
          <div className="desk-actions">
            <button
              type="button"
              onClick={() => {
                showTerminal(false);
              }}
            >
              Back to desk
            </button>
          </div>
          <p className="panel-note">
            Press <kbd>Esc</kbd> to close.
          </p>
        </>
      ) : (
        <>
          <div className="desk-identity">
            <span className={`avatar avatar--${details.agent.avatar}`} aria-hidden="true">
              {details.agent.name.charAt(0)}
            </span>
            <div>
              <p className="desk-name">
                <strong>{details.agent.name}</strong> <span className="two-d-muted">{details.agent.role}</span>
              </p>
              <PresenceBadge presence={details.presence} />
            </div>
          </div>

          <dl className="desk-facts">
            <dt>Task</dt>
            <dd>{details.task ? details.task.title : 'No assigned task'}</dd>
            <dt>Issue</dt>
            <dd>{details.task ? <code>{details.task.issueKey}</code> : '—'}</dd>
            <dt>Branch</dt>
            <dd>{details.task?.branch ? <code>{details.task.branch}</code> : '—'}</dd>
            <dt>Runtime</dt>
            <dd>
              <span className="runtime-dot" style={{ background: runtimeStyle(details.agent.runtimeLabel).accent }} aria-hidden="true" />
              {details.agent.runtimeLabel}
            </dd>
            <dt>Model</dt>
            <dd>{details.agent.modelLabel}</dd>
            <dt>Avatar</dt>
            <dd>{details.agent.avatar}</dd>
            <dt>Last activity</dt>
            <dd>
              {details.lastActivityAt ? (
                <time dateTime={details.lastActivityAt}>
                  {clockTime(details.lastActivityAt)} ({timeAgo(details.lastActivityAt, now)})
                </time>
              ) : (
                'None yet'
              )}
            </dd>
            <dt>Session</dt>
            <dd>{details.session ? `Simulated, ${details.session.state}` : 'No session'}</dd>
            {details.agent.mockUsage && (
              <>
                <dt>Usage</dt>
                <dd>
                  <span className="mock-label">Mock estimate</span> {count.format(details.agent.mockUsage.tokens)} tokens ·{' '}
                  {usd.format(details.agent.mockUsage.costUsd)}
                </dd>
              </>
            )}
          </dl>

          <div className="desk-actions" role="group" aria-label="Desk actions">
            <button
              type="button"
              disabled={!details.task}
              onClick={() => {
                if (details.task) selectTask(details.task.id);
              }}
            >
              Inspect task
            </button>
            <button
              type="button"
              onClick={() => {
                showTerminal(true);
              }}
            >
              Open terminal
            </button>
            {sessionControls(details.session).map((control) => (
              <button
                key={control.command}
                type="button"
                disabled={!control.enabled}
                aria-describedby={control.enabled ? undefined : `desk-${control.command}-reason`}
                onClick={() => {
                  if (details.session) run(control.command, details.session.id);
                }}
              >
                {control.label}
              </button>
            ))}
          </div>
          <ul className="desk-reasons">
            {sessionControls(details.session)
              .filter((control) => !control.enabled)
              .map((control) => (
                <li key={control.command} id={`desk-${control.command}-reason`} className="panel-note">
                  {control.reason}
                </li>
              ))}
          </ul>
          {feedback && (
            <p className={feedback.ok ? 'desk-feedback' : 'desk-feedback is-refused'} role={feedback.ok ? 'status' : 'alert'}>
              {feedback.ok ? feedback.text : `Not done: ${feedback.text}`}
            </p>
          )}

          {selectedTaskId !== null && details.task?.id === selectedTaskId && (
            <p className="desk-inspected" role="status">
              Selected for the board: <strong>{details.task.issueKey}</strong> {details.task.title} ·{' '}
              {COLUMN_LABELS[details.task.column]}
            </p>
          )}

          <h3 className="desk-subheading">Recent events</h3>
          {details.recentEvents.length === 0 ? (
            <p className="panel-note">No events for {details.agent.name} yet.</p>
          ) : (
            <ol className="desk-events" aria-label="Recent events">
              {details.recentEvents.map((e) => (
                <li key={e.id}>
                  <time dateTime={e.timestamp}>{clockTime(e.timestamp)}</time> {e.message}
                </li>
              ))}
            </ol>
          )}

          <p className="panel-note">
            Agent id: <code>{agentId}</code> · desk <code>{deskId(agentId)}</code>. Press <kbd>Esc</kbd> to close.
          </p>
        </>
      )}
    </section>
  );
}
