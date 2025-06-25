# OngBak-Bot

A WhatsApp bot inspired by Knight-Bot, powered by Baileys.

## Features
- QR code login
- Modular command system (easy to add/remove commands)
- Group management tools (add, kick, promote, demote, setdesc, setsubject, link, mute, unmute, welcome, warn, unwarn, tagall)
- Owner tools (broadcast, owner info)
- Media utilities (sticker, toimg, tomp3)
- Mini games (tebakangka, tebakkata, quiz, suit, math, tictactoe)
- **Custom Welcome/Goodbye messages** (per group, with @user and @group placeholders)
- **Auto-Responder** (custom triggers and replies per group)
- Crypto info & TP/SL (.coin)
- Points & leaderboard system

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