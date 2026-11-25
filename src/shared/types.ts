/** Shared between the renderer and main entries: types and plain constants only. */

export const TOOL_ID = 'knocker';

export const MIN_MINUTES = 1;
export const MAX_MINUTES = 1440;
export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_AUDIO_PATH_LENGTH = 1024;

/** Extensions the shell can play (SOUND_FILE_EXTENSIONS), without the dot. */
export const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'oga', 'opus', 'flac', 'm4a', 'aac', 'webm'] as const;

export interface Settings {
  intervalMinutes: number;
  snoozeMinutes: number;
  /** Absolute path of a local audio file; '' = silent reminder. */
  audioPath: string;
  /** Text shown in the reminder; '' = the localized default text. */
  message: string;
}

export const DEFAULT_SETTINGS: Settings = {
  intervalMinutes: 60,
  snoozeMinutes: 5,
  audioPath: '',
  message: '',
};

export type Phase = 'stopped' | 'counting' | 'ringing' | 'snoozing';

export interface TimerState {
  phase: Phase;
  /** Epoch ms when the next reminder fires (counting / snoozing), else null. */
  deadline: number | null;
  /** Length of the current countdown in ms (for progress), else null. */
  periodMs: number | null;
  /** Epoch ms when the current reminder started (ringing), else null. */
  ringingSince: number | null;
}

export interface Snapshot {
  settings: Settings;
  timer: TimerState;
  /** A preview of the audio file is playing. */
  previewing: boolean;
  /** The reminder sound of the current ring could not be played. */
  soundFailed: boolean;
}

/** ctx.popup data for the reminder card. */
export interface PopupData {
  message: string;
  snoozeMinutes: number;
  ringingSince: number;
}

/** Action ids sent by the reminder popup (ToolNotificationProps.action). */
export type PopupAction = 'confirm' | 'snooze';

export function clampMinutes(n: number): number {
  if (!Number.isFinite(n)) return MIN_MINUTES;
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(n)));
}
