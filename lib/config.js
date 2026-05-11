'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_PATH = process.env.CCP_CONFIG_PATH || path.join(os.homedir(), '.claude-remote-pilot.json');

function load() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function save(data) {
  const current = load();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify({ ...current, ...data }, null, 2));
}

function saveTelegram(token, chatId) {
  save({ telegram: { token, chatId } });
}

function saveSessions(sessions) {
  save({ sessions: sessions.map(s => ({ name: s.name, path: s.path, command: s.command || 'claude' })) });
}

function clearSessions() {
  save({ sessions: [] });
}

function saveResumeCommand(cmd) {
  save({ resumeCommand: cmd });
}

function addToHistory(name, path, command = 'claude') {
  const cfg = load();
  const history = (cfg.sessionHistory || []).filter(s => s.name !== name);
  history.unshift({ name, path, command, lastSeen: new Date().toISOString() });
  save({ sessionHistory: history.slice(0, 30) }); // cap at 30
}

function removeFromHistory(name) {
  const cfg = load();
  save({ sessionHistory: (cfg.sessionHistory || []).filter(s => s.name !== name) });
}

function getHistory() {
  return load().sessionHistory || [];
}

function getAllSessionMeta() {
  return load().sessionMeta || {};
}

function saveSessionMeta(name, meta) {
  const cfg = load();
  const metas = cfg.sessionMeta || {};
  metas[name] = { ...(metas[name] || {}), ...meta };
  save({ sessionMeta: metas });
}

function saveSetupPrefs(prefs) {
  save({ setupPrefs: prefs });
}

function getSetupPrefs() {
  return load().setupPrefs || {};
}

module.exports = { load, saveTelegram, saveSessions, clearSessions, saveResumeCommand, addToHistory, removeFromHistory, getHistory, getAllSessionMeta, saveSessionMeta, saveSetupPrefs, getSetupPrefs };
