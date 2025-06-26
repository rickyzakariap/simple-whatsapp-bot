const { getLeaderboard } = require('./points');

module.exports = {
  name: 'menu',
  description: 'Show command list',
  async execute(sock, msg, args) {
    let topText = '';
    let top = [];
    try {
      top = getLeaderboard(msg.key.remoteJid, 1);
      if (top.length) {
        topText = `\n\n*🏆 Top Skor Grup:*\n1. @${top[0][0].split('@')[0]}: ${top[0][1]} poin`;
      }
    } catch {}
    const menu = `*🌟 OngBak-Bot Command Menu 🌟*${topText}

*🛠️ Utilities*
• .ping  — Check bot response
• .menu  — Show this menu
• .owner — Show owner info
• .sticker (reply or URL) — Image/video or image URL to sticker
• .pinterest <search> — Search images on Pinterest
• .coin <symbol|name> — Crypto info & TP/SL
• .addtrigger <trigger>|<response> — Add auto-reply (admin)
• .deltrigger <trigger> — Delete auto-reply (admin)
• .listtriggers — List auto-replies

*👥 Group Management*
• .add <number>         — Add member (admin)
• .kick @user           — Remove member (admin)
• .promote @user        — Make admin (admin)
• .demote @user         — Remove admin (admin)
• .setdesc <desc>       — Set group description (admin)
• .setsubject <name>    — Set group name (admin)
• .link                 — Get group invite link (admin)
• .mute                 — Mute group (admin)
• .unmute               — Unmute group (admin)
• .welcome              — Show welcome message
• .goodbye              — Show goodbye message
• .setwelcome <msg>     — Set welcome message (admin)
• .setgoodbye <msg>     — Set goodbye message (admin)
• .warn @user           — Warn member (admin)
• .unwarn @user         — Remove warning (admin)
• .tagall [msg]         — Mention all group members (admin)

*👑 Owner Tools*
• .broadcast <msg>      — Broadcast to all groups (owner)

*🎮 Mini Games*
• .tebakangka [start|angka]   — Tebak Angka (Guess the Number)
• .tebakkata [start|kata]     — Tebak Kata (Word Scramble)
• .quiz [start|jawaban]       — Quiz/Trivia
• .suit <batu|gunting|kertas> — Suit (Rock Paper Scissors)
• .math [start|jawaban]       — Math Challenge
• .tictactoe start/<posisi>   — Tic Tac Toe

_Type .help <command> for details (if available)_`;
    await sock.sendMessage(msg.key.remoteJid, { text: menu, mentions: top && top.length ? [top[0][0]] : [] }, { quoted: msg });
  },
}; 