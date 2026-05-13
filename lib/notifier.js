'use strict';
const https = require('https');

function _post(token, method, data, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${token}/${method}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => { try { resolve(JSON.parse(raw)); } catch { resolve({}); } });
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => req.destroy(new Error('timeout')));
    req.write(body);
    req.end();
  });
}

function send(token, chatId, message) {
  if (!token || !chatId) return;
  _post(token, 'sendMessage', { chat_id: chatId, text: message }).catch(() => {});
}

/**
 * Send a message with inline keyboard buttons.
 * @param {string} token
 * @param {string} chatId
 * @param {string} message
 * @param {{ text: string, data: string }[]} buttons — each becomes one button per row
 */
function sendWithButtons(token, chatId, message, buttons) {
  if (!token || !chatId) return;
  if (!buttons || !buttons.length) return send(token, chatId, message);
  // Two buttons per row
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(
      buttons.slice(i, i + 2).map(b => ({ text: b.text, callback_data: b.data }))
    );
  }
  _post(token, 'sendMessage', {
    chat_id: chatId,
    text: message,
    reply_markup: { inline_keyboard: rows },
  }).catch(() => {});
}

function answerCallback(token, queryId) {
  if (!token || !queryId) return;
  _post(token, 'answerCallbackQuery', { callback_query_id: queryId }).catch(() => {});
}

// ─── long-poll loop ────────────────────────────────────────────────────────────

let _active = false;
let _offset = 0;

async function _initOffset(token) {
  try {
    const res = await _post(token, 'getUpdates', { offset: -1, limit: 1, timeout: 0 }, 5000);
    if (res.ok && res.result && res.result.length) {
      _offset = res.result[res.result.length - 1].update_id + 1;
    }
  } catch {}
}

/**
 * Start long-polling for callback_query updates.
 * onCallback is called with the full callback_query object.
 */
async function startPolling(token, onCallback) {
  if (!token) return;
  if (_active) return;
  _active = true;

  await _initOffset(token);

  (async () => {
    let consecutive409 = 0;
    while (_active) {
      try {
        const res = await _post(token, 'getUpdates', {
          offset: _offset,
          timeout: 25,
          allowed_updates: ['callback_query'],
        }, 35000);

        if (!_active) break;
        consecutive409 = 0;

        if (res.ok && res.result && res.result.length) {
          for (const upd of res.result) {
            _offset = upd.update_id + 1;
            if (upd.callback_query) {
              try { onCallback(upd.callback_query); } catch {}
            }
          }
        }
      } catch (err) {
        if (!_active) break;
        const is409 = err.message && err.message.includes('409');
        if (is409) {
          consecutive409++;
          if (consecutive409 === 1) {
            process.stderr.write('[pilot] Telegram: 409 conflict — another bot instance may be polling. Backing off.\n');
          }
          // Back off exponentially up to 5 min
          await new Promise(r => setTimeout(r, Math.min(300000, 5000 * Math.pow(2, consecutive409 - 1))));
        } else {
          await new Promise(r => setTimeout(r, 3000));
        }
      }
    }
  })();
}

function stopPolling() {
  _active = false;
}

module.exports = { send, sendWithButtons, answerCallback, startPolling, stopPolling };
