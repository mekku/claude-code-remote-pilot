---
id: cli-launch-flow
name: Launch Flow
type: flow
domain: cli
status: active
confidence: source_supported
source_files:
  - bin/claude-pilot.js
  - lib/SessionManager.js
  - lib/Watcher.js
  - lib/notifier.js
last_reviewed: 2026-05-13
version: 0.14.7
tags:
  - type/flow
  - domain/cli
  - status/active
---

# Launch Flow

End-to-end path from user running `claude-remote-pilot` to a supervised session running in tmux, with Telegram callback polling active.

## Steps

1. `bin/claude-pilot.js` starts → loads config via `lib/config.js`
2. If setup not done: prompts for tmux session name, Telegram credentials, web port → saves prefs
3. Checks tmux is running; optionally starts the web server (`lib/WebServer.js`); always prints the dashboard URL to the terminal — opens a browser only when not in a headless/SSH environment (`isHeadless()` checks `SSH_CLIENT`, `SSH_TTY`, `DISPLAY`)
4. Creates `SessionManager`; if `telegram.token` is set → calls `notifier.startPolling(token, callback)` to begin receiving Telegram button taps. The poll loop skips stale callbacks by fetching the current `update_id` on startup.
5. Re-adopts saved sessions from previous run (if any); auto-discovers untracked tmux sessions
6. Displays interactive session menu (readline)
7. User selects "New session" → `SessionManager.spawn(cwd, name, command)`
8. SessionManager creates tmux window → sends agent command; instantiates `Watcher`
9. Watcher polls pane; on needs-response → sends Telegram message (with buttons if menu detected)
10. Telegram button tap → poll loop → `SessionManager.handleTelegramCallback` → `tmux send-keys`
11. On exit (`exit` command or SIGTERM): `notifier.stopPolling()` → web server stop → graceful tmux cleanup

## Related

- [[cli|CLI domain]]
- [[cli-launch-session|Launch Session]]
- [[session-create|Create Session]]
- [[session-watch-process|Watch Process]]
- [[session-watch-flow|Watch and Resume Flow]]
- [[core-load-config|Load Config]]
- [[core-send-notification|Send Notification]]
- [[core-notification-concept|Notification Concept]]
- [[web-serve-dashboard|Serve Dashboard]]
