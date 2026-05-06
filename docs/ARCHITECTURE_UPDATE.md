# Architecture Update — Claude Code Pilot

## Current Direction

Claude Code Pilot is evolving from a simple auto-resume wrapper into a lightweight local AI orchestration runtime focused on:

- persistent Claude Code sessions
- multi-session management
- interactive-first workflows
- remote-lite control
- resumable agent workflows
- externalized state
- human-supervised automation

The project intentionally avoids becoming a fully autonomous unsafe agent loop.

---

# Current Architecture

```text
Browser Dashboard
        ↓
WebSocket / REST API
        ↓
Node.js Supervisor
        ↓
Session Manager
        ↓
Session Adapter
        ↓
tmux session
        ↓
Claude Code
```

---

# Why tmux Still Exists

tmux remains important because it provides:

- persistent interactive terminal sessions
- attach/detach workflows
- survival after SSH disconnect
- process continuity
- direct human fallback access
- low operational complexity

Node.js acts as the orchestration layer, not the terminal replacement.

Future architecture may support:

```text
SessionAdapter
├── TmuxSessionAdapter
└── PtySessionAdapter
```

But tmux should remain the primary backend during MVP and early production phases.

---

# Core Concepts

## 1. Interactive First

The system is designed so humans can still interact directly with Claude sessions.

Example:

```bash
tmux attach -t claude-buildx-api
```

This is a major architectural decision.

The system is not intended to hide Claude behind a purely autonomous orchestration layer.

---

## 2. Remote Lite Control

Remote interactions are intentionally limited.

Supported ideas:

- view latest output
- send text input
- continue session
- pause/resume auto-resume
- session status monitoring

Not initially supported:

- automatic permission approvals
- arbitrary shell execution from dashboard
- autonomous unsafe workflows

---

## 3. Externalized State

Long-running LLM workflows become unstable without external state.

Recommended workflow:

```text
TASK_STATE.md
TODO.md
ARCHITECTURE.md
```

Claude should continuously update state files.

This project treats externalized workflow state as a first-class architectural primitive.

---

# Multi Session Design

The system must support many concurrent Claude sessions.

Example:

```text
claude-buildx-api
claude-pos-mobile
claude-auth-refactor
claude-research
```

Each session should have:

```ts
type ClaudeSession = {
  id: string
  name: string
  tmuxSession: string
  projectPath: string
  status: string
  autoResume: boolean
  lastOutput: string
  createdAt: Date
  updatedAt: Date
}
```

---

# Detection Engine

Current detection goals:

- usage limit reached
- reset time parsing
- permission request detection
- idle/stuck session detection
- build/test failure detection
- session termination detection

Detectors should become pluggable.

Example:

```ts
interface Detector {
  name: string
  detect(text: string): DetectionResult | null
}
```

---

# Notification System

Current target:

- Telegram

Future targets:

- LINE
- Discord
- Web dashboard notifications
- Desktop notifications

Notifications should use a provider abstraction.

---

# Dashboard Direction

Preferred stack:

```text
Node.js
Express
WebSocket
Vite frontend
```

Avoid heavy frameworks during MVP.

Dashboard goals:

- multi-session list
- live terminal output
- send input
- continue button
- session state badges
- auto-resume indicators

---

# Security Philosophy

The project intentionally avoids:

```text
fully autonomous unsafe execution
```

Warnings:

- `--dangerously-skip-permissions` is dangerous
- CLAUDE.md is NOT a security boundary
- permissions must eventually become enforceable policy

Future direction may include:

```text
Policy Engine
├── allow
├── deny
├── require human approval
└── sandbox profiles
```

---

# Suggested Future Repo Structure

```text
src/
├── server/
├── sessions/
│   ├── SessionManager.ts
│   ├── adapters/
│   │   ├── TmuxSessionAdapter.ts
│   │   └── PtySessionAdapter.ts
│   ├── detectors/
│   └── actions/
├── notifications/
├── dashboard/
├── state/
└── shared/
```

---

# Product Philosophy

Claude Code Pilot is moving toward:

```text
human-supervised local AI runtime
```

not:

```text
fully autonomous AI operator
```

The system prioritizes:

- recoverability
- persistence
- observability
- resumability
- human intervention
- practical workflows
- incremental complexity
