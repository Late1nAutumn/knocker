import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createFakeContext, createTestDatabase, startTool, assertValidToolMain, assertValidToolManifest } from 'ghost-in-shell-sdk/testing';
import { readFileSync } from 'node:fs';
import main, { setup } from '../src/main.js';
import type { Clock, Knocker } from '../src/main/knocker.js';
import type { Snapshot } from '../src/shared/types.js';

const RESOURCES = resolve(__dirname, '..', 'resources');
const MIN = 60_000;

class FakeClock implements Clock {
  t = Date.UTC(2026, 0, 1, 9, 0, 0);
  private fns = new Map<number, () => void>();
  private next = 1;
  now() {
    return this.t;
  }
  setInterval(fn: () => void) {
    const id = this.next++;
    this.fns.set(id, fn);
    return id;
  }
  clearInterval(h: unknown) {
    this.fns.delete(h as number);
  }
  advance(ms: number) {
    this.t += ms;
    for (const fn of this.fns.values()) fn();
  }
}

let db: ReturnType<typeof createTestDatabase>;
let ctx: ReturnType<typeof createFakeContext>;
let clock: FakeClock;
let k: Knocker;
let tmp: string;
let audio: string;

beforeEach(() => {
  db = createTestDatabase({ migrationsDir: main.migrationsDir });
  ctx = createFakeContext({ toolId: 'knocker', db, resourcesDir: RESOURCES });
  clock = new FakeClock();
  k = setup(ctx, clock);
  tmp = mkdtempSync(join(tmpdir(), 'knocker-'));
  audio = join(tmp, 'ding.wav');
  writeFileSync(audio, 'RIFF');
});

afterEach(() => {
  k.dispose();
  ctx.cleanup();
  db.close();
  rmSync(tmp, { recursive: true, force: true });
});

const state = () => ctx.invoke('state.get') as Promise<Snapshot>;
const lastTray = () => {
  const sets = ctx.records.trays.filter((r) => r.action === 'set');
  const last = sets[sets.length - 1];
  if (!last || last.action !== 'set') throw new Error('no tray');
  return last.options;
};

describe('manifest and entry', () => {
  it('is a valid tool main and manifest', () => {
    assertValidToolMain(main, 'knocker');
    const pkg = JSON.parse(readFileSync(resolve(__dirname, '..', 'package.json'), 'utf8')) as { ghost: unknown };
    assertValidToolManifest(pkg.ghost);
  });

  it('registers and disposes through the shell lifecycle', async () => {
    const d = createTestDatabase({ migrationsDir: main.migrationsDir });
    const c = createFakeContext({ toolId: 'knocker', db: d, resourcesDir: RESOURCES });
    const stop = await startTool(main, c);
    const s = (await c.invoke('state.get')) as Snapshot;
    expect(s.timer.phase).toBe('counting');
    await stop();
    d.close();
  });
});

describe('timer', () => {
  it('starts counting with the default interval', async () => {
    const s = await state();
    expect(s.timer.phase).toBe('counting');
    expect(s.timer.deadline).toBe(clock.t + 60 * MIN);
    expect(lastTray().tooltip).toBe('Knocker - next reminder in 1 h');
  });

  it('rings at the deadline: popup, looping sound, tray actions', async () => {
    await ctx.invoke('settings.save', { audioPath: audio, message: 'Stand up', intervalMinutes: 1 });
    await ctx.invoke('timer.restart');
    clock.advance(MIN);
    const s = await state();
    expect(s.timer.phase).toBe('ringing');
    expect(ctx.records.sounds).toContainEqual({ action: 'play', file: audio, options: { loop: true } });
    expect(ctx.records.popups).toHaveLength(1);
    expect(ctx.records.popups[0]).toMatchObject({ route: '', durationMs: 0, data: { message: 'Stand up', snoozeMinutes: 5 } });
    expect(lastTray().menu?.[0]).toEqual({ id: 'confirm', label: 'Confirm' });
  });

  it('does not ring twice and confirm restarts the full interval', async () => {
    clock.advance(60 * MIN);
    clock.advance(60 * MIN);
    expect(ctx.records.popups).toHaveLength(1);
    const s = (await ctx.invoke('alarm.confirm')) as Snapshot;
    expect(s.timer.phase).toBe('counting');
    expect(s.timer.deadline).toBe(clock.t + 60 * MIN);
    expect(ctx.records.sounds[ctx.records.sounds.length - 1]).toEqual({ action: 'stop' });
  });

  it('snooze counts down the snooze minutes', async () => {
    clock.advance(60 * MIN);
    const s = (await ctx.invoke('alarm.snooze')) as Snapshot;
    expect(s.timer.phase).toBe('snoozing');
    expect(s.timer.deadline).toBe(clock.t + 5 * MIN);
    clock.advance(5 * MIN);
    expect((await state()).timer.phase).toBe('ringing');
  });

  it('stop and start', async () => {
    let s = (await ctx.invoke('timer.stop')) as Snapshot;
    expect(s.timer.phase).toBe('stopped');
    clock.advance(120 * MIN);
    expect(ctx.records.popups).toHaveLength(0);
    s = (await ctx.invoke('timer.start')) as Snapshot;
    expect(s.timer.deadline).toBe(clock.t + 60 * MIN);
  });

  it('shows no popup while the UI is in front', async () => {
    await ctx.invoke('ui.presence', { foreground: true });
    clock.advance(60 * MIN - 1000);
    await ctx.invoke('ui.presence', { foreground: true });
    clock.advance(1000);
    expect((await state()).timer.phase).toBe('ringing');
    expect(ctx.records.popups).toHaveLength(0);
  });

  it('closes the popup when the reminder is confirmed elsewhere', async () => {
    clock.advance(60 * MIN);
    const id = ctx.records.popups[0]?.id;
    expect(id).toBe('popup-1');
    ctx.clickTrayMenu('confirm');
    expect(ctx.records.closedPopups).toEqual([id]);
    expect((await state()).timer.phase).toBe('counting');
  });

  it('popup buttons confirm and snooze', async () => {
    clock.advance(60 * MIN);
    ctx.clickPopupAction(ctx.records.popups[0]!.id, 'snooze');
    let s = await state();
    expect(s.timer.phase).toBe('snoozing');
    expect(ctx.records.sounds[ctx.records.sounds.length - 1]).toEqual({ action: 'stop' });
    clock.advance(5 * MIN);
    expect(ctx.records.popups).toHaveLength(2);
    ctx.clickPopupAction(ctx.records.popups[1]!.id, 'confirm');
    s = await state();
    expect(s.timer.phase).toBe('counting');
    expect(s.timer.deadline).toBe(clock.t + 60 * MIN);
    expect(ctx.records.closedPopups).toEqual([]);
  });

  it('closes the popup on snooze from the UI and on stop', async () => {
    clock.advance(60 * MIN);
    const first = ctx.records.popups[0]!.id;
    await ctx.invoke('alarm.snooze');
    expect(ctx.records.closedPopups).toEqual([first]);
    expect(() => ctx.clickPopupAction(first, 'confirm')).toThrow();
    clock.advance(5 * MIN);
    const second = ctx.records.popups[1]!.id;
    await ctx.invoke('timer.stop');
    expect(ctx.records.closedPopups).toEqual([first, second]);
  });

  it('a silent reminder plays no sound', async () => {
    clock.advance(60 * MIN);
    expect(ctx.records.sounds.filter((r) => r.action === 'play')).toHaveLength(0);
  });

  it('tray menu controls the timer', async () => {
    ctx.clickTrayMenu('toggle');
    expect((await state()).timer.phase).toBe('stopped');
    expect(lastTray().menu?.[0]).toEqual({ id: 'toggle', label: 'Start' });
    ctx.clickTrayMenu('toggle');
    expect((await state()).timer.phase).toBe('counting');
    ctx.clickTrayMenu('open');
    expect(ctx.records.shows).toEqual([{ route: '' }]);
  });

  it('updates the tray only when its text changes', () => {
    const before = ctx.records.trays.length;
    clock.advance(1000);
    clock.advance(1000);
    expect(ctx.records.trays.length).toBe(before);
  });
});

