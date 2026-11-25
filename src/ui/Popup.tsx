import { useEffect, useState } from 'react';
import type { ToolNotificationProps } from 'ghost-in-shell-sdk';
import { messages } from '../shared/i18n.js';
import type { PopupAction, PopupData } from '../shared/types.js';
import { CheckIcon, OpenIcon, SnoozeIcon } from './components/Icons.js';
import { CSS } from './styles.js';
import iconUrl from './assets/icon.png';

function asData(d: unknown, fallbackMessage: string): PopupData {
  const o = (d ?? {}) as Partial<PopupData>;
  return {
    message: typeof o.message === 'string' && o.message ? o.message : fallbackMessage,
    snoozeMinutes: typeof o.snoozeMinutes === 'number' ? o.snoozeMinutes : 5,
    ringingSince: typeof o.ringingSince === 'number' ? o.ringingSince : Date.now(),
  };
}

/**
 * Shell popup shown while the tool is not in front: live clock, the reminder text, and the same
 * Confirm / Snooze choice as the legacy popup. Like the legacy popup it has no close button.
 */
export default function Popup({ data, open, action, language }: ToolNotificationProps) {
  const t = messages(language);
  const d = asData(data, t.defaultMessage);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const fmt = (ms: number, sec: boolean) =>
    new Intl.DateTimeFormat(language, { hour: '2-digit', minute: '2-digit', ...(sec ? { second: '2-digit' } : {}), hour12: false }).format(new Date(ms));
  const send = (id: PopupAction) => action(id);

  return (
    <div className="kn-popup">
      <style>{CSS}</style>
      <div className="kn-popup-card" role="alert">
        <div className="kn-modal-band" />
        <div className="kn-popup-body">
          <div className="kn-popup-top">
            <img src={iconUrl} alt="" width={18} height={18} />
            <span className="kn-popup-app">{t.appName}</span>
            <button type="button" className="kn-btn kn-btn-quiet kn-btn-icon" aria-label={t.actions.open} title={t.actions.open} onClick={open}>
              <OpenIcon size={13} />
            </button>
          </div>
          <div className="kn-popup-clock">{fmt(now, true)}</div>
          <p className="kn-popup-message">{d.message}</p>
          <span className="kn-popup-since">{t.hint.ringing(fmt(d.ringingSince, false))}</span>
          <div className="kn-popup-actions">
            <button type="button" className="kn-btn kn-btn-primary" onClick={() => send('confirm')}>
              <CheckIcon size={14} />
              {t.actions.confirm}
            </button>
            <button type="button" className="kn-btn" onClick={() => send('snooze')}>
              <SnoozeIcon size={14} />
              {t.actions.snooze(d.snoozeMinutes)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
