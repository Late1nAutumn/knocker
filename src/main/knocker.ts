import { dirname, isAbsolute, join } from 'node:path';
import { ToolError, type ToolMainContext, type ToolTrayMenuItem } from 'ghost-in-shell-sdk';
import type { Requests } from '../shared/channels.js';
import { coarseDuration, messages } from '../shared/i18n.js';
import { AUDIO_EXTENSIONS, type PopupData, type Snapshot } from '../shared/types.js';
import { Alarm } from './alarm.js';
import { isSupportedAudio, SettingsStore } from './settingsStore.js';

export const TICK_MS = 1000;
/** The UI reports presence every 5 s; older reports count as "not in front". */
export const PRESENCE_TIMEOUT_MS = 12_000;

export interface Clock {
  now(): number;
  setInterval(fn: () => void, ms: number): unknown;
  clearInterval(handle: unknown): void;
}

export const systemClock: Clock = {
  now: () => Date.now(),
  setInterval: (fn, ms) => setInterval(fn, ms),
  clearInterval: (h) => clearInterval(h as ReturnType<typeof setInterval>),
};

type TrayId = 'confirm' | 'snooze' | 'toggle' | 'restart' | 'open';

/** Main-side service: timer, sound, popup, tray and the IPC handlers' logic. */
export class Knocker {
  readonly settings: SettingsStore;
  private readonly alarm = new Alarm();
  private ticker: unknown = null;
  private previewing = false;
  private soundFailed = false;
  private ringSession = 0;
  private popupId: string | null = null;
  private foreground = false;
  private lastPresence = 0;
  private trayKey = '';
  private readonly offs: (() => void)[] = [];

  constructor(
    private readonly ctx: ToolMainContext,
    private readonly clock: Clock = systemClock,
  ) {
    this.settings = new SettingsStore(ctx.db);
  }

  /** Called from register(): the legacy app starts counting right away. */
  start(): void {
    this.offs.push(this.ctx.tray.onMenu((id) => this.onTrayMenu(id)));
    this.offs.push(this.ctx.onLanguageChange(() => this.updateTray(true)));
    this.offs.push(this.ctx.onPopupAction((action, popupId) => this.onPopupAction(action, popupId)));
    this.alarm.startCounting(this.clock.now(), this.settings.get().intervalMinutes);
    this.updateTray(true);
    this.ticker = this.clock.setInterval(() => this.tick(), TICK_MS);
  }

  dispose(): void {
    if (this.ticker !== null) this.clock.clearInterval(this.ticker);
    this.ticker = null;
    for (const off of this.offs.splice(0)) off();
    this.ctx.sound.stop();
    this.closePopup();
    this.ctx.tray.remove();
  }

  snapshot(): Snapshot {
    return {
      settings: this.settings.get(),
      timer: this.alarm.state(),
      previewing: this.previewing,
      soundFailed: this.soundFailed,
    };
  }

  tick(): void {
    if (this.alarm.tick(this.clock.now())) this.ring();
    else this.updateTray();
  }

  // ---------- commands ----------

  saveSettings(patch: Requests['settings.save']['req']): Snapshot {
    this.settings.update(patch);
    return this.changed();
  }

  startTimer(): Snapshot {
    if (this.alarm.state().phase === 'stopped') this.alarm.startCounting(this.clock.now(), this.settings.get().intervalMinutes);
    return this.changed();
  }

  stopTimer(): Snapshot {
    this.endRing();
    this.stopPreview();
    this.alarm.stop();
    return this.changed();
  }

  restart(): Snapshot {
    this.endRing();
    this.alarm.startCounting(this.clock.now(), this.settings.get().intervalMinutes);
    return this.changed();
  }

  confirm(): Snapshot {
    if (this.alarm.state().phase === 'ringing') {
      this.endRing();
      this.alarm.startCounting(this.clock.now(), this.settings.get().intervalMinutes);
    }
    return this.changed();
  }

  snooze(): Snapshot {
    if (this.alarm.state().phase === 'ringing') {
      this.endRing();
      this.alarm.snooze(this.clock.now(), this.settings.get().snoozeMinutes);
    }
    return this.changed();
  }

  async pickAudio(): Promise<string | null> {
    const t = messages(this.ctx.language);
    const current = this.settings.get().audioPath;
    const picked = await this.ctx.dialog.openFile({
      title: t.dialog.audioTitle,
      filters: [{ name: t.dialog.audioFilter, extensions: [...AUDIO_EXTENSIONS] }],
      ...(current ? { defaultPath: dirname(current) } : {}),
    });
    return picked?.[0] ?? null;
  }

  async preview(payload: unknown): Promise<Snapshot> {
    const path = (payload as { path?: unknown } | null)?.path;
    if (path === null || path === undefined) {
      this.stopPreview();
      return this.changed();
    }
    if (typeof path !== 'string' || !isAbsolute(path) || !isSupportedAudio(path)) {
      throw new ToolError('BAD_AUDIO', 'path must be an absolute path to a supported audio file');
    }
    if (this.alarm.state().phase === 'ringing') throw new ToolError('RINGING', 'a reminder is playing');
    await this.ctx.sound.play(path, { loop: true });
    this.previewing = true;
    return this.changed();
  }

