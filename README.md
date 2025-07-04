# OngBak-Bot WhatsApp 🤖

**A simple, powerful WhatsApp bot for downloading & searching social media content.**

---

## 🚀 Features

### 📥 Downloader
- `.tiktok <url>` — Download TikTok videos
- `.yt <url>` — Download YouTube videos
- `.ytmp3 <url>` — Download YouTube as MP3
- `.fb <url>` — Download Facebook videos
- `.ig <url>` — Download Instagram posts/reels

### 🔍 Search
- `.ytsearch <query>` — YouTube video search
- `.igstory <username>` — Instagram stories
- `.wallpaper <query>` — High-quality wallpapers
- `.wikimedia <query>` — Wikimedia images/media

---

## ⚡️ Quick Start

1. **Install dependencies:**
   ```bash
   git clone <repo-url>
   cd bot-wa
   npm install
   npm install abot-scraper --legacy-peer-deps
   ```
2. **Run the bot:**
   ```bash
   node index.js
   ```
3. **Scan the WhatsApp QR code** on first run.

---

## 💬 Example Commands
```
.tiktok https://vt.tiktok.com/...
.yt https://youtu.be/...
.ytmp3 https://youtu.be/...
.fb https://www.facebook.com/...
.ig https://www.instagram.com/p/...
.ytsearch phonk remix
.igstory cristiano
.wallpaper anime
.wikimedia cat
```

- Max file size for video/audio: 48MB (WhatsApp limit)
- More features: type `.menu` in WhatsApp

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details. 