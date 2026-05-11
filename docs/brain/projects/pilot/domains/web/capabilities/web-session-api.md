---
id: web-session-api
name: Session API
type: capability
domain: web
status: active
confidence: source_supported
source_files:
  - lib/WebServer.js
last_reviewed: 2026-05-11
version: 0.14.0
tags:
  - type/capability
  - domain/web
  - status/active
---

# Session API

Exposes HTTP endpoints for querying and acting on sessions from the web dashboard or external clients.

## What it does

- Handles `GET /api/sessions` — returns JSON list of all sessions with status; active sessions include all fields spread from the session object (including `command`); offline sessions explicitly include `command: h.command || 'claude'` so agent type is available in the UI even for sessions that are no longer running
- Handles `POST /api/sessions/:name/action` — triggers actions (attach, remove) on a session
- Handles `GET /api/sessions/:name/files?path=<rel>` — returns `{ entries: [{name, type, size, mtime}], path }` for a directory listing inside the session's cwd; used by `FileBrowserPanel`
- Handles `GET /api/sessions/:name/files/content?path=<rel>` — returns `{ content }` for text files ≤500KB, `{ binary, size }` for binary files, or `{ tooBig, size }` when over the limit; binary detection scans first 8KB for null bytes
- Both file endpoints use `_safePath(cwd, rel)` to prevent path traversal: resolves the path and rejects any result that escapes the session's working directory
- Reads live session state from [[core-load-config|config]]
- All endpoints protected by [[web-token-auth|token authentication]]

## Entry point

`lib/WebServer.js` — request router inside the HTTP server

## Related

- [[web|Web domain]]
- [[web-serve-dashboard|Serve Dashboard]]
- [[web-token-auth|Token Auth]]
- [[core-load-config|Load Config]]
