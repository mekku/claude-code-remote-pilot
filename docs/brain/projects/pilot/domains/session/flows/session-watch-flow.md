---
id: session-watch-flow
name: Watch and Resume Flow
type: flow
domain: session
status: active
confidence: source_supported
source_files:
  - lib/Watcher.js
  - lib/SessionManager.js
  - lib/notifier.js
last_reviewed: 2026-05-13
version: 0.14.7
tags:
  - type/flow
  - domain/session
  - status/active
---

# Watch and Resume Flow

How the system detects agent status, sends Telegram notifications (with interactive buttons), and routes button tap callbacks back to the tmux session.

## Steps — needs-response path (v0.14.7)

1. `Watcher._check()` polls pane every 5 s; `RESPONSE_RE` matches (`do you want to proceed`, `esc to cancel`, `❯ 1. yes`, …)
2. `session.status` set to `needs-response`; `_needsResponseTimer` starts (30 s delay)
3. After 30 s (if still `needs-response`): `menuOptions.detect(pane)` scans last 50 lines for numbered options
4a. Options found → `notifier.sendWithButtons(token, chatId, msg, buttons)` — Telegram message with inline keyboard (`callback_data: "menu:<name>:<num>"`)
4b. No options → `notifier.send(token, chatId, msg)` — plain text notification
5. User taps a button in Telegram → `notifier` polling loop receives `callback_query`
6. `notifier.answerCallback(token, queryId)` — dismisses Telegram's loading spinner
7. `SessionManager.handleTelegramCallback("menu:<name>:<num>")` → `spawnSync('tmux', ['send-keys', '-t', name, '-l', num])` + `Enter`
8. Claude receives the keystroke; session transitions back to `running`

## Steps — limit auto-resume path

1. `Watcher._check()` — `LIMIT_RE` matches last 15 non-empty lines
2. `_handleLimit()` parses reset time; sets `session.status = 'limit'`; sends Telegram "limit hit" notification
3. Waits until `resetAtMs`; re-checks pane — if limit still visible, defers 2 min (`_limitHandlingUntil`)
4. Sends `resumeCommand` via `tmux send-keys`; sends Telegram "resumed" notification

## Steps — session ended path

1. `tmux has-session` check fails → `onEnded(session)` callback fires
2. `sessions.delete(name)` in SessionManager
3. `notifier.send(...)` — "session ended" message

## Related

- [[session|Session domain]]
- [[session-watch-process|Watch Process]]
- [[session-resume|Auto-Resume]]
- [[core-send-notification|Send Notification]]
- [[core-menu-options|Menu Options Parser]]
- [[core-notification-concept|Notification Concept]]
- [[session-auto-resume-concept|Auto-Resume Concept]]
