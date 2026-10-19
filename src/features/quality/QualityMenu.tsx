import { useEffect, useId, useRef, useState } from 'react';
import { useEffectiveTier, useQuality } from '../../store/quality.ts';
import { QUALITY_HINTS, QUALITY_LABELS, QUALITY_SETTINGS } from '../../world/quality.ts';

/**
 * Graphics settings: a button that opens a small popover with the quality
 * tiers. The choice is kept in `localStorage`. On Auto, the button says which
 * tier Auto is on right now.
 */
export function QualityMenu() {
  const setting = useQuality((s) => s.setting);
  const setSetting = useQuality((s) => s.setSetting);
  const tier = useEffectiveTier();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  const popoverId = `${id}-popover`;

  // Escape or a click elsewhere closes it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setOpen(false);
      button.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      if (root.current && e.target instanceof Node && !root.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  const current = setting === 'auto' ? `Auto · ${QUALITY_LABELS[tier]}` : QUALITY_LABELS[setting];

  return (
    <div className="quality-menu" ref={root}>
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={popoverId}
        aria-haspopup="dialog"
        onClick={() => {
          setOpen(!open);
        }}
      >
        Graphics: {current}
      </button>
      {open && (
        <div id={popoverId} className="quality-popover" role="dialog" aria-label="Graphics settings">
          <fieldset>
            <legend>Quality</legend>
            {QUALITY_SETTINGS.map((s) => (
              <label key={s} className="quality-option">
                <input
                  type="radio"
                  name={`${id}-quality`}
                  value={s}
                  checked={setting === s}
                  onChange={() => {
                    setSetting(s);
                  }}
                />
                <span>
                  <strong>{QUALITY_LABELS[s]}</strong>
                  <small>{QUALITY_HINTS[s]}</small>
                </span>
              </label>
            ))}
          </fieldset>
          <p className="quality-note">Only changes how the office is drawn. Kept on this device.</p>
        </div>
      )}
    </div>
  );
}
