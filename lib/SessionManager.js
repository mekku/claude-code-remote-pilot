'use strict';
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const TmuxSessionAdapter = require('./adapters/TmuxSessionAdapter');
const config = require('./config');
const notifier = require('./notifier');
const menuOptions = require('./menuOptions');

const RESERVED = new Set(['spawn', 'list', 'watch', 'attach', 'kill', 'help', 'exit', 'quit', 'resume']);

function sanitizeName(name) {
  return name.replace(/[.:\s]/g, '-');
}

class SessionManager {
  constructor({ telegram = {}, resumeCommand } = {}) {
    this.sessions = new Map();
    this.telegram = telegram;
    this.resumeCommand = resumeCommand || 'The usage limit has reset. Please continue where you left off.';
    this._cooldown = 180;  // seconds between resume attempts per session
    this._lastResumeAt = new Map();  // name → unix seconds
    this._needsResponseTimers = new Map();  // name → timer handle
    this._lastNeedsResponseNotify = new Map();  // name → ms timestamp
  }

  _makeAdapter(name, dirPath, command) {
    return new TmuxSessionAdapter(name, dirPath, command);
  }

  _attach(name, adapter) {
    adapter.on('status', (status, data) => this._onStatus(name, status, data));
    adapter.on('tokens', (t) => {
      const entry = this.sessions.get(name);
      if (entry) entry.session.tokens = t;
    });
    adapter.on('stopped', () => this._onStopped(name));
  }

  _onStopped(name) {
    const entry = this.sessions.get(name);
    this.sessions.delete(name);
    this._clearNeedsResponseTimer(name);
    if (this.telegram.enabled !== false)
      notifier.send(this.telegram.token, this.telegram.chatId,
        `Pilot: session "${name}" ended.`);
  }

  _onStatus(name, status, data) {
    const entry = this.sessions.get(name);
    if (!entry) return;
    const session = entry.session;
    session.status = status;

    if (status === 'limit') {
      this._clearNeedsResponseTimer(name);
      this._handleLimit(name, session, data);
    } else if (status === 'needs-response') {
      this._scheduleNeedsResponseNotify(name, session, data);
    } else if (status === 'running' || status === 'idle') {
      this._clearNeedsResponseTimer(name);
      if (status === 'idle') session.lastActiveAt = Date.now();
      if (status === 'running') {
        session.resumeAt = null;
        session.resetTime = null;
      }
    }
  }

