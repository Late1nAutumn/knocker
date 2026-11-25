import { createPortal } from 'react-dom';
import { useApi, useT } from '../api.js';
import { useTimeFormat } from '../hooks.js';
import { CSS } from '../styles.js';
import { CheckIcon, SnoozeIcon } from './Icons.js';

export interface ReminderModalProps {
  now: number;
  message: string;
  snoozeMinutes: number;
  busy: boolean;
  onConfirm(): void;
  onSnooze(): void;
}

/**
 * The in-app reminder while the tool is in front (the counterpart of the shell popup). Like the
 * legacy popup it has no close button: the user confirms or snoozes.
 */
export function ReminderModal({ now, message, snoozeMinutes, busy, onConfirm, onSnooze }: ReminderModalProps) {
  const { raw } = useApi();
  const t = useT();
  const hms = useTimeFormat(true);
  return createPortal(
    <div className="kn-backdrop">
      <style>{CSS}</style>
      <div className="kn-modal" role="alertdialog" aria-modal="true" aria-labelledby="kn-modal-clock" aria-describedby="kn-modal-message">
        <div className="kn-modal-band" />
        <div className="kn-modal-body">
          <div id="kn-modal-clock" className="kn-modal-clock">
            {hms(now)}
          </div>
          <p id="kn-modal-message" className="kn-modal-message">
            {message}
          </p>
          <div className="kn-modal-actions">
            <button type="button" className="kn-btn kn-btn-primary kn-btn-lg" autoFocus disabled={busy} onClick={onConfirm}>
              <CheckIcon size={16} />
              {t.actions.confirm}
            </button>
            <button type="button" className="kn-btn kn-btn-lg" disabled={busy} onClick={onSnooze}>
              <SnoozeIcon size={16} />
              {t.actions.snooze(snoozeMinutes)}
            </button>
          </div>
        </div>
      </div>
    </div>,
    raw.overlayContainer,
  );
}
