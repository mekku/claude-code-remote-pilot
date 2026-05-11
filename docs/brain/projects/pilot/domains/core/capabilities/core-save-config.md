---
id: core-save-config
name: Save Config
type: capability
domain: core
status: active
confidence: source_supported
source_files:
  - lib/config.js
last_reviewed: 2026-05-08
tags:
  - type/capability
  - domain/core
  - status/active
---

# Save Config

Persists the in-memory config object to disk as JSON. Called after any mutation to session list, settings, or web token.

## What it does

- Ensures `~/.claude-pilot/` directory exists (`fs.mkdirSync` with `recursive: true`)
- Writes the config object as `JSON.stringify(config, null, 2)` to `config.json`
- `saveSessions(sessions)` persists `{ name, path, command }` for each active session — the `command` field is required so that sessions re-adopted at the next startup (via the "Re-adopt" prompt) carry their agent type and the agent badge renders correctly
- `saveWebPassword(password)` / `getWebPassword()` — persist and retrieve the plaintext web dashboard password; used by the `password` REPL command and the WebServer startup path
- Used by SessionManager on session create/remove and by WebServer on token generation

## Entry point

`lib/config.js` — exported function used by `lib/SessionManager.js`, `lib/WebServer.js`

## Related

- [[core|Core domain]]
- [[core-load-config|Load Config]]
- [[core-config-persistence-concept|Config Persistence]]
