import { useInteraction } from '../../store/interaction.ts';

const COMING_IN: Readonly<Record<string, string>> = {
  desk: 'Agent details arrive with the desk panel (S05-01).',
  board: 'The task board arrives with S06-01.',
  'qa-screen': 'Pull-request and QA details arrive with S07-01.',
  'status-display': 'Project metrics arrive with mission control (S08-01).',
  reception: 'Project overview arrives with the vertical slice (E09).',
};

/** Placeholder panel for the activated object until its own panel story lands. */
export function InteractionPanel() {
  const open = useInteraction((s) => s.open);
  const close = useInteraction((s) => s.close);
  if (!open) return null;
  const kind = open.id.startsWith('desk:') ? 'desk' : open.id;

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
