---
id: core-menu-options
name: Menu Options Parser
type: capability
domain: core
status: active
confidence: source_supported
source_files:
  - lib/menuOptions.js
last_reviewed: 2026-05-13
version: 0.14.7
tags:
  - type/capability
  - domain/core
  - status/active
---

# Menu Options Parser

Shared utility that extracts numbered choice options from raw terminal output. Introduced in v0.14.7 to replace duplicated parsing logic that existed in both `WebServer.js` and `Watcher.js`.

## What it does

`detect(text)` — strips ANSI escapes, scans the last 50 lines for patterns like:
```
  ❯ 1. Yes
    2. No, stop here
```
Returns `[{ num: number, label: string }]` or `[]` if:
- Fewer than 2 options found
- Options don't start at 1
- Sequence is not contiguous (e.g. 1, 3 — skipping 2)

Also exports `stripAnsi(text)` for reuse.

## Callers

| Caller | How used |
|---|---|
| `lib/Watcher.js` | Detect menu options from pane capture before sending Telegram buttons |
| `lib/WebServer.js` | `_detectMenuOptionsFromText()` now delegates here; was previously duplicated |

## Entry point

`lib/menuOptions.js` — `module.exports = { detect, stripAnsi }`

## Related

- [[core|Core domain]]
- [[core-send-notification|Send Notification]]
- [[core-notification-concept|Notification Concept]]
- [[session-watch-process|Watch Process]]
- [[web-session-api|Session API]]
