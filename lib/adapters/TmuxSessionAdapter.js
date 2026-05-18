'use strict';
const { execSync, spawnSync } = require('child_process');
const crypto = require('crypto');
const SessionAdapter = require('./SessionAdapter');
const menuOptions = require('../menuOptions');

const LIMIT_RE = /hit your limit|usage limit|rate limit|limit reached|try again after/i;
const RESPONSE_RE = /do you want to proceed|esc to cancel|ctrl\+e to explain|❯\s*\d+\.\s*yes/i;
const RUNNING_RE = /esc to interrupt/i;
const TOKEN_RE = /↑\s*([\d.,]+[km]?)\s*↓\s*([\d.,]+[km]?)/i;
const RESET_AT_RE = /resets?\s+(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)(?:\s*\(([^)]+)\))?/i;

class TmuxSessionAdapter extends SessionAdapter {
  constructor(name, cwd, command, opts = {}) {
    super(name, cwd, command);
    this._checkInterval = opts.checkInterval || 5000;
    this._fallbackWait = opts.fallbackWait || 300;
    this._captureLines = opts.captureLines || 500;
    this._timer = null;
    this._busy = false;
    this._lastLimitHash = '';
    this._limitBlockedUntil = 0;
    this._lastOutputHash = '';
    this._lastOutputChangeAt = null;
    this._agentType = _detectAgentType(command);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  async start() {
    execSync(`tmux new-session -d -s "${this._name}" -c "${this._cwd}" "${this._command}"`, { stdio: 'ignore' });
    this._setStatus('running');
    this._startPoll();
  }

  async stop() {
    this._stopPoll();
    try { execSync(`tmux kill-session -t "${this._name}"`, { stdio: 'ignore' }); } catch { }
    this._setStatus('offline');
  }

  /** Attach to an already-running tmux session (no spawn). */
  async adopt() {
    execSync(`tmux has-session -t "${this._name}"`, { stdio: 'ignore' }); // throws if missing
    this._setStatus('running');
    this._startPoll();
  }

  // ── I/O ────────────────────────────────────────────────────────────────────

  async sendInput(text) {
    spawnSync('tmux', ['send-keys', '-t', this._name, '-l', text], { stdio: 'ignore' });
    spawnSync('tmux', ['send-keys', '-t', this._name, 'Enter'], { stdio: 'ignore' });
  }

  async sendKeys(keys) {
    spawnSync('tmux', ['send-keys', '-t', this._name, keys], { stdio: 'ignore' });
  }

  getOutput(lines = 500) {
    try {
      return execSync(
        `tmux capture-pane -pt "${this._name}" -S "-${lines}"`,
        { encoding: 'utf8' }
      );
    } catch { return ''; }
  }

  // ── Poll loop ──────────────────────────────────────────────────────────────

  _startPoll() {
    this._check();
    this._timer = setInterval(() => this._check(), this._checkInterval);
  }

  _stopPoll() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

  async _check() {
    if (this._busy) return;
    this._busy = true;
    try {
      try { execSync(`tmux has-session -t "${this._name}"`, { stdio: 'ignore' }); }
      catch {
        this._stopPoll();
        this._setStatus('offline');
        this.emit('stopped');
        return;
      }

      const raw = this.getOutput(this._captureLines);
      const text = _stripAnsi(raw);

      if (this._agentType !== 'claude') {
        this._checkGeneric(text);
        return;
      }

      const nonEmptyLines = text.split('\n').filter(l => l.trim());
      const recentLines = nonEmptyLines.slice(-5).join('\n');

      const tokenMatch = recentLines.match(TOKEN_RE);
      if (tokenMatch) this.emit('tokens', { sent: tokenMatch[1], received: tokenMatch[2] });

      const limitWindow = _activeLimitWindow(text);

      if (RUNNING_RE.test(recentLines)) {
        this._limitBlockedUntil = 0;
        this._setStatus('running');
      } else if (LIMIT_RE.test(limitWindow) && Date.now() >= this._limitBlockedUntil) {
        this._emitLimit(limitWindow);
      } else if (RESPONSE_RE.test(recentLines)) {
        if (this._status !== 'needs-response') {
          const opts = menuOptions.detect(raw);
          this._setStatus('needs-response', { menuOptions: opts });
        }
      } else {
        if (this._status !== 'idle') this._setStatus('idle');
      }
    } finally {
      this._busy = false;
    }
  }

  _checkGeneric(text) {
    const hash = _hash(text);
    const now = Date.now();
    if (hash !== this._lastOutputHash) {
      this._lastOutputHash = hash;
      this._lastOutputChangeAt = now;
      this._limitBlockedUntil = 0;
      if (this._status !== 'running') this._setStatus('running');
      return;
    }
    if (this._lastOutputChangeAt === null) { this._lastOutputChangeAt = now; return; }
    if (now - this._lastOutputChangeAt < 4000) return;
    if (this._status !== 'idle') this._setStatus('idle');
  }

  _emitLimit(limitWindow) {
    const hash = _hash(limitWindow);
    if (hash === this._lastLimitHash) return; // same limit text — already emitted
    this._lastLimitHash = hash;

    const waitMs = _parseWait(limitWindow, this._fallbackWait) * 1000;
    const resetAtMs = _parseResetAtMs(limitWindow) || (Date.now() + waitMs);
    const resetTime = _parseResetTime(limitWindow);

    // Block re-detection for the effective wait period + 5 min buffer
    this._limitBlockedUntil = resetAtMs + 300_000;

    this._setStatus('limit', { waitMs: resetAtMs - Date.now(), resetAtMs, resetTime });
  }

  // Called by SessionManager after it has sent the resume command, so the
  // adapter can re-arm limit detection for the next potential limit cycle.
  resetLimitState() {
    this._lastLimitHash = '';
    this._limitBlockedUntil = 0;
  }
}

// ── Helpers (module-private) ─────────────────────────────────────────────────

function _detectAgentType(command) {
  const exe = ((command || 'claude').trim().split(/\s+/)[0])
    .split(/[/\\]/).pop().toLowerCase().replace(/\.exe$/, '');
  if (exe === 'opencode') return 'opencode';
  if (exe === 'codex') return 'codex';
  if (exe === 'claude') return 'claude';
  return 'generic';
}

function _stripAnsi(text) {
  return text.replace(/\x1b\[[0-9;]*[mGKHFABCDJsuhl]/g, '').replace(/\x1b[()][AB012]/g, '');
}

function _hash(text) {
  return crypto.createHash('sha256').update(text.slice(-2000)).digest('hex');
}

function _activeLimitWindow(text) {
  return text.split('\n').filter(l => l.trim()).slice(-15).join('\n');
}

function _parseWait(text, fallback) {
  const m = text.match(/(?:try again|retry|wait).*?in\s+(\d+)\s*(second|minute|hour)/i);
  if (m) {
    const v = parseInt(m[1]);
    if (m[2].startsWith('second')) return Math.max(10, v);
    if (m[2].startsWith('minute')) return Math.max(10, v * 60);
    return Math.max(10, v * 3600);
  }
  return fallback;
}

function _parseResetTime(text) {
  const atMatch = text.match(RESET_AT_RE);
  if (atMatch) {
    const time = atMatch[1].trim().toUpperCase();
    const tz = atMatch[2];
    return tz ? `${time} ${tz}` : time;
  }
  const inMatch = text.match(/(?:try again|retry|wait).*?in\s+(\d+)\s*(second|minute|hour)/i);
  if (inMatch) {
    const v = parseInt(inMatch[1]);
    const mult = inMatch[2].startsWith('second') ? 1 : inMatch[2].startsWith('minute') ? 60 : 3600;
    return new Date(Date.now() + v * mult * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return null;
}

function _parseResetAtMs(text) {
  const atMatch = text.match(RESET_AT_RE);
  if (atMatch) {
    const raw = atMatch[1].trim().toLowerCase();
    const timeZone = atMatch[2] ? atMatch[2].trim() : null;
    const m = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
    if (m) {
      let hour = parseInt(m[1], 10);
      const minute = parseInt(m[2] || '0', 10);
      const suffix = m[3];
      if (suffix === 'pm' && hour !== 12) hour += 12;
      if (suffix === 'am' && hour === 12) hour = 0;
      return _nextResetAtMs(hour, minute, timeZone);
    }
  }
  const inMatch = text.match(/(?:try again|retry|wait).*?in\s+(\d+)\s*(second|minute|hour)/i);
  if (!inMatch) return null;
  const v = parseInt(inMatch[1], 10);
  const mult = inMatch[2].startsWith('second') ? 1 : inMatch[2].startsWith('minute') ? 60 : 3600;
  return Date.now() + v * mult * 1000;
}

function _nextResetAtMs(hour, minute, timeZone) {
  const now = new Date();
  if (!timeZone) {
    const d = new Date(now);
    d.setHours(hour, minute, 0, 0);
    if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
    return d.getTime();
  }
  try {
    const today = _tzParts(now, timeZone);
    let candidate = _zonedToMs({ ...today, hour, minute }, timeZone);
    if (candidate <= now.getTime()) {
      const nextDayUtc = Date.UTC(today.year, today.month - 1, today.day + 1, 12, 0, 0);
      const tomorrow = _tzParts(new Date(nextDayUtc), timeZone);
      candidate = _zonedToMs({ ...tomorrow, hour, minute }, timeZone);
    }
    return candidate;
  } catch {
    const d = new Date(now);
    d.setHours(hour, minute, 0, 0);
    if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
    return d.getTime();
  }
}

function _tzParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const out = {};
  for (const p of parts) if (p.type !== 'literal') out[p.type] = Number(p.value);
  return out;
}

function _tzOffsetMs(timeZone, date) {
  const p = _tzParts(date, timeZone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - date.getTime();
}

function _zonedToMs(parts, timeZone) {
  const wallAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0, 0);
  let utcMs = wallAsUtc - _tzOffsetMs(timeZone, new Date(wallAsUtc));
  utcMs = wallAsUtc - _tzOffsetMs(timeZone, new Date(utcMs));
  return utcMs;
}

module.exports = TmuxSessionAdapter;
