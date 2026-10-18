import { useInteraction } from '../../store/interaction.ts';

/** "E · Ada's desk" when something is within reach and nothing is open. Renders nothing otherwise. */
export function InteractHint() {
  const focused = useInteraction((s) => s.focused);
  const open = useInteraction((s) => s.open);
  if (!focused || open) return null;
  return (
    <div className="interact-hint" role="status">
      <kbd>E</kbd> <span>{focused.label}</span>
    </div>
  );
}
