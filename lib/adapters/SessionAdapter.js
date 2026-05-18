'use strict';
const EventEmitter = require('events');

/**
 * Abstract base class for session adapters.
 *
 * Concrete subclasses (TmuxSessionAdapter, ClaudeSDKAdapter, …) implement the
 * lifecycle + I/O methods and emit these events:
 *
 *   'status'  (newStatus: string, data?: object)
 *       Fired whenever status changes. `newStatus` is one of:
 *         'running' | 'idle' | 'limit' | 'needs-response' | 'offline'
 *       For 'limit', `data` includes { waitMs, resetAtMs, resetTime }.
 *       For 'needs-response', `data` includes { menuOptions: [{num, label}] }.
 *
 *   'tokens'  ({ sent: string, received: string })
 *       Fired when token counts become visible in the agent output.
 *
 *   'stopped' ()
 *       Fired when the underlying process terminates on its own (not via stop()).
 */
class SessionAdapter extends EventEmitter {
  constructor(name, cwd, command) {
    super();
    this._name = name;
    this._cwd = cwd;
    this._command = command;
    this._status = 'offline';
  }

  get name() { return this._name; }
  get cwd() { return this._cwd; }
  get command() { return this._command; }
  set command(v) { this._command = v; }

  get status() { return this._status; }

  _setStatus(newStatus, data) {
    if (newStatus === this._status) return;
    this._status = newStatus;
    this.emit('status', newStatus, data || {});
  }

  /** Spawn the underlying agent process and start watching it. */
  async start() { throw new Error(`${this.constructor.name}.start() not implemented`); }

  /** Terminate the underlying agent process and stop watching. */
  async stop() { throw new Error(`${this.constructor.name}.stop() not implemented`); }

  /** Stop then start. */
  async restart() { await this.stop(); await this.start(); }

  /**
   * Send text as user input followed by Enter.
   * @param {string} text
   */
  async sendInput(text) { throw new Error(`${this.constructor.name}.sendInput() not implemented`); }

  /**
   * Send a raw key sequence (e.g. 'C-c', 'Tab', 'Up').
   * @param {string} keys  tmux send-keys format for TmuxAdapter; mapped to SDK calls for SDK adapter.
   */
  async sendKeys(keys) { throw new Error(`${this.constructor.name}.sendKeys() not implemented`); }

  /**
   * Return buffered display text (last `lines` lines).
   * Each adapter maintains its own ring buffer filled from its output source.
   * @param {number} lines
   * @returns {string}
   */
  getOutput(lines = 500) { throw new Error(`${this.constructor.name}.getOutput() not implemented`); }
}

module.exports = SessionAdapter;
