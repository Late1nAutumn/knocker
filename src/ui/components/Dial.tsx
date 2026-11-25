import type { ReactNode } from 'react';
import type { Phase } from '../../shared/types.js';

const SIZE = 196;
const STROKE = 10;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export interface DialProps {
  phase: Phase;
  /** Remaining part of the countdown, 0..1. */
  remaining: number;
  children: ReactNode;
}

/** Circular countdown: the bar shrinks as the deadline approaches. */
export function Dial({ phase, remaining, children }: DialProps) {
  const fraction = phase === 'ringing' ? 1 : phase === 'stopped' ? 0 : Math.min(1, Math.max(0, remaining));
  const offset = CIRCUMFERENCE * (1 - fraction);
  const barClass = `kn-dial-bar${phase === 'snoozing' ? ' kn-dial-bar-snooze' : ''}${phase === 'ringing' ? ' kn-pulse' : ''}`;
  return (
    <div className={`kn-dial kn-dial-${phase}`}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        <circle className="kn-dial-track" cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={STROKE} />
        <circle
          className={barClass}
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </svg>
      <div className="kn-dial-center">{children}</div>
    </div>
  );
}
