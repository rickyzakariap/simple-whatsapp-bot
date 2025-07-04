const { getLeaderboard } = require('./points');
const { commandPrefix } = require('../../../config');

module.exports = {
  name: 'menu',
  description: 'Show command list',
  async execute(sock, msg, args) {
    let topText = '';
    let top = [];
    try {
      top = getLeaderboard(msg.key.remoteJid, 1);
      if (top.length) {
        topText = `\n🏆 Top: @${top[0][0].split('@')[0]} (${top[0][1]} pts)`;
      }
    } catch {}
    
    const menu = `🤖 *OngBak-Bot Menu*${topText}

📋 *Basic Commands*
• .ping — Bot status
• .menu — This menu
• .owner — Owner info
• .help — Command help

🎮 *Games*
• .tebakangka — Guess number
• .tebakkata — Word scramble  
• .quiz — Trivia game
• .suit — Rock paper scissors
• .math — Math challenge
• .tictactoe — Tic tac toe

🖼️ *Image Editing*
• .sticker — Convert to sticker

🛠️ *Tools*
• .coin — Crypto info
• .weather — Weather info
• .points — Check points

👥 *Group Admin*
• .add/.kick — Add/remove member
• .promote/.demote — Admin control
• .mute/.unmute — Group mute
• .warn/.unwarn — Warning system
• .tagall — Mention all
• .setdesc/.setsubject — Group settings

🤖 *Auto-Reply*
• .addtrigger — Add auto-reply
• .deltrigger — Delete auto-reply  
• .listtriggers — Show triggers

👑 *Owner Only*
• .broadcast — Send to all groups

📥 *Downloader*
• ${commandPrefix}tiktok <url> — TikTok Video
• ${commandPrefix}yt <url> — YouTube Video
• ${commandPrefix}ytmp3 <url> — YouTube MP3
• ${commandPrefix}fb <url> — Facebook Video
• ${commandPrefix}ig <url> — Instagram Post/Reel

💡 Type .help <command> for details`;
    
    await sock.sendMessage(msg.key.remoteJid, { text: menu, mentions: top && top.length ? [top[0][0]] : [] }, { quoted: msg });
  },
}; 