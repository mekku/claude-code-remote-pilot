---
id: web-token-auth
name: Token Authentication
type: capability
domain: web
status: active
confidence: source_supported
source_files:
  - lib/WebServer.js
last_reviewed: 2026-05-11
version: 0.14.3
tags:
  - type/capability
  - domain/web
  - status/active
---

# Token Authentication

Protects the web dashboard and API using a secret token passed as a URL query parameter or HTTP header. The token is generated on first run and persisted in config.

## What it does

- Password-based: constructor receives a plaintext `password`; `_token = crypto.randomBytes(20).toString('hex')` is generated if a password is set. The password is checked at `POST /api/login`; success returns the ephemeral `_token`.
- Checks subsequent requests for `?token=<value>` or `Authorization: Bearer <value>` header; returns HTTP 401 on mismatch.
- Localhost connections bypass auth (no `X-Forwarded-For` / `CF-Connecting-IP` header) — tunneled requests still require a token.
- `setPassword(pw)` — updates `this.password` and rotates `this._token` at runtime; existing browser sessions are forced to re-login. Called by the `password` REPL command.
- Password is persisted via `config.saveWebPassword()` and loaded at startup via `config.getWebPassword()` so it survives process restarts.

## Entry point

`lib/WebServer.js` — middleware check on every request

## Related

- [[web|Web domain]]
- [[web-serve-dashboard|Serve Dashboard]]
- [[web-session-api|Session API]]
- [[web-token-auth-concept|Token Auth Concept]]
