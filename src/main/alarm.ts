import type { Phase, TimerState } from '../shared/types.js';

const MINUTE_MS = 60_000;

/**
 * The reminder state machine (pure, clock passed in). Mirrors the legacy app:
 * stopped -> counting -> ringing -> (confirm) counting | (snooze) snoozing -> ringing ...
 * While ringing, time does not accumulate further reminders.
 */
export class Alarm {
  private phase: Phase = 'stopped';
  private deadline: number | null = null;
  private periodMs: number | null = null;
  private ringingSince: number | null = null;

  state(): TimerState {
    return { phase: this.phase, deadline: this.deadline, periodMs: this.periodMs, ringingSince: this.ringingSince };
  }

  /** Starts a full countdown (also used by restart and confirm). */
  startCounting(now: number, intervalMinutes: number): void {
    this.setCountdown('counting', now, intervalMinutes);
  }

  stop(): void {
    this.phase = 'stopped';
    this.deadline = null;
    this.periodMs = null;
    this.ringingSince = null;
  }

  /** Returns true when it was ringing and moved to snoozing. */
  snooze(now: number, snoozeMinutes: number): boolean {
    if (this.phase !== 'ringing') return false;
    this.setCountdown('snoozing', now, snoozeMinutes);
    return true;
  }

  /** Returns true when the deadline passed and the alarm started ringing. */
  tick(now: number): boolean {
    if ((this.phase === 'counting' || this.phase === 'snoozing') && this.deadline !== null && now >= this.deadline) {
      this.phase = 'ringing';
      this.deadline = null;
      this.periodMs = null;
      this.ringingSince = now;
      return true;
    }
    return false;
  }

  private setCountdown(phase: 'counting' | 'snoozing', now: number, minutes: number): void {
    this.phase = phase;
    this.periodMs = minutes * MINUTE_MS;
    this.deadline = now + this.periodMs;
    this.ringingSince = null;
  }
}
