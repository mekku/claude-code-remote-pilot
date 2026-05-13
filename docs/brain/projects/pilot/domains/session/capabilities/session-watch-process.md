---
id: session-watch-process
name: Watch Process
type: capability
domain: session
status: active
confidence: source_supported
source_files:
  - lib/Watcher.js
last_reviewed: 2026-05-13
version: 0.14.7
tags:
  - type/capability
  - domain/session
  - status/active
---

# Watch Process

Polls the tmux pane every 5 s, detects agent status transitions (running / needs-response / limit / idle / ended), and fires Telegram notifications with deliberate delays to avoid noise. Supports claude (full detection), opencode, codex, and any generic command (hash-change detection).

## Agent type detection

`detectAgentType(command)` strips the path prefix and `.exe` suffix from the session command, then returns one of: `'claude'`, `'opencode'`, `'codex'`, `'generic'`. The type is resolved once at construction and stored in `this._agentType`.

## What it does — Claude sessions

- Captures pane content via `tmux capture-pane -S -500` and hashes the last 2 000 chars to detect staleness.
- Matches ANSI-stripped output against four regexes: `RUNNING_RE` (`esc to interrupt`), `LIMIT_RE` (usage/rate limit phrases), `RESPONSE_RE` (confirmation prompts), and `TOKEN_RE` (footer token counts).
- Updates `session.status` to one of: `running`, `needs-response`, `limit`, `idle`.
- On transition to `idle`, stamps `session.lastActiveAt = Date.now()` so the dashboard can sort idle sessions by recency.
- Calls `onEnded(session)` and stops the interval when the tmux session disappears.
- Extracts token counts from the Claude Code footer whenever visible and stores them in `session.tokens`.

## What it does — non-Claude sessions (opencode / codex / generic)

Uses `_checkGeneric(text)` — hash-change detection against the last 2 000 chars of stripped pane output:
- Output changed since last poll → `running`; resets `this._lastOutputChangeAt`.
- Output unchanged for ≥ 4 s → `idle`.
- `onEnded` and Telegram end notifications still fire when the tmux session disappears.
- Limit auto-resume (`_handleLimit`) and token tracking (`session.tokens`) are **not** called for non-Claude agents.

## Telegram notification rules

| Transition | Delay | Condition |
|---|---|---|
| Session ended | immediate | always |
| `needs-response` | 30 s | suppressed if session leaves `needs-response` within the window; de-duped at 60 s minimum between sends |
| `limit` hit | immediate | sends reset-time; waits for limit to expire; then sends "resumed" |

The 30-second delay for `needs-response` uses `_needsResponseTimer` (a `setTimeout` handle stored on the Watcher instance). The timer is cleared on any transition away from `needs-response` — so if the user responds immediately, no notification is sent. `_lastNeedsResponseNotify` timestamp prevents repeated pings within a 60-second window when a prompt lingers.

### Inline keyboard buttons on needs-response (v0.14.7)

When the 30-second timer fires and the session is still `needs-response`, the Watcher calls `menuOptions.detect(this._capture())` on the current pane output. If numbered options are found (≥2 sequential options starting at 1), `notifier.sendWithButtons` is called instead of `notifier.send`. Each option becomes a Telegram inline button with `callback_data: "menu:<sessionName>:<num>"`. The polling loop in `notifier.js` receives button taps and routes them to `SessionManager.handleTelegramCallback`.

## Limit handling

`_handleLimit()` is called when `LIMIT_RE` matches the last 15 non-empty lines. It:
1. Hashes the text and skips if duplicate (same limit message seen already).
2. Respects a `cooldown` (default 180 s) between resume attempts.
3. Prevents retry spam with `_limitHandlingUntil` flag — blocks re-entry for 2 min when the recent visible pane still shows a limit after reset time.
4. Parses the reset time from "resets at HH:MM AM/PM", "resets 6am (Asia/Bangkok)", or "try again in N minutes"; explicit IANA timezones are honored for the `resumeAt` timestamp.
5. Waits until `resetAtMs` (or `Date.now() + fallbackWait * 1000`).
6. Re-checks the last 15 non-empty stripped lines only; old limit text deeper in tmux scrollback does not block resume.
7. Sends the `resumeCommand` string to the tmux pane via `spawnSync('tmux', ['send-keys', ...])`.
8. Notifies Telegram before waiting and after resuming.

## Entry point

`lib/Watcher.js` — instantiated by `lib/SessionManager.js` per session

## Related

- [[session|Session domain]]
- [[session-resume|Auto-Resume]]
- [[core-send-notification|Send Notification]]
- [[core-menu-options|Menu Options Parser]]
- [[session-tmux-concept|Tmux Session Concept]]
- [[session-auto-resume-concept|Auto-Resume Concept]]
