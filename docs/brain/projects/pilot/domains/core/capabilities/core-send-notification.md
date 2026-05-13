---
id: core-send-notification
name: Send Notification
type: capability
domain: core
status: active
confidence: source_supported
source_files:
  - lib/notifier.js
last_reviewed: 2026-05-13
version: 0.14.7
tags:
  - type/capability
  - domain/core
  - status/active
---

# Send Notification

Sends Telegram messages and interactive inline keyboard buttons on session events. As of v0.14.7, rewritten from curl/execSync to Node's built-in `https` module — no external dependency.

## What it does

- `send(token, chatId, message)` — plain text message; swallows errors silently
- `sendWithButtons(token, chatId, message, buttons)` — sends with Telegram inline keyboard; `buttons` is `[{ text, data }]`; rows of 2 buttons each; falls back to plain `send()` if buttons is empty
- `answerCallback(token, queryId)` — acknowledges a `callback_query` so Telegram removes the loading spinner
- `startPolling(token, onCallback)` — long-polls `getUpdates` for `callback_query` updates; skips stale callbacks on startup by fetching the latest `update_id` first; handles 409 Conflict (another instance polling) with exponential back-off up to 5 min
- `stopPolling()` — signals the poll loop to exit cleanly

## Entry point

`lib/notifier.js` — exported as `{ send, sendWithButtons, answerCallback, startPolling, stopPolling }`

Called by:
- `lib/Watcher.js` — `send` / `sendWithButtons` on needs-response / limit / ended events
- `bin/claude-pilot.js` — `startPolling` / `stopPolling` / `answerCallback` / tunnel-ready notification

## Related

- [[core|Core domain]]
- [[core-notification-concept|Notification Concept]]
- [[core-menu-options|Menu Options Parser]]
- [[session-watch-process|Watch Process]]
- [[session-watch-flow|Watch and Resume Flow]]
- [[cli-launch-flow|Launch Flow]]
