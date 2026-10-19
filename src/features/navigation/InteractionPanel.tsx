import { useInteraction } from '../../store/interaction.ts';
import { BoardPanel } from '../board/BoardPanel.tsx';
import { ElevatorPanel } from '../building/ElevatorPanel.tsx';
import { DeskPanel } from '../desks/DeskPanel.tsx';
import { agentIdFromDesk } from '../desks/deskDetails.ts';

const COMING_IN: Readonly<Record<string, string>> = {
  'qa-screen': 'Pull-request and QA details arrive with S07-01.',
  'status-display': 'Project metrics arrive with mission control (S08-01).',
  reception: 'Project overview arrives with the vertical slice (E09).',
};

/** The activated object's panel: the desk panel, or a placeholder until that object's story lands. */
export function InteractionPanel() {
  const open = useInteraction((s) => s.open);
  const close = useInteraction((s) => s.close);
  if (!open) return null;
  const agentId = agentIdFromDesk(open.id);
  if (agentId !== null) return <DeskPanel key={agentId} agentId={agentId} title={open.label} />;
  if (open.id === 'elevator') return <ElevatorPanel title={open.label} />;
  if (open.id === 'board') return <BoardPanel title={open.label} />;
  const kind = open.id;

  return (
    <section className="panel" role="dialog" aria-modal="false" aria-labelledby="interaction-panel-title">
      <header className="panel-header">
        <h2 id="interaction-panel-title">{open.label}</h2>
        <button type="button" className="panel-close" onClick={close} aria-label="Close panel">
          ×
        </button>
      </header>
      <p>
        Object id: <code>{open.id}</code>
      </p>
      <p className="panel-note">{COMING_IN[kind] ?? 'Details arrive in a later story.'}</p>
      <p className="panel-note">
        Press <kbd>Esc</kbd> to close.
      </p>
    </section>
  );
}
