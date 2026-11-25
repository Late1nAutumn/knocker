import { useCallback, useEffect, useRef, useState } from 'react';
import { isToolIpcError } from 'ghost-in-shell-sdk';
import { useApi, useEvent, useT } from './api.js';
import { useNow, usePresence } from './hooks.js';
import type { Settings, Snapshot } from '../shared/types.js';
import { CheckIcon, CloseIcon, WarningIcon } from './components/Icons.js';
import { MessageField } from './components/MessageField.js';
import { MinutesField } from './components/MinutesField.js';
import { ReminderModal } from './components/ReminderModal.js';
import { SoundField } from './components/SoundField.js';
import { StatusCard, type TimerCommand } from './components/StatusCard.js';
import iconUrl from './assets/icon.png';

const INTERVAL_PRESETS = [15, 30, 45, 60, 90, 120] as const;
const SNOOZE_PRESETS = [1, 5, 10, 15] as const;
const SAVED_VISIBLE_MS = 2000;

type SaveState = 'idle' | 'saving' | 'saved';

/** The tool's single page: status card, in-app reminder and settings. */
export function KnockerPage() {
  const { call } = useApi();
  const t = useT();
  const rootRef = useRef<HTMLDivElement>(null);
  const now = useNow();
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  usePresence(rootRef);
  useEvent('state.changed', setSnap);

  useEffect(() => {
    let alive = true;
    call('state.get')
      .then((s) => {
        if (alive) setSnap(s);
      })
      .catch((e: unknown) => {
        if (alive) setError(describe(e, t.errors.generic));
      });
    return () => {
      alive = false;
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call]);

  const command = useCallback(
    async (c: TimerCommand) => {
      setBusy(true);
      setError(null);
      try {
        setSnap(await call(c));
      } catch (e) {
        setError(describe(e, t.errors.generic));
      } finally {
        setBusy(false);
      }
    },
    [call, t],
  );

  const save = useCallback(
    async (patch: Partial<Settings>) => {
      setSaveState('saving');
      setError(null);
      try {
        setSnap(await call('settings.save', patch));
        setSaveState('saved');
        if (savedTimer.current) clearTimeout(savedTimer.current);
        savedTimer.current = setTimeout(() => setSaveState('idle'), SAVED_VISIBLE_MS);
      } catch (e) {
        setSaveState('idle');
        setError(describe(e, t.errors.generic));
      }
    },
    [call, t],
  );

  const chooseAudio = async () => {
    setError(null);
    try {
      const path = await call('audio.pick');
      if (path) await save({ audioPath: path });
    } catch (e) {
      setError(describe(e, t.errors.generic));
    }
  };

  const togglePreview = async () => {
    if (!snap) return;
    setError(null);
    try {
      setSnap(await call('audio.preview', { path: snap.previewing ? null : snap.settings.audioPath }));
    } catch (e) {
      setError(soundError(e) ? t.errors.soundFailed : describe(e, t.errors.generic));
    }
  };

  const clearAudio = async () => {
    if (snap?.previewing) await call('audio.preview', { path: null }).catch(() => undefined);
    await save({ audioPath: '' });
  };

  return (
    <div className="kn-root" ref={rootRef}>
      <div className="kn-page">
        <header className="kn-header">
          <img className="kn-header-icon" src={iconUrl} alt="" />
          <h1 className="kn-header-title">{t.appName}</h1>
        </header>

        {error && (
          <div className="kn-alert" role="alert">
            <WarningIcon size={15} />
            <span className="kn-alert-text">{error}</span>
            <button type="button" className="kn-btn kn-btn-quiet kn-btn-icon" aria-label={t.actions.close} onClick={() => setError(null)}>
              <CloseIcon size={12} />
            </button>
          </div>
        )}

        {snap && (
          <>
            <StatusCard snapshot={snap} now={now} busy={busy} onCommand={command} />

            <section className="kn-card">
              <div className="kn-card-head">
                <h2 className="kn-card-title">{t.settings.title}</h2>
                <span className={`kn-save${saveState === 'saved' ? ' kn-save-ok' : ''}`} aria-live="polite">
                  {saveState === 'saving' && t.settings.saving}
                  {saveState === 'saved' && (
                    <>
                      <CheckIcon size={12} />
                      {t.settings.saved}
                    </>
                  )}
                </span>
              </div>
              <div className="kn-fields">
                <MinutesField
                  label={t.settings.interval}
                  value={snap.settings.intervalMinutes}
                  presets={INTERVAL_PRESETS}
                  hint={t.settings.intervalHint}
                  onChange={(v) => void save({ intervalMinutes: v })}
                />
                <MinutesField
                  label={t.settings.snooze}
                  value={snap.settings.snoozeMinutes}
                  presets={SNOOZE_PRESETS}
                  onChange={(v) => void save({ snoozeMinutes: v })}
                />
                <SoundField
                  path={snap.settings.audioPath}
                  previewing={snap.previewing}
                  disabled={snap.timer.phase === 'ringing'}
                  onChoose={() => void chooseAudio()}
                  onClear={() => void clearAudio()}
                  onTogglePreview={() => void togglePreview()}
                />
                <MessageField value={snap.settings.message} onChange={(v) => void save({ message: v })} />
              </div>
            </section>

            {snap.timer.phase === 'ringing' && (
              <ReminderModal
                now={now}
                message={snap.settings.message || t.defaultMessage}
                snoozeMinutes={snap.settings.snoozeMinutes}
                busy={busy}
                onConfirm={() => void command('alarm.confirm')}
                onSnooze={() => void command('alarm.snooze')}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function soundError(e: unknown): boolean {
  return isToolIpcError(e) && (e.code === 'GHOST_SOUND_FAILED' || e.code === 'GHOST_BAD_REQUEST');
}

function describe(e: unknown, fallback: string): string {
  if (isToolIpcError(e) && e.message) return `${fallback} (${e.message})`;
  return fallback;
}
