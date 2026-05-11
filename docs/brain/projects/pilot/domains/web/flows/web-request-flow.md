---
id: web-request-flow
name: Web Request Flow
type: flow
domain: web
status: active
confidence: source_supported
source_files:
  - lib/WebServer.js
  - lib/config.js
last_reviewed: 2026-05-11
tags:
  - type/flow
  - domain/web
  - status/active
---

# Web Request Flow

How an HTTP request to the dashboard is handled — from token check to response.

## Steps

1. Browser/client hits `http://host:port/?token=<secret>`
2. `WebServer` logs `[REQ] #N METHOD /path` to the debug log and starts a timer
3. `WebServer` checks token against config value — returns 401 if mismatch
4. For `GET /`: serves embedded HTML dashboard with injected session data and version
5. For `GET /events`: upgrades to SSE stream; logs connect/disconnect; skipped from per-request timing
6. For `GET /api/sessions`: reads config, maps sessions to JSON with live tmux status check
7. For `POST /api/sessions/:name/action`: validates action, calls tmux command or SessionManager
8. All other paths → 404
9. On `res.finish`, logs `[RES] #N METHOD /path STATUS Nms`; flags `*** SLOW ***` if >500 ms

## Broadcast stall risk

`_broadcast()` (every 3 s when SSE clients are connected) calls `_buildAllSessions()` → `_getSnippetAndMenu()` → `spawnSync('tmux', ...)` for every session. This is synchronous and blocks the event loop. All queued API requests wait until it completes. The debug log emits `[SLOW]` when a broadcast takes >200 ms.

## Related

- [[web|Web domain]]
- [[web-serve-dashboard|Serve Dashboard]]
- [[web-session-api|Session API]]
- [[web-token-auth|Token Auth]]
- [[core-load-config|Load Config]]
