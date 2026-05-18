---
id: session-adapter-concept
name: Session Adapter Pattern
type: concept
domain: session
status: active
confidence: source_supported
source_files:
  - lib/adapters/SessionAdapter.js
  - lib/adapters/TmuxSessionAdapter.js
last_reviewed: 2026-05-18
tags:
  - type/concept
  - domain/session
  - status/active
---

# Session Adapter Pattern

`SessionAdapter` is an EventEmitter base class that abstracts the lifecycle, I/O, and status-detection of an agent process. Concrete subclasses implement the backend-specific details (tmux, SDK, etc.) while `SessionManager` wires up cross-cutting concerns (limit auto-resume, Telegram notifications) via events.

## Design rationale

The original `Watcher.js` conflated three responsibilities:
1. **Status detection** — tmux-specific polling and regex matching
2. **Limit auto-resume** — waiting and re-sending the resume command
3. **Telegram notifications** — cross-cutting concern

The adapter pattern separates these: the adapter owns (1) and emits events; `SessionManager` owns (2) and (3) by subscribing to those events. This makes it possible to add non-tmux backends (e.g. `ClaudeSDKAdapter`) without re-implementing orchestration logic.

## Interface

```
SessionAdapter (EventEmitter)
  ├── start()            → spawn the agent process
  ├── stop()             → kill the agent process
  ├── restart()          → stop() + start()
  ├── sendInput(text)    → send text as user input + Enter
  ├── sendKeys(keys)     → send raw key sequence (C-c, Tab, Up, ...)
  └── getOutput(lines)   → return buffered display text (last N lines)

Properties: name, cwd, command, status

Events:
  'status'  (newStatus, data)   — status changed
      newStatus: 'running' | 'idle' | 'limit' | 'needs-response' | 'offline'
      data.waitMs / resetAtMs / resetTime  (for 'limit')
      data.menuOptions: [{num, label}]     (for 'needs-response')
  'tokens'  ({sent, received})  — token counts updated
  'stopped' ()                  — process terminated on its own
```

## Output buffer contract

`getOutput(lines)` returns the last N lines of display text. For `TmuxSessionAdapter` this is a live `tmux capture-pane` call (no internal buffer — the terminal is the buffer). Future adapters that lack a terminal (e.g. `ClaudeSDKAdapter`) must maintain their own ring buffer filled from structured output messages.

## Current implementations

| Adapter | Source | Backend |
|---|---|---|
| `TmuxSessionAdapter` | `lib/adapters/TmuxSessionAdapter.js` | tmux pane capture + regex polling |
| _(planned)_ `ClaudeSDKAdapter` | — | `@anthropic-ai/claude-agent-sdk` `query()` |

`TmuxSessionAdapter` additionally exposes `adopt()` (attach to an already-running tmux session) and `resetLimitState()` (re-arm limit detection after a resume cycle).

## Related

- [[session|Session domain]]
- [[session-create|Create Session]]
- [[session-watch-process|Watch Process]]
- [[session-tmux-concept|Tmux Session Concept]]
