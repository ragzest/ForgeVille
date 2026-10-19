import { useEffect, useRef, type CSSProperties } from 'react';
import { usePreferences } from '../../app/shell/preferences.ts';
import { useWorkflow } from '../../store/context.ts';
import { TERMINAL_COLORS, WINDOW_DOTS } from '../../ui/terminal.ts';
import { screenModel } from '../../world/screens/screenModel.ts';

/**
 * The desk monitor, scaled up: the whole simulated transcript in a terminal
 * window. It replays snapshot data only. Nothing here spawns a shell, reads
 * input, or runs a command.
 */
export function TerminalView({ agentId }: { agentId: string }) {
  const snapshot = useWorkflow((s) => s.snapshot);
  const { reducedMotion } = usePreferences();
  const model = screenModel(snapshot, agentId, { fullTranscript: true });
  const hasSession = model.mode === 'terminal';
  const log = useRef<HTMLDivElement>(null);

  // Open on the newest line, and keep following it as lines arrive.
  useEffect(() => {
    const el = log.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [model.lines.length]);

  // Keys go to the terminal, not the player, from the moment it opens.
  useEffect(() => {
    log.current?.focus({ preventScroll: true });
  }, []);

  const style = {
    '--term-bg': TERMINAL_COLORS.bg,
    '--term-bar': TERMINAL_COLORS.bar,
    '--term-fg': TERMINAL_COLORS.fg,
    '--term-dim': TERMINAL_COLORS.dim,
    '--term-command': TERMINAL_COLORS.green,
    '--term-system': TERMINAL_COLORS.cyan,
    '--term-status': TERMINAL_COLORS.orange,
    '--term-accent': model.runtime.accent,
    '--term-on-accent': model.runtime.onAccent,
  } as CSSProperties;

  return (
    <section className="terminal" style={style} aria-labelledby="terminal-label" data-captures-keys>
      <h3 id="terminal-label" className="terminal-label">
        Simulated session
      </h3>
      <div className="terminal-window">
        <div className="terminal-bar">
          <span className="terminal-dots" aria-hidden="true">
            {WINDOW_DOTS.map((c) => (
              <span key={c} style={{ background: c }} />
            ))}
          </span>
          <span className="terminal-title">{model.title}</span>
          <span className="terminal-pill">SIMULATED</span>
        </div>

        <div
          ref={log}
          className="terminal-log"
          role="log"
          aria-label={`${model.name}'s simulated transcript`}
          tabIndex={0}
        >
          {!hasSession ? (
            <p className="terminal-empty">No simulated session for {model.name}. There is nothing to replay.</p>
          ) : model.lines.length === 0 ? (
            <p className="terminal-empty">This simulated session has no transcript lines yet.</p>
          ) : (
            <ol className="terminal-lines">
              {model.lines.map((line, i) => (
                <li key={`${String(i)}-${line.time}`} className={`terminal-line terminal-line--${line.kind}`} data-kind={line.kind}>
                  <span className="terminal-time">{line.time}</span>
                  <span className="terminal-text">{line.text}</span>
                </li>
              ))}
            </ol>
          )}
          {hasSession && model.status && (
            <p className="terminal-status">
              {model.runtime.prompt} {model.status}…
            </p>
          )}
          {hasSession && (
            <p className="terminal-prompt" aria-hidden="true">
              ›{' '}
              <span
                className={model.live && !reducedMotion ? 'terminal-cursor is-blinking' : 'terminal-cursor'}
                data-live={model.live}
              >
                ▍
              </span>
            </p>
          )}
        </div>

        {model.banner && <p className={`terminal-banner terminal-banner--${model.banner.tone}`}>{model.banner.text}</p>}
      </div>
      <p className="panel-note">
        Replayed from the mock transcript. No shell or process runs, and no tests run on a real machine.
      </p>
    </section>
  );
}
