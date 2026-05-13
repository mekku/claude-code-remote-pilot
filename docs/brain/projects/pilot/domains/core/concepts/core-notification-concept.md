---
id: core-notification-concept
name: Telegram Notification Concept
type: concept
domain: core
status: active
confidence: source_supported
source_files:
  - lib/notifier.js
last_reviewed: 2026-05-13
version: 0.14.7
tags:
  - type/concept
  - domain/core
  - status/active
---

# Telegram Notification Concept

Notifications are sent to a Telegram chat using Node's built-in `https` module (replaced curl/execSync in v0.14.7). Errors are always swallowed — notification failure never crashes the supervisor.

## Transport

- All API calls go through `_post(token, method, data, timeoutMs)` — a Promise-based `https.request` wrapper
- 8-second default timeout; poll requests use 35 s to accommodate Telegram's 25-second long-poll window
- No npm dependency: only `https` (Node built-in)

## Message types

| Function | Telegram method | Use case |
|---|---|---|
| `send()` | `sendMessage` | Plain text event notifications |
| `sendWithButtons()` | `sendMessage` + `reply_markup` | needs-response with detected menu options |
| `answerCallback()` | `answerCallbackQuery` | Dismiss loading spinner after button tap |

## Inline keyboard buttons (v0.14.7)

When the Watcher detects `needs-response` and `menuOptions.detect()` finds numbered options in the pane, `sendWithButtons` is called with one button per option (2 per row). `callback_data` is `menu:<sessionName>:<num>`. The polling loop receives the tap, `answerCallback` acknowledges it, and `SessionManager.handleTelegramCallback` sends the number to tmux.

## Long-poll loop

`startPolling(token, onCallback)` runs an async self-loop:
1. On startup, calls `getUpdates({offset: -1, limit: 1})` to learn the current `update_id` — skips any stale callbacks queued while the pilot was offline
2. Loops: `getUpdates({offset, timeout:25, allowed_updates:['callback_query']})` — Telegram blocks up to 25 s per call
3. On 409 Conflict: logs once, backs off exponentially (5 s, 10 s, … up to 5 min)
4. On other errors: waits 3 s and retries
5. `stopPolling()` sets `_active = false`; the loop exits after the current request completes

Only one poll loop per process — `startPolling` is a no-op if already active (`_active` guard).

## Opt-in behaviour

If `config.telegram.token` is falsy, `send` / `sendWithButtons` return immediately. `startPolling` skips if token is empty.

## Related

- [[core|Core domain]]
- [[core-send-notification|Send Notification]]
- [[core-menu-options|Menu Options Parser]]
- [[session-watch-process|Watch Process]]
- [[cli-launch-flow|Launch Flow]]
