import { useEffect, useId, useRef, useState } from 'react';
import { useT } from '../api.js';
import { MAX_MESSAGE_LENGTH } from '../../shared/types.js';

const SAVE_DELAY_MS = 600;

export interface MessageFieldProps {
  value: string;
  onChange(value: string): void;
}

/** Reminder text; saved shortly after typing stops and on blur. */
export function MessageField({ value, onChange }: MessageFieldProps) {
  const t = useT();
  const id = useId();
  const [draft, setDraft] = useState(value);
  const focused = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ value, onChange });
  latest.current = { value, onChange };

  useEffect(() => {
    if (!focused.current) setDraft(value);
  }, [value]);

  const flush = (text: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (text !== latest.current.value) latest.current.onChange(text);
  };

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <div className="kn-field">
      <label className="kn-field-label" htmlFor={id}>
        {t.settings.message}
      </label>
      <div className="kn-field-body">
        <textarea
          id={id}
          className="kn-textarea"
          value={draft}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder={t.settings.messagePlaceholder}
          onFocus={() => {
            focused.current = true;
          }}
          onBlur={() => {
            focused.current = false;
            flush(draft);
          }}
          onChange={(e) => {
            const text = e.target.value;
            setDraft(text);
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => flush(text), SAVE_DELAY_MS);
          }}
        />
      </div>
    </div>
  );
}
