import type { Settings, Snapshot } from './types.js';

/** Request channels: payload and response types. */
export interface Requests {
  'state.get': { req: void; res: Snapshot };
  'settings.save': { req: Partial<Settings>; res: Snapshot };
  'timer.start': { req: void; res: Snapshot };
  'timer.stop': { req: void; res: Snapshot };
  'timer.restart': { req: void; res: Snapshot };
  'alarm.confirm': { req: void; res: Snapshot };
  'alarm.snooze': { req: void; res: Snapshot };
  /** Opens a file dialog; resolves the chosen path or null when cancelled. */
  'audio.pick': { req: void; res: string | null };
  /** Starts (path given) or stops (null) the looping preview. */
  'audio.preview': { req: { path: string | null }; res: Snapshot };
  'ui.presence': { req: { foreground: boolean }; res: void };
}

export interface Events {
  'state.changed': Snapshot;
}

export type RequestChannel = keyof Requests;
export type ReqOf<C extends RequestChannel> = Requests[C]['req'];
export type ResOf<C extends RequestChannel> = Requests[C]['res'];
export type EventChannel = keyof Events;
