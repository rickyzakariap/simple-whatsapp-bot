const Parser = require('rss-parser');
const parser = new Parser();

module.exports = {
  name: 'canva',
  description: 'Cek status layanan Canva',
  async execute(sock, msg, args) {
    const feedUrl = 'https://www.canvastatus.com/history.rss';
    try {
      const feed = await parser.parseURL(feedUrl);
      let text = `*Canva Status*\n\n`;
      feed.items.slice(0, 3).forEach(item => {
        text += `• ${item.title}\n${item.link}\n${item.pubDate}\n\n`;
      });
      await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(msg.key.remoteJid, { text: 'Gagal mengambil status Canva.' }, { quoted: msg });
    }
  }
}; 