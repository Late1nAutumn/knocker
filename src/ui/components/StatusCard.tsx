import { useT } from '../api.js';
import { useTimeFormat } from '../hooks.js';
import { clockDuration } from '../../shared/i18n.js';
import type { Snapshot } from '../../shared/types.js';
import { Dial } from './Dial.js';
import { BellIcon, CheckIcon, PlayIcon, RestartIcon, SnoozeIcon, StopIcon, WarningIcon } from './Icons.js';

export type TimerCommand = 'timer.start' | 'timer.stop' | 'timer.restart' | 'alarm.confirm' | 'alarm.snooze';

export interface StatusCardProps {
  snapshot: Snapshot;
  now: number;
  busy: boolean;
  onCommand(command: TimerCommand): void;
}

/** The countdown dial with the state and the timer controls. */
export function StatusCard({ snapshot, now, busy, onCommand }: StatusCardProps) {
  const t = useT();
  const hm = useTimeFormat();
  const hms = useTimeFormat(true);
  const { timer, settings } = snapshot;
  const { phase } = timer;
  const left = timer.deadline === null ? 0 : timer.deadline - now;
  const remaining = timer.periodMs ? left / timer.periodMs : 0;
  const message = settings.message || t.defaultMessage;

  let center;
  if (phase === 'ringing') {
    center = (
      <>
        <BellIcon size={30} className="kn-bell" />
        <span className="kn-dial-time">{hms(now)}</span>
        <span className="kn-dial-sub">{t.dial.ringing}</span>
      </>
    );
  } else if (phase === 'stopped') {
    center = (
      <>
        <span className="kn-dial-label">{t.dial.stopped}</span>
        <span className="kn-dial-time">{clockDuration(settings.intervalMinutes * 60_000)}</span>
      </>
    );
  } else {
    center = (
      <>
        <span className="kn-dial-label">{phase === 'snoozing' ? t.dial.snoozing : t.dial.counting}</span>
        <span className="kn-dial-time" role="timer">{clockDuration(left)}</span>
        {timer.deadline !== null && <span className="kn-dial-sub">{t.dial.at(hm(timer.deadline))}</span>}
      </>
    );
  }

  let hint = '';
  if (phase === 'stopped') hint = t.hint.stopped;
  else if (phase === 'counting' && timer.deadline !== null) hint = t.hint.counting(settings.intervalMinutes, hm(timer.deadline));
  else if (phase === 'snoozing' && timer.deadline !== null) hint = t.hint.snoozing(hm(timer.deadline));
  else if (phase === 'ringing') hint = t.hint.ringing(hm(timer.ringingSince ?? now));

  return (
    <section className={`kn-card kn-status${phase === 'ringing' ? ' kn-status-ringing' : ''}`} aria-live="polite">
      <Dial phase={phase} remaining={remaining}>
        {center}
      </Dial>
      <div className="kn-status-body">
        <h2 className="kn-status-phase">{t.title[phase]}</h2>
        {phase === 'ringing' && <p className="kn-status-message">{message}</p>}
        <p className="kn-status-hint">{hint}</p>
        {phase === 'ringing' && snapshot.soundFailed && (
          <div className="kn-alert" role="alert">
            <WarningIcon size={15} />
            <span className="kn-alert-text">{t.errors.ringSoundFailed}</span>
          </div>
        )}
        <div className="kn-actions">
          {phase === 'ringing' && (
            <>
              <button type="button" className="kn-btn kn-btn-primary kn-btn-lg" disabled={busy} onClick={() => onCommand('alarm.confirm')}>
                <CheckIcon size={16} />
                {t.actions.confirm}
              </button>
              <button type="button" className="kn-btn kn-btn-lg" disabled={busy} onClick={() => onCommand('alarm.snooze')}>
                <SnoozeIcon size={16} />
                {t.actions.snooze(settings.snoozeMinutes)}
              </button>
              <button type="button" className="kn-btn kn-btn-quiet" disabled={busy} onClick={() => onCommand('timer.stop')}>
                <StopIcon size={12} />
                {t.actions.stop}
              </button>
            </>
          )}
          {phase === 'stopped' && (
            <button type="button" className="kn-btn kn-btn-dark kn-btn-lg" disabled={busy} onClick={() => onCommand('timer.start')}>
              <PlayIcon size={14} />
              {t.actions.start}
            </button>
          )}
          {(phase === 'counting' || phase === 'snoozing') && (
            <>
              <button type="button" className="kn-btn" disabled={busy} onClick={() => onCommand('timer.stop')}>
                <StopIcon size={12} />
                {t.actions.stop}
              </button>
              <button type="button" className="kn-btn" disabled={busy} onClick={() => onCommand('timer.restart')}>
                <RestartIcon size={14} />
                {t.actions.restart}
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
