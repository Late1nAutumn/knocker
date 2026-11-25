import { useEffect, useId, useState } from 'react';
import { useT } from '../api.js';
import { clampMinutes, MAX_MINUTES, MIN_MINUTES } from '../../shared/types.js';

export interface MinutesFieldProps {
  label: string;
  value: number;
  presets: readonly number[];
  hint?: string;
  onChange(value: number): void;
}

/** Minutes input (1..1440) with quick presets. Commits on blur or Enter. */
export function MinutesField({ label, value, presets, hint, onChange }: MinutesFieldProps) {
  const t = useT();
  const id = useId();
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  const commit = () => {
    const n = clampMinutes(Number.parseInt(draft, 10));
    setDraft(String(n));
    if (n !== value) onChange(n);
  };

  return (
    <div className="kn-field">
      <label className="kn-field-label" htmlFor={id}>
        {label}
      </label>
      <div className="kn-field-body">
        <div className="kn-row">
          <input
            id={id}
            className="kn-input kn-input-num"
            type="number"
            inputMode="numeric"
            min={MIN_MINUTES}
            max={MAX_MINUTES}
            step={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
            }}
          />
          <span className="kn-unit">{t.settings.minutes}</span>
          <div className="kn-chips">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                className={`kn-chip${p === value ? ' kn-chip-on' : ''}`}
                aria-pressed={p === value}
                onClick={() => {
                  setDraft(String(p));
                  if (p !== value) onChange(p);
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        {hint && <p className="kn-hint">{hint}</p>}
      </div>
    </div>
  );
}
