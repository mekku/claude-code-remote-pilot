# Claude Code Pilot — Tasks

## Phase 1 — Current MVP ✓

### Session Persistence

- [x] tmux-based session persistence
- [x] auto-create tmux session
- [x] session watcher loop
- [x] terminal output capture
- [x] limit detection
- [x] resume command sending
- [x] Telegram notification support
- [x] duplicate limit protection
- [x] resume cooldown logic
- [x] npm package wrapper

---

## Phase 2 — Node Refactor ✓

### Core Runtime

- [x] migrate bash watcher logic into Node.js
- [x] create SessionManager
- [x] session lifecycle handling (spawn, adopt, kill, respawn, killAll)
- [x] persistent config loading
- [x] create Session abstraction (class)
- [x] create SessionAdapter interface (EventEmitter base — v0.14.9)
- [x] implement TmuxSessionAdapter (v0.14.9)
- [ ] structured logging
- [ ] event emitter system

---

## Phase 3 — Multi Session Support ✓

### Session Management

- [x] support multiple concurrent Claude sessions
- [x] session registry (SessionManager.sessions Map)
- [x] session metadata persistence (emoji, color labels via config)
- [x] session status tracking
- [x] active/inactive state
- [x] limit/waiting/running/needs-response/idle states
- [x] restart session handling (respawn)
- [x] stale session cleanup (offline history)

---

## Phase 4 — Detection Engine (partial)

### Detectors

- [x] pluggable agent type detection (claude / opencode / codex / generic)
- [x] usage limit detector
- [x] reset time parser (IANA timezone-aware)
- [x] permission request detector (RESPONSE_RE)
- [x] stuck/no-output detector (hash-change idle detection for generic agents)
- [ ] build failure detector
- [ ] test failure detector
- [ ] Claude crash detector

---

## Phase 5 — Notification System (partial)

### Providers

- [x] Telegram provider (Node https, no SDK)
- [x] Telegram inline keyboard buttons for needs-response (v0.14.7)
- [x] Telegram callback polling loop with stale-offset skip and 409 back-off (v0.14.7)
- [ ] Discord provider
- [ ] LINE provider
- [ ] desktop notification provider
- [ ] browser push support

---

## Phase 6 — Dashboard MVP ✓

### Backend

- [x] HTTP server (Node built-in, no Express)
- [x] SSE live stream (`/events`)
- [x] REST API
- [x] session API (spawn, adopt, kill, respawn, list, output, agent-command update — v0.14.8)
- [x] send-input API (`/send`, `/queue`)
- [x] continue-session API (queue + autoFeed)
- [x] git panel API (status, diff, commit)
- [x] file browser API (list, read)
- [x] system info API (CPU, RAM, disk)
- [x] usage stats API (7-day token aggregation from JSONL)
- [x] cloudflared tunnel support
- [x] web password auth (token-based)
- [x] structured JSONL message parsing (ClaudeOutputParser — in progress)

### Frontend

- [x] React SPA embedded in ui.html (no build step)
- [x] session sidebar with live status list and quick-jump navigation (v0.14.7)
- [x] live terminal output panel (ANSI → HTML)
- [x] session status badges (running / idle / needs-response / limit / offline)
- [x] send-input box (multi-line textarea)
- [x] menu CTA strip (numbered choice buttons)
- [x] auto-scroll terminal output
- [x] reconnect / SSE fallback polling
- [x] git diff & commit panel
- [x] file browser panel (desktop) / embedded in mobile Info tab
- [x] queue panel with autoFeed
- [x] system info bar
- [x] dark/light theme toggle
- [x] mobile-optimised layout (fixed footer, full-screen terminal)
- [x] Shift+Tab (⇤) terminal key button (v0.14.8)
- [x] per-session agent switcher dropdown with pending-respawn notice (v0.14.8)

---

## Phase 7 — State & Persistence (partial)

### Persistent State

- [x] JSON config storage (`~/.claude-pilot/config.json`)
- [x] session history (last-seen, path, command)
- [ ] SQLite support
- [ ] event history
- [ ] notification history
- [ ] resume history
- [ ] output snapshotting

---

## Phase 8 — Safety & Policies

### Policy Engine

- [ ] policy abstraction
- [ ] allow/deny rules
- [ ] command filtering
- [ ] permission workflows
- [ ] require-human-approval actions
- [ ] dangerous command detection

---

## Phase 9 — Future Runtime

### Advanced Runtime

- [ ] node-pty backend
- [ ] non-tmux backend
- [ ] sandbox profiles
- [ ] docker isolation
- [ ] remote workers
- [ ] distributed sessions
- [ ] agent orchestration
- [ ] workflow engine

---

# Nice To Have

- [x] usage metrics (SysInfoBar — CPU, RAM, disk, 7d tokens)
- [x] token usage estimates (live from JSONL + footer parser)
- [x] mobile-friendly dashboard
- [x] git status integration
- [ ] structured message viewer (ClaudeOutputParser wired to UI — in progress)
- [ ] session tags
- [ ] project grouping
- [ ] cost tracking
- [ ] markdown artifact viewer
- [ ] task templates
- [ ] session snapshots
- [ ] session replay

---

# Important Constraints

- interactive-first workflow
- tmux remains first-class during MVP
- avoid overengineering early
- prioritize recoverability
- prioritize observability
- externalized state is mandatory
- avoid unsafe autonomous execution
