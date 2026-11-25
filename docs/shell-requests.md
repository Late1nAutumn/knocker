# Shell capability requests

Tool id: `knocker`. Requests go to the GhostInShell shell session (GUIDE chapter 8).

## R-1 Popup actions and closing popups

Status: implemented in ghost-in-shell-sdk v0.9.0 (2026-11-24); Knocker uses it directly.

### Purpose

When a reminder fires while Knocker is not in front, it shows a `ctx.popup` card. The legacy app's
popup had two buttons, "Confirm" and "Snooze N min", handled right in the popup. Today a popup
component can only call `open()` / `dismiss()`, so:

1. The user must open the tool to confirm or snooze (one extra step, and it takes focus).
2. When the reminder is confirmed elsewhere (in the tool UI, the tray menu, or a snooze ends), main
   cannot close the stale popup that is still on screen (`durationMs: 0`).

### Proposed interface

Main side (`ToolMainContext`):

```ts
/** Now returns the id of the shown popup (was void). */
popup(options: ToolPopupOptions): string;
/** Closes a popup this tool opened. No-op if it is already gone. Unknown/foreign ids: no-op. */
closePopup(popupId: string): void;
/** Called when a Notification component calls props.action(id). Returns unsubscribe. */
onPopupAction(listener: (actionId: string, popupId: string) => void): () => void;
```

Renderer side (`ToolNotificationProps`):

```ts
/** Sends actionId to the tool's main onPopupAction listeners and closes this popup. Does not show the window. */
action(actionId: string): void;
```

- `actionId`: same pattern as tray menu ids (`TRAY_MENU_ITEM_ID_PATTERN`); invalid ids are ignored
  and logged.
- Listener errors are logged and do not affect other listeners (same as `tray.onMenu`).
- Fake ctx: `ctx.records.popups` entries get their id; `ctx.clickPopupAction(popupId, actionId)`;
  `ctx.records.closedPopups`.

### Callers

- `src/ui/Popup.tsx`: "Confirm" / "Snooze" buttons call `props.action`.
- `src/main/knocker.ts`: `ctx.onPopupAction`, and `ctx.closePopup` on confirm / snooze / stop /
  restart from the UI or the tray.