  setPresence(payload: unknown): void {
    const fg = (payload as { foreground?: unknown } | null)?.foreground;
    if (typeof fg !== 'boolean') throw new ToolError('BAD_PRESENCE', 'foreground must be a boolean');
    this.foreground = fg;
    this.lastPresence = this.clock.now();
  }

  isForeground(): boolean {
    return this.foreground && this.clock.now() - this.lastPresence < PRESENCE_TIMEOUT_MS;
  }

  // ---------- internals ----------

  private ring(): void {
    const s = this.settings.get();
    const session = ++this.ringSession;
    this.soundFailed = false;
    if (this.previewing) {
      this.previewing = false;
      this.ctx.sound.stop();
    }
    if (s.audioPath) {
      this.ctx.sound.play(s.audioPath, { loop: true }).catch((err: unknown) => {
        this.ctx.log.warn('reminder sound failed', err);
        if (session !== this.ringSession || this.alarm.state().phase !== 'ringing') return;
        this.soundFailed = true;
        this.changed();
      });
    }
    // The UI shows its own reminder when it is in front (GUIDE 7.5).
    if (!this.isForeground()) {
      const t = messages(this.ctx.language);
      const data: PopupData = {
        message: s.message || t.defaultMessage,
        snoozeMinutes: s.snoozeMinutes,
        ringingSince: this.alarm.state().ringingSince ?? this.clock.now(),
      };
      try {
        this.popupId = this.ctx.popup({ data, route: '', durationMs: 0 });
      } catch (err) {
        this.ctx.log.warn('could not show popup', err);
      }
    }
    this.changed();
  }

  private endRing(): void {
    if (this.alarm.state().phase !== 'ringing') return;
    this.ringSession++;
    this.soundFailed = false;
    this.ctx.sound.stop();
    this.closePopup();
  }

  private closePopup(): void {
    if (this.popupId === null) return;
    this.ctx.closePopup(this.popupId);
    this.popupId = null;
  }

  /** Buttons on the reminder popup (ToolNotificationProps.action). Stale popups are ignored. */
  private onPopupAction(action: string, popupId: string): void {
    if (popupId !== this.popupId) return;
    this.popupId = null; // the shell closes the popup itself
    if (action === 'confirm') this.confirm();
    else if (action === 'snooze') this.snooze();
  }

  private stopPreview(): void {
    if (!this.previewing) return;
    this.previewing = false;
    this.ctx.sound.stop();
  }

  private changed(): Snapshot {
    const snap = this.snapshot();
    this.ctx.emit('state.changed', snap);
    this.updateTray();
    return snap;
  }

  private onTrayMenu(id: string): void {
    switch (id as TrayId) {
      case 'confirm':
        this.confirm();
        break;
      case 'snooze':
        this.snooze();
        break;
      case 'toggle':
        if (this.alarm.state().phase === 'stopped') this.startTimer();
        else this.stopTimer();
        break;
      case 'restart':
        this.restart();
        break;
      case 'open':
        this.ctx.show({ route: '' });
        break;
    }
  }

  /**
   * Calls ctx.tray.set only when the tooltip or menu changed: the shell rebuilds the menu on every
   * call, which would close a menu the user has open. The tooltip therefore uses minutes.
   */
  private updateTray(force = false): void {
    const resources = this.ctx.paths.resources;
    if (!resources) return;
    const lang = messages(this.ctx.language);
    const t = lang.tray;
    const timer = this.alarm.state();
    const s = this.settings.get();
    const left = timer.deadline === null ? 0 : timer.deadline - this.clock.now();
    let tooltip: string;
    if (timer.phase === 'counting') tooltip = t.counting(coarseDuration(lang, left));
    else if (timer.phase === 'snoozing') tooltip = t.snoozing(coarseDuration(lang, left));
    else if (timer.phase === 'ringing') tooltip = t.ringing;
    else tooltip = t.stopped;

    const menu: ToolTrayMenuItem[] = [];
    if (timer.phase === 'ringing') {
      menu.push({ id: 'confirm', label: t.confirm }, { id: 'snooze', label: t.snooze(s.snoozeMinutes) }, { type: 'separator' });
    }
    menu.push(
      { id: 'toggle', label: timer.phase === 'stopped' ? t.start : t.stop },
      { id: 'restart', label: t.restart },
      { type: 'separator' },
      { id: 'open', label: t.open },
    );
    const key = JSON.stringify([tooltip, menu]);
    if (!force && key === this.trayKey) return;
    this.trayKey = key;
    try {
      this.ctx.tray.set({ icon: join(resources, 'tray.ico'), tooltip, menu });
    } catch (err) {
      this.ctx.log.warn('could not update tray', err);
    }
  }
}
