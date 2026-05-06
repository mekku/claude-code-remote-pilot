#!/usr/bin/env bash
set -u

# Claude Code Pilot
# Interactive Claude Code supervisor using tmux + Telegram notifications.
#
# Required env:
#   TELEGRAM_BOT_TOKEN
#   TELEGRAM_CHAT_ID
#
# Optional env:
#   CLAUDE_SESSION=claude
#   CLAUDE_COMMAND=claude
#   CHECK_INTERVAL_SECONDS=30
#   LIMIT_FALLBACK_WAIT_SECONDS=300
#   POST_RESUME_COOLDOWN_SECONDS=180
#   CAPTURE_LINES=500
#   RESUME_COMMAND=continue
#   START_IF_MISSING=1
#
# Example:
#   TELEGRAM_BOT_TOKEN="123:abc" TELEGRAM_CHAT_ID="123456" ./claude-pilot.sh

CLAUDE_SESSION="${CLAUDE_SESSION:-claude}"
CLAUDE_COMMAND="${CLAUDE_COMMAND:-claude}"
CHECK_INTERVAL_SECONDS="${CHECK_INTERVAL_SECONDS:-30}"
LIMIT_FALLBACK_WAIT_SECONDS="${LIMIT_FALLBACK_WAIT_SECONDS:-300}"
POST_RESUME_COOLDOWN_SECONDS="${POST_RESUME_COOLDOWN_SECONDS:-180}"
CAPTURE_LINES="${CAPTURE_LINES:-500}"
RESUME_COMMAND="${RESUME_COMMAND:-continue}"
START_IF_MISSING="${START_IF_MISSING:-1}"

TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"

LIMIT_REGEX="${LIMIT_REGEX:-hit your limit|usage limit|rate limit|limit reached|try again|resets}"
PERMISSION_REGEX="${PERMISSION_REGEX:-permission|do you want to proceed|approve}"

last_limit_hash=""
last_resume_epoch=0

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

send_telegram() {
  local message="$1"

  if [ -z "$TELEGRAM_BOT_TOKEN" ] || [ -z "$TELEGRAM_CHAT_ID" ]; then
    log "Telegram not configured: $message"
    return 0
  fi

  curl -sS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
    --data-urlencode "text=${message}" >/dev/null || true
}

capture_pane() {
  tmux capture-pane -pt "$CLAUDE_SESSION" -S "-${CAPTURE_LINES}" 2>/dev/null || true
}

hash_text() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum | awk '{print $1}'
  else
    shasum -a 256 | awk '{print $1}'
  fi
}

parse_wait_seconds() {
  local text="$1"

  if command -v python3 >/dev/null 2>&1; then
    TEXT="$text" FALLBACK="$LIMIT_FALLBACK_WAIT_SECONDS" python3 - <<'PY'
import os
import re
from datetime import datetime, timedelta

text = os.environ.get("TEXT", "")
fallback = int(os.environ.get("FALLBACK", "300"))
now = datetime.now()
lower = text.lower()

# Examples:
#   try again in 12 minutes
#   retry after 1 hour
m = re.search(r"(?:try again|retry|wait).*?in\s+(\d+)\s*(second|seconds|minute|minutes|hour|hours)", lower, re.I | re.S)
if m:
    value = int(m.group(1))
    unit = m.group(2)
    if unit.startswith("second"):
        print(max(10, value))
    elif unit.startswith("minute"):
        print(max(10, value * 60))
    else:
        print(max(10, value * 3600))
    raise SystemExit

# Examples:
#   resets 2am
#   resets at 14:30
#   limit resets at 3:05 pm
m = re.search(r"resets?\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?", lower, re.I)
if m:
    hour = int(m.group(1))
    minute = int(m.group(2) or 0)
    ampm = m.group(3)

    if ampm:
        if ampm == "pm" and hour != 12:
            hour += 12
        if ampm == "am" and hour == 12:
            hour = 0

    if 0 <= hour <= 23 and 0 <= minute <= 59:
        reset = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
        if reset <= now:
            reset += timedelta(days=1)
        # Add small safety buffer so we do not resume one second too early.
        print(max(10, int((reset - now).total_seconds()) + 30))
        raise SystemExit

print(fallback)
PY
    return 0
  fi

  echo "$LIMIT_FALLBACK_WAIT_SECONDS"
}

ensure_tmux_session() {
  if tmux has-session -t "$CLAUDE_SESSION" 2>/dev/null; then
    return 0
  fi

  if [ "$START_IF_MISSING" != "1" ]; then
    echo "tmux session '$CLAUDE_SESSION' not found." >&2
    exit 1
  fi

  tmux new-session -d -s "$CLAUDE_SESSION" "$CLAUDE_COMMAND"
  log "Started tmux session '$CLAUDE_SESSION' with command: $CLAUDE_COMMAND"
  send_telegram "Claude Pilot: started tmux session '$CLAUDE_SESSION'."
}

within_resume_cooldown() {
  local now
  now=$(date +%s)
  [ $((now - last_resume_epoch)) -lt "$POST_RESUME_COOLDOWN_SECONDS" ]
}

handle_limit() {
  local text="$1"
  local fingerprint
  fingerprint=$(printf '%s' "$text" | tail -n 40 | hash_text)

  if [ "$fingerprint" = "$last_limit_hash" ]; then
    return 0
  fi

  if within_resume_cooldown; then
    return 0
  fi

  last_limit_hash="$fingerprint"

  local wait_seconds
  wait_seconds=$(parse_wait_seconds "$text")

  log "Limit detected. Waiting ${wait_seconds}s before resume."
  send_telegram "Claude Pilot: usage/rate limit detected. Waiting ${wait_seconds}s before sending '${RESUME_COMMAND}'."

  sleep "$wait_seconds"

  tmux send-keys -t "$CLAUDE_SESSION" "$RESUME_COMMAND" Enter
  last_resume_epoch=$(date +%s)

  log "Resume command sent."
  send_telegram "Claude Pilot: resume command sent to tmux session '$CLAUDE_SESSION'."
}

main() {
  require_command tmux
  require_command curl

  ensure_tmux_session

  log "Watching tmux session '$CLAUDE_SESSION'. Attach with: tmux attach -t $CLAUDE_SESSION"
  send_telegram "Claude Pilot: watching tmux session '$CLAUDE_SESSION'."

  while true; do
    if ! tmux has-session -t "$CLAUDE_SESSION" 2>/dev/null; then
      log "tmux session '$CLAUDE_SESSION' ended."
      send_telegram "Claude Pilot: tmux session '$CLAUDE_SESSION' ended."
      exit 0
    fi

    text=$(capture_pane)

    if printf '%s' "$text" | grep -Eiq "$LIMIT_REGEX"; then
      handle_limit "$text"
    fi

    if printf '%s' "$text" | grep -Eiq "$PERMISSION_REGEX"; then
      # Notification only. Do not auto-approve permissions.
      send_telegram "Claude Pilot: Claude may need permission/input in session '$CLAUDE_SESSION'."
      sleep 60
    fi

    sleep "$CHECK_INTERVAL_SECONDS"
  done
}

main "$@"
