# Runtime and Performance Notes

This document describes what the bot actually does. It is **not** a benchmark report, and it deliberately does not claim percentage improvements that were never measured on a reproducible workload.

## Runtime Architecture

- **Command loading:** `src/lib/command-loader.js` scans command files at connection time and lazy-loads a command on first use. A file watcher supports development hot-reload.
- **Caching:** `src/lib/cache.js` keeps JSON data and API responses in memory with TTLs. JSON writes are queued and flushed in batches; the cache is invalidated when files change.
- **API calls:** `src/lib/api-manager.js` adds per-domain rate limits, retry with backoff, response caching, and keep-alive HTTP agents.
- **Message handling:** `index.js` processes only Baileys `messages.upsert` events with `type === 'notify'`, unwraps ephemeral/view-once/caption messages, and starts background polling only after the connection is open.
- **Shutdown:** `SIGINT`/`SIGTERM` clears intervals, stops the command watcher and monitors, flushes cached writes, and closes the API manager.

## Data Storage

JSON files are runtime state, not source code:

```text
alerts.json
schedules.json
birthdays.json
points.json
autoresponder.json
welcome.json
polls.json
portfolio.json
warnings.json
```

They are created on demand and ignored by git. Auto-responder media is stored under `uploads/triggers/`, also ignored by git.

## Practical Limits

- WhatsApp media messages are capped at 100 MB in the command implementations.
- `.yt` requires the optional `yt-dlp` binary; without it the command returns installation instructions.
- `.ig`, `.fb`, and `.igstory` depend on third-party scrapers. Instagram story support is currently disabled because the previous API is dead.
- No benchmark numbers, memory guarantees, or "X% faster" claims are made here. Measure on your own deployment before relying on performance claims.

## Verification

```bash
npm test
node --check index.js
```

The unit tests cover JID normalization, owner/admin checks, message unwrapping, command-catalog path traversal, API URL resolution, and media path containment. They do not connect to WhatsApp.
