# Knocker

A [GhostInShell](https://github.com/Late1nAutumn/ghost-in-shell) tool: a recurring reminder that
plays a sound you choose and waits until you confirm.

Rebuilt from the original WinForms tray app (history before `v0.1.0` of this repository).

## Features

- Counts down a reminder interval (1-1440 min). The timer starts when the shell starts.
- At the deadline:
  - plays your local audio file in a loop (optional; no sound file means a silent reminder);
  - shows a reminder card: in the tool when it is in front, otherwise as a shell popup at the
    bottom right with a live clock and your text.
- **Confirm** restarts the full interval. **Snooze** reminds you again after the snooze minutes.
  Until you confirm, the timer waits; reminders never pile up.
- Start, stop and restart at any time. Stopping also ends a running reminder.
- Own tray icon: tooltip with the time left, menu with Start/Stop, Restart, Open and, while
  reminding, Confirm and Snooze.
- English and Simplified Chinese, following the shell language.

Supported audio formats: mp3, wav, ogg, oga, opus, flac, m4a, aac, webm (the shell's sound
formats; `.wma` from the legacy app is not supported).

## Development

```
npm install      # also builds dist
npm test
npm run typecheck
npm run build
```

Structure:

```
src/index.ts          renderer entry (ToolModule)
src/main.ts           main entry (ToolMain): IPC handlers
src/main/             timer state machine, settings store, tray, shell adapters
src/ui/               React UI and the popup card
src/shared/           channel types, constants, i18n
migrations/           SQLite migrations (settings table)
resources/tray.ico    tray icon
docs/shell-requests.md  capability requests to the shell
```

Settings are stored in the tool database provided by the shell.

## Release

Bump `version`, run tests and build, commit, tag `vX.Y.Z`, push the tag, then ask the shell
maintainer to add `"knocker": "github:Late1nAutumn/knocker#vX.Y.Z"` to the shell.
