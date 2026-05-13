'use strict';

const ANSI_RE = /\x1b\[[0-9;]*[a-zA-Z]/g;

function stripAnsi(text) {
  return text.replace(ANSI_RE, '').replace(/\x1b[()][AB012]/g, '').replace(/\r/g, '');
}

/**
 * Parse numbered menu options from terminal output.
 * Returns [] if fewer than 2 sequential options starting at 1 are found.
 * @param {string} text — raw terminal text (may contain ANSI escapes)
 * @returns {{ num: number, label: string }[]}
 */
function detect(text) {
  const plain = stripAnsi(text);
  const lines = plain.split('\n').slice(-50);
  const found = new Map();
  for (const line of lines) {
    const m = line.match(/^\s*(?:[❯>◆│]\s*)?(\d+)[.)]\s+(.+?)\s*$/);
    if (m) {
      const num = parseInt(m[1], 10);
      const label = m[2].replace(/\s*\(esc\)\s*$/i, '').trim();
      if (num >= 1 && num <= 9 && label) found.set(num, label);
    }
  }
  if (found.size < 2) return [];
  const opts = [...found.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([num, label]) => ({ num, label }));
  if (opts[0].num !== 1) return [];
  for (let i = 0; i < opts.length; i++) if (opts[i].num !== i + 1) return [];
  return opts;
}

module.exports = { detect, stripAnsi };
