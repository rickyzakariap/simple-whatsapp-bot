const { getLeaderboard } = require('./points');
const { commandPrefix } = require('../../../config');

module.exports = {
  name: 'menu',
  description: 'Show command list',
  async execute(sock, msg, args) {
    const menu = `🤖 *OngBak-Bot Menu*

*Basic*
• .ping — Status bot
• .help — Bantuan
• .owner — Info owner

*Games*
• .tebakangka — Tebak angka
• .quiz — Kuis
• .math — Matematika

*Tools*
• .sticker — Sticker
• .coin — Info crypto
• .weather — Cuaca

*Downloader*
• .tiktok <url> — TikTok Video
• .yt <url> — YouTube Video
• .ytmp3 <url> — YouTube MP3
• .ig <url> — Instagram Post/Reel

*Group*
• .add — Tambah member
• .kick — Keluarkan member

Ketik *.help <command>* untuk detail.`;
    await sock.sendMessage(msg.key.remoteJid, { text: menu }, { quoted: msg });
  },
}; 