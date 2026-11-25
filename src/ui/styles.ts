/**
 * Scoped CSS: every selector starts with a .kn-* class (H16). Light UI (H21); the amber accent
 * matches the tool icon.
 */
export const CSS = `
.kn-root, .kn-backdrop, .kn-popup {
  --kn-ink: #1f1d1a;
  --kn-muted: #6f695f;
  --kn-faint: #a39d92;
  --kn-line: #e7e2d8;
  --kn-surface: #ffffff;
  --kn-page: #f7f5f0;
  --kn-accent: #f2b705;
  --kn-accent-strong: #d99e00;
  --kn-accent-soft: #fff4cc;
  --kn-danger: #b4401a;
  --kn-danger-soft: #fdebe3;
  --kn-ok: #2f7d4f;
  font: 14px/1.5 "Segoe UI", system-ui, "Microsoft YaHei UI", sans-serif;
  color: var(--kn-ink);
}
.kn-root *, .kn-backdrop *, .kn-popup * { box-sizing: border-box; }

.kn-root { min-height: 100%; background: var(--kn-page); padding: 24px 20px 40px; }
.kn-page { max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; }
.kn-header { display: flex; align-items: center; gap: 10px; }
.kn-header-icon { width: 28px; height: 28px; }
.kn-header-title { font-size: 18px; font-weight: 650; margin: 0; letter-spacing: .01em; }

.kn-card { background: var(--kn-surface); border: 1px solid var(--kn-line); border-radius: 14px; padding: 20px 22px; }
.kn-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.kn-card-title { margin: 0; font-size: 15px; font-weight: 650; }

/* status */
.kn-status { display: flex; align-items: center; gap: 28px; flex-wrap: wrap; }
.kn-status-ringing { border-color: var(--kn-accent); box-shadow: 0 0 0 3px var(--kn-accent-soft); }
.kn-dial { position: relative; width: 196px; height: 196px; flex: none; }
.kn-dial svg { display: block; }
.kn-dial-track { stroke: #efeae0; }
.kn-dial-bar { stroke: var(--kn-accent); transition: stroke-dashoffset .9s linear; }
.kn-dial-bar-snooze { stroke: #8a7ff0; }
.kn-dial-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 2px; }
.kn-dial-label { font-size: 12px; color: var(--kn-muted); }
.kn-dial-time { font-size: 32px; font-weight: 650; font-variant-numeric: tabular-nums; letter-spacing: .02em; }
.kn-dial-sub { font-size: 12px; color: var(--kn-muted); }
.kn-dial-stopped .kn-dial-time { color: var(--kn-faint); }
.kn-dial-ringing .kn-dial-time { color: var(--kn-ink); }
.kn-bell { color: var(--kn-accent-strong); animation: kn-shake 1.2s ease-in-out infinite; transform-origin: 50% 10%; }
@keyframes kn-shake { 0%,60%,100% { transform: rotate(0); } 10%,30% { transform: rotate(14deg); } 20%,40% { transform: rotate(-14deg); } 50% { transform: rotate(6deg); } }
.kn-pulse { animation: kn-pulse 1.6s ease-in-out infinite; }
@keyframes kn-pulse { 0%,100% { opacity: 1; } 50% { opacity: .45; } }

.kn-status-body { flex: 1; min-width: 240px; display: flex; flex-direction: column; gap: 12px; }
.kn-status-phase { font-size: 20px; font-weight: 650; margin: 0; }
.kn-status-hint { margin: 0; color: var(--kn-muted); }
.kn-status-message { margin: 0; font-size: 16px; white-space: pre-wrap; word-break: break-word; padding: 10px 14px; border-radius: 10px; background: var(--kn-accent-soft); }
.kn-actions { display: flex; gap: 8px; flex-wrap: wrap; }

/* buttons */
.kn-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; font: inherit; font-weight: 550; color: var(--kn-ink); background: var(--kn-surface); border: 1px solid var(--kn-line); border-radius: 9px; padding: 7px 14px; cursor: pointer; white-space: nowrap; transition: background .12s, border-color .12s; }
.kn-btn:hover:not(:disabled) { background: #f3f0e9; border-color: #d9d3c7; }
.kn-btn:disabled { opacity: .45; cursor: default; }
.kn-btn:focus-visible, .kn-input:focus-visible, .kn-textarea:focus-visible, .kn-chip:focus-visible { outline: 2px solid var(--kn-accent-strong); outline-offset: 2px; }
.kn-btn-primary { background: var(--kn-accent); border-color: var(--kn-accent); color: var(--kn-ink); }
.kn-btn-primary:hover:not(:disabled) { background: var(--kn-accent-strong); border-color: var(--kn-accent-strong); }
.kn-btn-dark { background: var(--kn-ink); border-color: var(--kn-ink); color: #fff; }
.kn-btn-dark:hover:not(:disabled) { background: #3a3631; border-color: #3a3631; }
.kn-btn-quiet { border-color: transparent; background: transparent; color: var(--kn-muted); }
.kn-btn-quiet:hover:not(:disabled) { background: #f3f0e9; border-color: transparent; color: var(--kn-ink); }
.kn-btn-lg { padding: 10px 18px; font-size: 15px; border-radius: 10px; }
.kn-btn-icon { padding: 6px; }

/* settings */
.kn-save { font-size: 12px; color: var(--kn-muted); display: inline-flex; align-items: center; gap: 4px; min-height: 18px; }
.kn-save-ok { color: var(--kn-ok); }
.kn-fields { display: flex; flex-direction: column; }
.kn-field { display: grid; grid-template-columns: 120px 1fr; gap: 6px 16px; align-items: start; padding: 14px 0; border-top: 1px solid var(--kn-line); }
.kn-field:first-child { border-top: none; padding-top: 0; }
.kn-field-label { font-weight: 600; padding-top: 6px; }
.kn-field-body { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.kn-hint { font-size: 12px; color: var(--kn-muted); margin: 0; }
.kn-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.kn-input, .kn-textarea { font: inherit; color: var(--kn-ink); background: var(--kn-surface); border: 1px solid #d9d3c7; border-radius: 8px; padding: 6px 10px; }
.kn-input-num { width: 84px; text-align: right; font-variant-numeric: tabular-nums; }
.kn-textarea { width: 100%; min-height: 84px; resize: vertical; }
.kn-unit { color: var(--kn-muted); }
.kn-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.kn-chip { font: inherit; font-size: 12px; color: var(--kn-muted); background: #f3f0e9; border: 1px solid transparent; border-radius: 999px; padding: 3px 10px; cursor: pointer; font-variant-numeric: tabular-nums; }
.kn-chip:hover { color: var(--kn-ink); border-color: #d9d3c7; }
.kn-chip-on { background: var(--kn-accent-soft); color: var(--kn-ink); border-color: var(--kn-accent); }
.kn-file { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border: 1px solid var(--kn-line); border-radius: 10px; background: #fbfaf7; min-width: 0; }
.kn-file-icon { color: var(--kn-muted); flex: none; }
.kn-file-text { min-width: 0; display: flex; flex-direction: column; }
.kn-file-name { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kn-file-path { font-size: 12px; color: var(--kn-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kn-file-empty { color: var(--kn-muted); }

.kn-alert { display: flex; align-items: flex-start; gap: 8px; padding: 9px 12px; border-radius: 10px; background: var(--kn-danger-soft); color: var(--kn-danger); font-size: 13px; }
.kn-alert-text { flex: 1; }
.kn-alert svg { flex: none; margin-top: 2px; }

/* in-app reminder (rendered into api.overlayContainer) */
.kn-backdrop { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 24px; background: rgba(31, 29, 26, .42); }
.kn-modal { width: min(420px, 100%); background: var(--kn-surface); border-radius: 18px; box-shadow: 0 24px 60px rgba(0,0,0,.28); overflow: hidden; text-align: center; }
.kn-modal-band { height: 6px; background: repeating-linear-gradient(-45deg, var(--kn-accent) 0 14px, var(--kn-ink) 14px 28px); }
.kn-modal-body { padding: 24px 26px 26px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.kn-modal-clock { font-size: 44px; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: .02em; line-height: 1.1; }
.kn-modal-message { margin: 0; font-size: 17px; white-space: pre-wrap; word-break: break-word; max-height: 40vh; overflow: auto; }
.kn-modal-actions { display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap; justify-content: center; }

/* shell popup card (360 px wide window, transparent background) */
.kn-popup { padding: 8px; }
.kn-popup-card { position: relative; background: var(--kn-surface); border: 1px solid var(--kn-line); border-radius: 14px; box-shadow: 0 10px 28px rgba(0,0,0,.22); overflow: hidden; }
.kn-popup-body { padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 6px; }
.kn-popup-top { display: flex; align-items: center; gap: 8px; }
.kn-popup-app { font-size: 12px; font-weight: 600; color: var(--kn-muted); flex: 1; }
.kn-popup-clock { font-size: 30px; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1.15; }
.kn-popup-message { margin: 0; font-size: 15px; white-space: pre-wrap; word-break: break-word; max-height: 120px; overflow: hidden; }
.kn-popup-since { font-size: 12px; color: var(--kn-muted); }
.kn-popup-actions { display: flex; gap: 8px; margin-top: 6px; }
.kn-popup-actions .kn-btn { flex: 1; }
`;
