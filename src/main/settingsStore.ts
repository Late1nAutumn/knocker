import { isAbsolute, extname } from 'node:path';
import { ToolError, type ToolDatabase } from 'ghost-in-shell-sdk';
import {
  AUDIO_EXTENSIONS,
  DEFAULT_SETTINGS,
  MAX_AUDIO_PATH_LENGTH,
  MAX_MESSAGE_LENGTH,
  MAX_MINUTES,
  MIN_MINUTES,
  type Settings,
} from '../shared/types.js';

const KEY = 'settings';

/** Settings persisted as one JSON row in the tool database. */
export class SettingsStore {
  private cache: Settings;

  constructor(private readonly db: ToolDatabase) {
    this.cache = this.read();
  }

  get(): Settings {
    return { ...this.cache };
  }

  /** Validates and merges a partial update from the renderer; throws BAD_SETTINGS on invalid input. */
  update(patch: unknown): Settings {
    const next = { ...this.cache, ...validatePatch(patch) };
    this.db
      .prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .run(KEY, JSON.stringify(next));
    this.cache = next;
    return this.get();
  }

  private read(): Settings {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(KEY) as { value: string } | undefined;
    if (!row) return { ...DEFAULT_SETTINGS };
    try {
      const parsed = JSON.parse(row.value) as Record<string, unknown>;
      const out = { ...DEFAULT_SETTINGS };
      for (const k of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
        try {
          Object.assign(out, validatePatch({ [k]: parsed[k] }));
        } catch {
          // keep the default for a damaged field
        }
      }
      return out;
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }
}

function bad(message: string): never {
  throw new ToolError('BAD_SETTINGS', message);
}

function minutes(v: unknown, name: string): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < MIN_MINUTES || v > MAX_MINUTES) {
    bad(`${name} must be an integer ${MIN_MINUTES}..${MAX_MINUTES}`);
  }
  return v;
}

export function isSupportedAudio(path: string): boolean {
  const ext = extname(path).slice(1).toLowerCase();
  return (AUDIO_EXTENSIONS as readonly string[]).includes(ext);
}

export function validatePatch(patch: unknown): Partial<Settings> {
  if (typeof patch !== 'object' || patch === null || Array.isArray(patch)) bad('settings must be an object');
  const p = patch as Record<string, unknown>;
  const out: Partial<Settings> = {};
  if (p.intervalMinutes !== undefined) out.intervalMinutes = minutes(p.intervalMinutes, 'intervalMinutes');
  if (p.snoozeMinutes !== undefined) out.snoozeMinutes = minutes(p.snoozeMinutes, 'snoozeMinutes');
  if (p.audioPath !== undefined) {
    const a = p.audioPath;
    if (typeof a !== 'string' || a.length > MAX_AUDIO_PATH_LENGTH) bad('audioPath must be a string');
    if (a !== '' && (!isAbsolute(a) || !isSupportedAudio(a))) bad('audioPath must be an absolute path to a supported audio file');
    out.audioPath = a;
  }
  if (p.message !== undefined) {
    const m = p.message;
    if (typeof m !== 'string' || m.length > MAX_MESSAGE_LENGTH) bad(`message must be a string of at most ${MAX_MESSAGE_LENGTH} chars`);
    out.message = m;
  }
  return out;
}
