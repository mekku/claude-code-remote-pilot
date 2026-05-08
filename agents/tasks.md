# Tasks

## Current version: 0.6.6 (published)

---

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

## Completed (v0.5.14)
- [x] config.js: CCP_CONFIG_PATH env override for test isolation
- [x] test/config.test.js: 14 unit tests for all config functions
- [x] test/webserver.test.js: 20 HTTP integration tests (auth, queue CRUD, auto-feed, meta)
- [x] package.json: added "test" script (node --test)

## Completed (v0.6.0 — terminal UX + menu detection)
- [x] ui.html: command history — ↑/↓ recalls sent messages when input has text
- [x] ui.html: ↑/↓ forward to tmux when input is empty (navigate Claude menus)
- [x] ui.html: Tab key forwarded to tmux; Ctrl+C/D/U/L
- [x] ui.html: Auto-yes toggle — presses Enter automatically when needs-response
- [x] ui.html: ↑ ↓ ⇥ buttons in terminal footer
- [x] ui.html: detectMenuOptions() — numbered menus become CTA buttons
- [x] ui.html: ollama fallback via GET /api/sessions/:name/menu
- [x] ui.html: SessionCard — snippet, CTA buttons, quick-reply input
- [x] WebServer.js: _getSnippetAndMenu(), _detectMenuOptionsFromText(), _detectMenuWithOllama()
- [x] WebServer.js: GET /api/sessions/:name/menu endpoint
- [x] bin/claude-pilot.js: watch sorted alphabetically by name

## Completed (v0.6.1)
- [x] ui.html: snippet shows up to 4 lines, strip separator/blank lines
- [x] ui.html: menu CTA — one option per full-width row, truncated with hover tooltip

## Completed (v0.6.2)
- [x] bin/claude-pilot.js: LAN binding question on startup; shows LAN IP in output
- [x] WebServer.js: localhost auth bypass (skipped when no X-Forwarded-For / CF-Connecting-IP)

## Completed (v0.6.3)
- [x] WebServer.js: strip trailing blank lines from capture-pane output (fixes large terminals pushing content off screen)

## Completed (v0.6.4)
- [x] ui.html: SnippetControl — Off/1/2/3/4 toggle in dashboard header, saved to localStorage

## Completed (v0.6.5)
- [x] ui.html: SnippetControl changed to Off/2/4/6/8; invalid stored values fall back to 4
- [x] WebServer.js: snippet capture window increased to 8 lines max
- [x] ui.html: TelegramControl — On/Off toggle in dashboard header (hidden when unconfigured)
- [x] WebServer.js: GET/POST /api/settings for telegramEnabled state
- [x] bin/claude-pilot.js: `telegram on|off` REPL command
- [x] Watcher.js: check telegram.enabled before every notifier.send
- [x] Watcher.js: needs-response notifications debounced to once/min per session

## Completed (v0.6.6)
- [x] WebServer.js: POST /api/sessions/:name/resize → tmux resize-pane
- [x] ui.html: ResizeObserver on terminal-body; measures char cell size, sends cols/rows on mount and window resize (80ms debounce)

---

## Backlog
- [ ] smarter retry logic
- [ ] usage statistics and session timeline
- [ ] pluggable notification providers
