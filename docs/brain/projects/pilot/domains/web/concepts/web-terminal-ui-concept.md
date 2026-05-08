---
id: web-terminal-ui-concept
name: Web Terminal UI Concept
type: concept
domain: web
status: active
confidence: source_supported
source_files:
  - lib/ui.html
last_reviewed: 2026-05-08
tags:
  - type/concept
  - domain/web
  - status/active
---

# Web Terminal UI Concept

The dashboard terminal is a React SPA embedded in `lib/ui.html`. It polls session output every ~3 s via SSE, renders ANSI escape sequences to HTML, and provides a text input pinned to the bottom of the panel that sends keystrokes to the tmux pane.

## Key behaviours

- **ANSI rendering** — `ansiToHtml()` converts colour/formatting escapes to `<span>` elements with inline styles; falls back to stripped plain text on error.
- **Click-to-focus** — clicking anywhere on the terminal body focuses the hidden input so keystrokes are forwarded to tmux. Guard: only steals focus when `window.getSelection().toString()` is empty, so click-drag text selection is preserved.
- **Resize sync** — on mount and resize, the component measures the rendered terminal viewport (using a hidden probe character) and calls `POST /api/sessions/:name/resize` to match the tmux pane dimensions to the browser window.
- **Special keys** — Ctrl+C, Ctrl+D, Tab, Up/Down arrow, Ctrl+U, Ctrl+L are intercepted in the input `onKeyDown` handler and forwarded as tmux key sequences.
- **Enter behaviour** — Enter with text sends the message and clears input. Enter with empty input sends a bare Enter to tmux (confirms prompts). Shift+Enter always sends a bare Enter to tmux regardless of input content (quick confirm without clearing a draft).

## Non-obvious detail

The click-to-focus guard (`window.getSelection()?.toString()`) is what makes copy-paste work. Without it every click clears the browser selection immediately after `mouseup`, making it impossible to copy terminal output.

## Related

- [[web|Web domain]]
- [[web-serve-dashboard|Serve Dashboard]]
- [[web-request-flow|Web Request Flow]]
