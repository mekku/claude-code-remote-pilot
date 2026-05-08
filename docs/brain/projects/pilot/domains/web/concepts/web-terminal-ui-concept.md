---
id: web-terminal-ui-concept
name: Web Terminal UI Concept
type: concept
domain: web
status: active
confidence: source_supported
source_files:
  - lib/ui.html
last_reviewed: 2026-05-09
version: 0.8.4
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
- **Tab-switching layout** — `SessionDetailScreen` has an `activeTab` state (`'terminal'` | `'git'`) and a `.tab-bar` with two `.tab-btn` tabs. When `activeTab === 'terminal'` the standard `detail-grid` (terminal + sidebar with `QueuePanel`) is shown; when `activeTab === 'git'` the `GitPanel` is rendered full-width. `activeTab` resets to `'terminal'` whenever the selected session changes.
- **Queue sidebar** — `QueuePanel` is rendered inside `.detail-sidebar` (right column of the detail grid), beneath Session Info. The sidebar is `flex-direction:column; overflow-y:auto` so a long queue list scrolls without overflowing the layout.
- **Resize sync** — on mount and resize, the component measures the rendered terminal viewport (using a hidden probe character) and calls `POST /api/sessions/:name/resize` to match the tmux pane dimensions to the browser window.
- **Multi-line input** — the input element is a `<textarea>` (since v0.8.4), not an `<input>`. It auto-resizes via a `useEffect` that sets `el.style.height` to `Math.min(el.scrollHeight, 120)px` on every `msg` state change. Maximum visible height is 120 px (~5 lines); content beyond that scrolls inside the textarea.
- **Special keys** — Ctrl+C, Ctrl+D, Tab, Up/Down arrow, Ctrl+U, Ctrl+L are intercepted in `handleKeyDown` and forwarded as tmux key sequences.
- **Enter behaviour** — Ctrl+Enter / Cmd+Enter sends the message. Shift+Enter sends a bare Enter to tmux (quick confirm). Enter with empty input sends a bare Enter to tmux. Enter with text inserts a newline (natural textarea behaviour — not intercepted).
- **Send button** — a `.btn-key-send` button labelled "↵ Send" sits in `.terminal-input-row` next to the textarea. Disabled when `msg` is empty or `sending`. Primary send path for mobile users who have no Ctrl key.
- **Footer layout** — `.terminal-footer` contains two children: `.terminal-input-row` (prompt char + textarea + Send button) and `.terminal-keys` (key shortcut buttons). On desktop both sit side-by-side (`flex-direction: row`, `align-items: flex-end`). On mobile (`max-width: 767px`) the footer switches to `flex-direction: column` so the input row is always fully visible above the scrollable key strip.
- **Key button order** — `Esc` is at the far left of `.terminal-keys`, bare `↵` (send Enter to tmux) is at the far right. Navigation keys (↑ ↓ ⇥) and interrupt keys (^C ^D) sit between them, maximising tap-target separation between Esc and Enter.

## Non-obvious details

The click-to-focus guard (`window.getSelection()?.toString()`) is what makes copy-paste work. Without it every click clears the browser selection immediately after `mouseup`, making it impossible to copy terminal output.

The textarea auto-resize resets height to `'auto'` before measuring `scrollHeight`; omitting the reset causes the element to never shrink when lines are deleted.

## Related

- [[web|Web domain]]
- [[web-serve-dashboard|Serve Dashboard]]
- [[web-request-flow|Web Request Flow]]
