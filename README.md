# OngBak-Bot WhatsApp

Bot WhatsApp dengan fitur utama downloader media sosial:

## 📥 Downloader
- TikTok Video: `.tiktok <url>`
- YouTube Video: `.yt <url>`
- YouTube MP3: `.ytmp3 <url>`
- Facebook Video: `.fb <url>`
- Instagram Post/Reel: `.ig <url>`

## 🚀 Cara Pakai
1. **Install:**
   ```bash
   git clone <repo-url>
   cd bot-wa
   npm install
   npm install abot-scraper --legacy-peer-deps
   ```
2. **Jalankan bot:**
   ```bash
   node index.js
   ```
3. **Scan QR WhatsApp** saat pertama kali.

## 📝 Contoh Command
```
.tiktok https://vt.tiktok.com/...
.yt https://youtu.be/...
.ytmp3 https://youtu.be/...
.fb https://www.facebook.com/...
.ig https://www.instagram.com/p/...
```

---

- Maksimal file video/audio: 48MB (batas WhatsApp)
- Untuk fitur lain, cek `.menu` di WhatsApp

## 📦 Dependency Utama
- [abot-scraper](https://www.npmjs.com/package/abot-scraper)
- [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys)
- axios, sharp, dll

---

**Kontribusi & bug report silakan via GitHub issue/pull request!**

## Features
- QR code login
- Modular command system (easy to add/remove commands)
- Group management tools (add, kick, promote, demote, setdesc, setsubject, link, mute, unmute, welcome, warn, unwarn, tagall)
- Owner tools (broadcast, owner info)
- Media utilities (sticker, toimg, tomp3)
- Mini games (tebakangka, tebakkata, quiz, suit, math, tictactoe)
- **Custom Welcome/Goodbye messages** (per group, with @user and @group placeholders)
- **Auto-Responder** (custom triggers and replies per group)
- **Random Images:** `.cat`, `.dog`, `.waifu`
- **Polls/Voting:** `.poll`, `.vote`, `.pollresult`
- **Portfolio Tracking:** `.portfolio add/remove/show <symbol>`
- **Price Alerts:** `.alert <symbol> <price>`, `.alert list/remove <symbol>`
- **Top Gainers/Losers:** `.topgainers`, `.toplosers`
- **Scheduled Messages:** `.schedule <HH:MM> <msg>`, `.schedule list/remove <id>`
- **Birthday Reminders:** `.birthday add/remove/list <MM-DD>`
- Crypto info & TP/SL (.coin)
- Points & leaderboard system

## Example Usage
- `.cat` — Random cat image
- `.dog` — Random dog image
- `.waifu` — Random waifu image
- `.poll Best coin?|BTC|ETH|DOGE` — Start a poll
- `.vote BTC` — Vote in poll
- `.pollresult` — Show poll results
- `.portfolio add btc` — Add BTC to your portfolio
- `.portfolio show` — Show your portfolio
- `.alert btc 70000` — Alert when BTC hits $70,000
- `.alert list` — List your alerts
- `.topgainers` — Show top 5 crypto gainers
- `.toplosers` — Show top 5 crypto losers
- `.schedule 08:00 Good morning group!` — Schedule a message
- `.schedule list` — List scheduled messages
- `.birthday add 12-25` — Add your birthday
- `.birthday list` — List all birthdays

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the bot:
   ```bash
   npm start
   ```
3. Scan the QR code in your terminal with WhatsApp (Linked Devices).
4. Try sending `.ping` to the bot!

## Add Commands
- Add new command files to the `src/commands/main/` folder.
- Each command should export `{ name, description, async execute(sock, msg, args) { ... } }`

## Example Command
```js
module.exports = {
  name: 'ping',
  description: 'Check bot response',
  async execute(sock, msg, args) {
    await sock.sendMessage(msg.key.remoteJid, { text: 'pong!' }, { quoted: msg });
  },
};
```

## Custom Welcome/Goodbye
- `.setwelcome Selamat datang @user di @group!` — Set custom welcome message (admin only)
- `.setgoodbye Sampai jumpa @user!` — Set custom goodbye message (admin only)
- `.welcome` — Show current welcome message
- `.goodbye` — Show current goodbye message

## Auto-Responder
- `.addtrigger good morning|Good morning to you too!` — Add a trigger/response (admin only)
- `.deltrigger good morning` — Remove a trigger (admin only)
- `.listtriggers` — List all triggers for the group

## License
MIT 