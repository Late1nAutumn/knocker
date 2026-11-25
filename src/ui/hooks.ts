import { useEffect, useState, type RefObject } from 'react';
import { useApi, useCurrentWindow, useLang } from './api.js';

const PRESENCE_HEARTBEAT_MS = 5000;

/** Current time, refreshed every interval (1 s by default). */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Formats a time of day in the shell language. */
export function useTimeFormat(withSeconds = false): (ms: number) => string {
  const lang = useLang();
  const fmt = new Intl.DateTimeFormat(lang, {
    hour: '2-digit',
    minute: '2-digit',
    ...(withSeconds ? { second: '2-digit' } : {}),
    hour12: false,
  });
  return (ms) => fmt.format(new Date(ms));
}

/**
 * Reports to main whether the tool is in front (visible, focused, not inert), so a reminder shows
 * in the tool instead of a shell popup (GUIDE 7.5).
 */
export function usePresence(rootRef: RefObject<HTMLElement | null>): void {
  const api = useApi();
  const win = useCurrentWindow();
  useEffect(() => {
    let last: boolean | null = null;
    const compute = () => {
      const el = rootRef.current;
      const fg = win.document.visibilityState === 'visible' && win.document.hasFocus() && !!el && !el.closest('[inert]');
      if (fg || last !== fg) api.call('ui.presence', { foreground: fg }).catch(() => undefined);
      last = fg;
    };
    compute();
    const timer = win.setInterval(compute, PRESENCE_HEARTBEAT_MS);
    win.addEventListener('focus', compute);
    win.addEventListener('blur', compute);
    win.document.addEventListener('visibilitychange', compute);
    return () => {
      win.clearInterval(timer);
      win.removeEventListener('focus', compute);
      win.removeEventListener('blur', compute);
      win.document.removeEventListener('visibilitychange', compute);
      api.call('ui.presence', { foreground: false }).catch(() => undefined);
    };
  }, [api, win, rootRef]);
}
