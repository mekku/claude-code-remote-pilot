---
id: web-serve-dashboard
name: Serve Dashboard
type: capability
domain: web
status: active
confidence: source_supported
source_files:
  - lib/WebServer.js
last_reviewed: 2026-05-09
tags:
  - type/capability
  - domain/web
  - status/active
---

# Serve Dashboard

Serves the HTML web dashboard for monitoring Claude sessions remotely. The dashboard shows session status, allows basic actions, and displays version info.

## What it does

- Creates a Node.js `http.createServer` on a configurable port (default 3000)
- Serves an embedded HTML page (inline in WebServer.js) with session status
- Reads session data from [[core-load-config|config]] to populate the dashboard
- Injects the current version from `package.json` into the HTML
- Restricts access via [[web-token-auth|token authentication]]

## Dashboard layout (DashboardScreen)

Top of the page:
1. **Stat row** — 4 cards in a grid: Running (count / of total), Active (tmux sessions), Supervisor (online + port), **Broadcast** (inline input + Send button; disabled with placeholder when no active sessions).
3. **Sessions header** — controls for sound, Telegram toggle, snippet lines, sort order, and New session button.
4. **Session cards** — one card per session with status pill, snippet preview, quick-reply, and CTA buttons.
5. **Recent Activity** — timestamped log of status transitions (shown only when non-empty).

## Entry point

`lib/WebServer.js` — started by `bin/claude-pilot.js` when `--web` flag is set or user picks the option

## Related

- [[web|Web domain]]
- [[web-token-auth|Token Auth]]
- [[web-session-api|Session API]]
- [[core-load-config|Load Config]]
