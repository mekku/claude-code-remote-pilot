---
id: session-create
name: Create Session
type: capability
domain: session
status: active
confidence: source_supported
source_files:
  - lib/SessionManager.js
last_reviewed: 2026-05-18
tags:
  - type/capability
  - domain/session
  - status/active
---

# Create Session

Creates a new tmux session for a Claude Code agent, records it in config, and starts the adapter-based process watcher.

## What it does

- `spawn(dirPath, name, command = 'claude')` — creates a new tmux session running the given command, stores `{ name, path, command, status, startedAt, resumeAt }`, adds to history, starts `TmuxSessionAdapter`
- `adopt(name, dirPath, command = 'claude')` — registers an already-running tmux session for watching; calls `addToHistory()` so agent type survives future restarts
- `_attach(name, adapter)` — subscribes to the adapter's `'status'`, `'tokens'`, and `'stopped'` events; wires in limit handling and Telegram notifications
- `_handleLimit(name, session, data)` — called by `'status'('limit')` event; waits until `resetAtMs`, verifies limit cleared, calls `adapter.sendInput(resumeCommand)`, notifies Telegram
- `_scheduleNeedsResponseNotify(name, session, data)` — called by `'status'('needs-response')`; fires Telegram after 30 s with inline keyboard if numbered menu options are present
- Limit/telegram logic was previously inline in `Watcher.js`; moved here in the SessionAdapter refactor so adapters are pure I/O and status-detection components

## Entry point

`lib/SessionManager.js` — called by `bin/claude-pilot.js` after user input

## Related

- [[session|Session domain]]
- [[session-watch-process|Watch Process]]
- [[session-adapter-concept|Session Adapter Pattern]]
- [[core-save-config|Save Config]]
- [[cli-launch-session|Launch Session]]
