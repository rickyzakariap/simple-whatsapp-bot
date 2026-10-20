# OngBak-Bot WhatsApp 🤖

A modular WhatsApp bot built with [Baileys](https://github.com/WhiskeySockets/Baileys) for downloads, games, group administration, and small utilities.

> **Status:** actively maintained rescue branch. Some third-party download APIs are unreliable by nature and are marked as experimental below.

---

## Requirements

- Node.js **20 or newer**
- npm 10 or newer
- A WhatsApp account for the bot
- Optional: [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) for `.yt` video downloads

`ffmpeg-static` is installed with npm, so a separate FFmpeg installation is not required.

---

## Installation

```bash
git clone https://github.com/rickyzakariap/simple-whatsapp-bot.git
cd simple-whatsapp-bot
npm ci
cp .env.example .env
```

Edit `.env`:

```dotenv
OWNER_NUMBER=628xxxxxxxxxx
TIMEZONE=Asia/Jakarta
```

Use the owner's phone number in international format, digits only. This is normally required when the bot runs on a separate WhatsApp number; the bot account itself is also treated as an owner fallback. Messages sent by the bot account itself are ignored by the command handler.

Start the bot:

```bash
npm start
```

Scan the QR code with WhatsApp on the first run. The login session is stored in `session/` and is ignored by git.

For development with automatic restart:

```bash
npm run dev
```

---

## Tests

```bash
npm test
```

The test suite uses Node's built-in test runner and does not connect to WhatsApp or write production data.

---

## Command Status

### Stable

| Command | Description |
| --- | --- |
| `.menu`, `.help` | Command list and per-command help |
| `.ping`, `.owner` | Bot status and owner info |
| `.tiktok <url>` | TikTok video downloader |
| `.ytmp3 <url>` | YouTube audio downloader |
| `.ytsearch <query>` | YouTube search |
| `.sticker` | Convert a replied image/video or image URL to a sticker |
| `.toimg [png\|jpg]` | Convert a replied sticker to an image |
| `.tomp3` | Convert a replied video/voice note to MP3 |
| `.coin`, `.topgainers`, `.toplosers` | CoinGecko market information |
| `.portfolio` | Personal coin watchlist |
| `.weather <city>` | Weather via Open-Meteo (no API key) |
| `.waifu`, `.cat`, `.dog`, `.wallpaper` | Image commands |
| `.wikimedia <query>` | Wikimedia Commons image search |
| `.anime`, `.berita`, `.canva` | RSS feeds |
| `.quiz`, `.tebakangka`, `.tebakkata`, `.math`, `.suit` | Games |
| `.tictactoe start` / `.tictactoe join` | Two-player tic tac toe |
| `.points` | Personal points and group leaderboard |
| `.poll`, `.vote`, `.pollresult` | Polls |
| `.schedule` | Daily scheduled messages |
| `.birthday` | Birthday reminders |
| `.alert` | Crypto price alerts (above/below) |
| `.add`, `.kick`, `.promote`, `.demote` | Group member management |
| `.mute`, `.unmute`, `.setsubject`, `.setdesc`, `.tagall`, `.link` | Group settings |
| `.warn`, `.unwarn` | Persistent per-group warnings |
| `.welcome`, `.setwelcome`, `.setgoodbye` | Welcome/goodbye messages |
| `.addtrigger`, `.deltrigger`, `.listtriggers`, `.autoresponder` | Auto-replies |
| `.broadcast` | Owner-only broadcast to groups |
| `.performance` | Runtime metrics (owner/group admin) |

### Experimental / conditional

| Command | Notes |
| --- | --- |
| `.yt <url>` | Requires `yt-dlp` on the server. Without it, the bot replies with installation instructions. |
| `.ig <url>` | Depends on a third-party scraper and may stop working without notice. |
| `.fb <url>` | Depends on a third-party scraper and may stop working without notice. |

### Disabled

| Command | Reason |
| --- | --- |
| `.igstory` | The previous scraper API is dead and Instagram requires login. The command now returns a clear unavailable message instead of hanging. |

---

## Environment Variables

See `.env.example` for the full list.

| Variable | Default | Description |
| --- | --- | --- |
| `OWNER_NUMBER` | empty | Owner phone number, digits only |
| `OWNER_JIDS` | empty | Extra owner JIDs, comma separated |
| `BOT_NAME` | `OngBak-Bot` | Display name |
| `OWNER_NAME` | `Ong-Bak` | Owner display name |
| `OWNER_GITHUB` | `rickyzakariap` | GitHub username shown by `.owner` |
| `COMMAND_PREFIX` | `.` | Text command prefix |
| `SESSION_NAME` | `session` | Baileys session directory |
| `TIMEZONE` | `Asia/Jakarta` | Timezone for schedules and birthdays |
| `YTDLP_PATH` | `yt-dlp` | Path to the optional yt-dlp binary |

---

## Data and Privacy

The following files/directories are **runtime data** and are ignored by git:

```
session/
temp/
uploads/
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

Do not commit them. They can contain phone numbers, group IDs, and media.

> Removing a file in a new commit does not remove it from old git history. If old history in your fork still contains personal data, treat it as already exposed and clean history separately if necessary.

---

## Group Permissions

Group admin commands verify:

1. the sender is a group admin (or the configured owner), and
2. the bot account is a group admin when WhatsApp requires it.

JIDs are normalized before comparison, including Baileys device suffixes (`:12`). Phone-number JIDs and LIDs are compared separately because they are not interchangeable identifiers.

---

## Project Layout

```
index.js                     Connection, message ingestion, polling
config.js                    Environment-backed configuration
src/commands/main/           One command per file
src/lib/permissions.js       JID normalization and permission checks
src/lib/message.js           Ephemeral/view-once/caption unwrapping
src/lib/database.js          Cached JSON data layer
src/lib/autoresponder.js     Trigger storage and media files
src/lib/command-catalog.js   Safe help/menu metadata loader
src/lib/ytdlp.js             Optional yt-dlp integration
tests/                       Node test runner tests
```

The legacy `web-server.js` and its unused Express/Sharp/Multer stack were removed. The bot is controlled through WhatsApp commands.

---

## Troubleshooting

- **QR not appearing:** delete the `session/` directory and run `npm start` again.
- **`.yt` says yt-dlp is not installed:** install it with `pip install -U yt-dlp` or set `YTDLP_PATH`.
- **Download API failures:** third-party scrapers change frequently. Prefer `.tiktok`, `.ytmp3`, and `.ytsearch`, which are tested.
- **`npm ci` fails:** make sure you are using the committed lockfile and Node.js 20+.

---

## License

MIT License.
