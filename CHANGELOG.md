# Changelog

## 0.4.6 — 2026-05-06

### Fixed
- False `limit` status when a session has recovered from a prior limit hit. Root cause: `LIMIT_RE` was tested against the full 500-line tmux scrollback, so old limit text in scroll history kept re-triggering limit detection even after the session resumed. Now `LIMIT_RE` is checked against only the last 15 non-empty lines (`limitWindow`), matching the same windowed approach used for `RESPONSE_RE` and `RUNNING_RE`.

---

## 0.4.5 — 2026-05-06

### Added
- **Terminal redesign**: input is now embedded inside the terminal box (dark background, monospace font, `❯` prompt) — feels like a real terminal. After sending, focus returns to the input automatically.
- **Full-height terminal**: terminal fills the viewport height (`calc(100vh - 210px)`) with the output scrolling above the pinned input row.
- **Password auth**: `web [port] [host] [password]` — if a password is given, the browser shows a login screen. Token is stored in localStorage and sent as `Authorization: Bearer` on all requests (query param for SSE). `POST /api/login` is the only unauthenticated endpoint.

---

## 0.4.4 — 2026-05-06

### Added
- Press `w` in watch mode to open (or reuse) the web dashboard in the browser. Starts the server on `127.0.0.1:3742` if not already running. Shown in the watch footer: `w: web ui`.

---

## 0.4.3 — 2026-05-06

### Added
- `web [port] [host]` — web dashboard now accepts an optional bind host.
  - `web` → `127.0.0.1:3742` (local only, default)
  - `web 3742 0.0.0.0` → bind to all interfaces (accessible from other devices on the network)
  - `web 8080 192.168.1.10` → bind to a specific interface

---

## 0.4.2 — 2026-05-06

### Fixed
- False limit detection when running `/usage` inside a Claude session. The `/usage` output contains "Resets 6:30pm" which was matching the `resets` keyword. Tightened `LIMIT_RE` to require more specific phrases (`hit your limit`, `usage limit`, `rate limit`, `limit reached`, `try again after`) that only appear in actual limit-hit messages.

---

## 0.4.1 — 2026-05-06

### Added
- Web dashboard: **Esc**, **Ctrl+C**, and **Ctrl+D** buttons in the terminal send area — sends the raw key to the tmux session without appending Enter.
- `POST /api/sessions/:name/send` now accepts `{ key: "Escape" }` (or any tmux key name) in addition to `{ message: "..." }`.

---

## 0.4.0 — 2026-05-06

### Added
- **Web dashboard**: `web [port]` REPL command starts a browser UI at `http://127.0.0.1:3742` (auto-opens in default browser).
  - Live session list via SSE (Server-Sent Events) — no polling, no WebSocket dependency
  - Terminal output viewer with 2-second auto-refresh
  - Send message to Claude from the browser
  - Create new sessions from the browser (name, path, optional initial prompt)
  - Kill sessions from the session detail view
  - Dark/light mode, responsive layout (mobile + desktop)
  - Status activity log: tracks transitions between running / idle / needs-response / limit / offline
  - All tmux calls use `spawnSync` array args — shell-injection safe; server binds to `127.0.0.1` only

### Fixed
- Shell injection vulnerability in `Watcher.js`: `tmux send-keys` on auto-resume now uses `spawnSync` with array args instead of shell interpolation.

---

## 0.3.1 — 2026-05-06

### Changed
- Status check interval reduced from 30s → 5s (faster running/idle/limit detection)
- Watch screen refresh rate reduced from 2s → 1s

---

## 0.3.0 — 2026-05-06

### Added
- **Session history**: every spawned or adopted session is persisted to `~/.claude-remote-pilot.json`. Sessions you've worked in before are remembered even after they end.
- **Offline sessions in watch**: the watch screen now shows offline sessions (from history but no longer running in tmux) alongside live sessions, in dim text.
- **Interactive watch**: press a number key (1–9) to select a session, then:
  - Active session: `[t]` open terminal (tmux attach), `[k]` kill, `Esc` deselect
  - Offline session: `[s]` re-spawn Claude at the saved path, `[r]` remove from history, `Esc` deselect
- **Auto-watch on start**: watch mode opens automatically after startup if there are any sessions (active or historical), so you land in the dashboard instead of a blank prompt.

### Changed
- Watch exits cleanly with `q` back to the command prompt (no session list required first).
- Watch command also triggers when there are only offline sessions in history.

---

## 0.2.13 — previous

- Usage limit detection with auto-resume
- Token usage display in watch (`↑sent ↓received`)
- Configurable resume message
- Telegram notification persistence
- Session recovery after pilot restart
- Status detection: running / idle / needs-response / limit