  async _handleLimit(name, session, { waitMs, resetAtMs, resetTime }) {
    const nowSec = Date.now() / 1000;
    const lastResume = this._lastResumeAt.get(name) || 0;
    if (nowSec - lastResume < this._cooldown) return;

    session.resumeAt = resetAtMs;
    session.resetTime = resetTime;

    const effectiveWaitMs = Math.max(1000, resetAtMs - Date.now());

    if (this.telegram.enabled !== false) {
      const url = this.telegram.dashboardUrl ? `\n${this.telegram.dashboardUrl}` : '';
      notifier.send(this.telegram.token, this.telegram.chatId,
        `Pilot: limit in "${name}". Resets ${resetTime || `in ${Math.ceil(effectiveWaitMs / 60000)}m`}.${url}`);
    }

    await new Promise(r => setTimeout(r, effectiveWaitMs));

    const entry = this.sessions.get(name);
    if (!entry) return;

    // Verify limit cleared before sending resume
    const adapter = entry.adapter;
    const pane = adapter.getOutput(500);
    const stripped = pane.replace(/\x1b\[[0-9;]*[mGKHFABCDJsuhl]/g, '');
    const window = stripped.split('\n').filter(l => l.trim()).slice(-15).join('\n');
    const stillLimited = /hit your limit|usage limit|rate limit|limit reached|try again after/i.test(window);
    if (stillLimited) {
      session.resumeAt = Date.now() + 60000;
      adapter.resetLimitState();  // re-arm so the next poll cycle can re-emit
      return;
    }

    await adapter.sendInput(this.resumeCommand);
    this._lastResumeAt.set(name, Date.now() / 1000);
    adapter.resetLimitState();
    session.resumeAt = null;
    session.resetTime = null;

    if (this.telegram.enabled !== false)
      notifier.send(this.telegram.token, this.telegram.chatId,
        `Pilot: resumed "${name}".`);
  }

  _scheduleNeedsResponseNotify(name, session, { menuOptions: opts = [] } = {}) {
    if (this._needsResponseTimers.has(name)) return;
    const timer = setTimeout(() => {
      this._needsResponseTimers.delete(name);
      const entry = this.sessions.get(name);
      if (!entry || entry.session.status !== 'needs-response') return;
      if (this.telegram.enabled === false) return;
      const now = Date.now();
      const last = this._lastNeedsResponseNotify.get(name) || 0;
      if (now - last < 60000) return;
      this._lastNeedsResponseNotify.set(name, now);
      const url = this.telegram.dashboardUrl ? `\n${this.telegram.dashboardUrl}` : '';
      const msg = `Pilot: "${name}" needs your response.${url}`;
      if (opts.length) {
        const buttons = opts.map(o => ({ text: `${o.num}. ${o.label}`, data: `menu:${name}:${o.num}` }));
        notifier.sendWithButtons(this.telegram.token, this.telegram.chatId, msg, buttons);
      } else {
        notifier.send(this.telegram.token, this.telegram.chatId, msg);
      }
    }, 30000);
    this._needsResponseTimers.set(name, timer);
  }

  _clearNeedsResponseTimer(name) {
    const t = this._needsResponseTimers.get(name);
    if (t) { clearTimeout(t); this._needsResponseTimers.delete(name); }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  spawn(dirPath, name, command = 'claude') {
    const resolved = path.resolve(dirPath.replace(/^~/, process.env.HOME || ''));
    if (!fs.existsSync(resolved)) throw new Error(`Path not found: ${resolved}`);

    const sessionName = sanitizeName(name || path.basename(resolved));
    if (RESERVED.has(sessionName)) throw new Error(`"${sessionName}" is a reserved command name. Choose a different session name.`);
    if (this.sessions.has(sessionName)) throw new Error(`Session "${sessionName}" already exists.`);

    // Kill stale tmux session from a previous crashed run
    try {
      execSync(`tmux has-session -t "${sessionName}"`, { stdio: 'ignore' });
      execSync(`tmux kill-session -t "${sessionName}"`, { stdio: 'ignore' });
    } catch { }

    const adapter = this._makeAdapter(sessionName, resolved, command);
    const session = { name: sessionName, path: resolved, command, status: 'running', startedAt: new Date(), resumeAt: null };
    this._attach(sessionName, adapter);
    adapter.start();
    this.sessions.set(sessionName, { session, adapter });
    config.addToHistory(sessionName, resolved, command);
    return session;
  }

  respawn(name) {
    const h = config.getHistory().find(e => e.name === name);
    if (!h) throw new Error(`No history for session "${name}"`);
    return this.spawn(h.path, name, h.command || 'claude');
  }

  adopt(name, dirPath, command = 'claude') {
    try { execSync(`tmux has-session -t "${name}"`, { stdio: 'ignore' }); }
    catch { throw new Error(`tmux session "${name}" not found.`); }

    if (this.sessions.has(name)) throw new Error(`Session "${name}" already being watched.`);

    const adapter = this._makeAdapter(name, dirPath, command);
    const session = { name, path: dirPath, command, status: 'running', startedAt: new Date(), resumeAt: null };
    this._attach(name, adapter);
    adapter.adopt();
    this.sessions.set(name, { session, adapter });
    config.addToHistory(name, dirPath, command);
    return session;
  }

  kill(name) {
    const entry = this.sessions.get(name);
    if (!entry) throw new Error(`Session "${name}" not found.`);
    this._clearNeedsResponseTimer(name);
    entry.adapter.stop();
    this.sessions.delete(name);
  }

  killAll() {
    for (const name of [...this.sessions.keys()]) {
      try { this.kill(name); } catch { }
    }
  }

  removeFromHistory(name) {
    if (this.sessions.has(name)) throw new Error(`Session "${name}" is still active. Kill it first.`);
    config.removeFromHistory(name);
  }

  list() {
    return [...this.sessions.values()].map(e => e.session);
  }

  /**
   * Route a Telegram callback_data string to the appropriate session.
   * Expected format: "menu:<sessionName>:<num>"
   */
  handleTelegramCallback(data) {
    const m = (data || '').match(/^menu:(.+):(\d+)$/);
    if (!m) return;
    const [, sessionName, num] = m;
    const entry = this.sessions.get(sessionName);
    if (!entry) return;
    entry.adapter.sendKeys(num);
    entry.adapter.sendKeys('Enter');
  }
}

module.exports = SessionManager;
