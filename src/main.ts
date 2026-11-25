import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineToolMain, type ToolMainContext } from 'ghost-in-shell-sdk';
import { TOOL_ID } from './shared/types.js';
import { Knocker, type Clock } from './main/knocker.js';

const here = dirname(fileURLToPath(import.meta.url));

let current: Knocker | null = null;

/** Creates the service and registers its IPC handlers (also used by tests with a fake clock). */
export function setup(ctx: ToolMainContext, clock?: Clock): Knocker {
  const k = new Knocker(ctx, clock);
  ctx.handle('state.get', () => k.snapshot());
  ctx.handle('settings.save', (p) => k.saveSettings(p as never));
  ctx.handle('timer.start', () => k.startTimer());
  ctx.handle('timer.stop', () => k.stopTimer());
  ctx.handle('timer.restart', () => k.restart());
  ctx.handle('alarm.confirm', () => k.confirm());
  ctx.handle('alarm.snooze', () => k.snooze());
  ctx.handle('audio.pick', () => k.pickAudio());
  ctx.handle('audio.preview', (p) => k.preview(p));
  ctx.handle('ui.presence', (p) => k.setPresence(p));
  k.start();
  return k;
}

export default defineToolMain({
  id: TOOL_ID,
  migrationsDir: join(here, '..', 'migrations'),
  register(ctx) {
    current = setup(ctx);
  },
  dispose() {
    current?.dispose();
    current = null;
  },
});
