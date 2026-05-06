# Tasks

## Completed (v0.3.0)
- [x] lib/config.js: addToHistory, removeFromHistory, getHistory
- [x] lib/SessionManager.js: call addToHistory in spawn() and adopt()
- [x] bin/claude-pilot.js: interactive watch with offline sessions, auto-enter on start
- [x] CHANGELOG.md created
- [x] README.md updated with new watch UI
- [x] version bumped to 0.3.0 and published to npm

## Completed (v0.3.1)
- [x] Watcher.js: reduce checkInterval from 30s → 5s
- [x] Watch screen refresh from 2s → 1s

## Completed (v0.4.0)
- [x] lib/WebServer.js: HTTP server with SSE, REST API, 127.0.0.1 binding, spawnSync array args
- [x] lib/ui.html: React SPA dashboard (SSE live data, terminal polling, send message, spawn, kill)
- [x] bin/claude-pilot.js: `web [port]` REPL command, auto-opens browser
- [x] Watcher.js: fix shell injection in tmux send-keys (spawnSync array args)
- [x] CHANGELOG.md, README.md updated, version bumped to 0.4.0

## Completed (v0.6.0)
- [x] config.js: store command in session history
- [x] SessionManager.js: command param in spawn(), respawn() method
- [x] WebServer.js: command in POST /api/sessions, POST /api/sessions/:name/respawn
- [x] ui.html: Respawn button for offline sessions, command dropdown in Create form, Agent field in session info