describe('settings', () => {
  it('persists settings across restarts', async () => {
    await ctx.invoke('settings.save', { intervalMinutes: 25, snoozeMinutes: 3, message: 'hi\nthere', audioPath: audio });
    k.dispose();
    const ctx2 = createFakeContext({ toolId: 'knocker', db, resourcesDir: RESOURCES });
    const k2 = setup(ctx2, clock);
    const s = (await ctx2.invoke('state.get')) as Snapshot;
    expect(s.settings).toEqual({ intervalMinutes: 25, snoozeMinutes: 3, message: 'hi\nthere', audioPath: audio });
    expect(s.timer.deadline).toBe(clock.t + 25 * MIN);
    k2.dispose();
    ctx2.cleanup();
  });

  it('rejects invalid values', async () => {
    await expect(ctx.invoke('settings.save', { intervalMinutes: 0 })).rejects.toMatchObject({ code: 'BAD_SETTINGS' });
    await expect(ctx.invoke('settings.save', { intervalMinutes: 1441 })).rejects.toMatchObject({ code: 'BAD_SETTINGS' });
    await expect(ctx.invoke('settings.save', { audioPath: 'relative.mp3' })).rejects.toMatchObject({ code: 'BAD_SETTINGS' });
    await expect(ctx.invoke('settings.save', { audioPath: join(tmp, 'x.wma') })).rejects.toMatchObject({ code: 'BAD_SETTINGS' });
    await expect(ctx.invoke('settings.save', 'nope')).rejects.toMatchObject({ code: 'BAD_SETTINGS' });
  });
});

describe('audio', () => {
  it('previews in a loop and stops', async () => {
    let s = (await ctx.invoke('audio.preview', { path: audio })) as Snapshot;
    expect(s.previewing).toBe(true);
    expect(ctx.records.sounds).toContainEqual({ action: 'play', file: audio, options: { loop: true } });
    s = (await ctx.invoke('audio.preview', { path: null })) as Snapshot;
    expect(s.previewing).toBe(false);
  });

  it('preview of a missing file fails with the shell code', async () => {
    await expect(ctx.invoke('audio.preview', { path: join(tmp, 'missing.mp3') })).rejects.toMatchObject({ code: 'GHOST_BAD_REQUEST' });
  });

  it('pick returns the chosen file or null', async () => {
    expect(await ctx.invoke('audio.pick')).toBeNull();
    const c = createFakeContext({ toolId: 'knocker', db, resourcesDir: RESOURCES, dialog: { openFile: async () => [audio] } });
    const k2 = setup(c, clock);
    expect(await c.invoke('audio.pick')).toBe(audio);
    k2.dispose();
    c.cleanup();
  });
});

describe('language', () => {
  it('rebuilds the tray in Chinese', () => {
    ctx.setLanguage('zh-CN');
    expect(lastTray().tooltip).toBe('Knocker - 距下次提醒 1 小时');
  });
});
