const Parser = require('rss-parser');
const parser = new Parser();

module.exports = {
  name: 'anime',
  description: 'Tampilkan berita anime terbaru dari MyAnimeList',
  async execute(sock, msg, args) {
    const feedUrl = 'https://myanimelist.net/rss/news.xml';
    try {
      const feed = await parser.parseURL(feedUrl);
      let text = `*Berita Anime Terbaru (MyAnimeList)*\n\n`;
      feed.items.slice(0, 5).forEach(item => {
        text += `• ${item.title}\n${item.link}\n${item.pubDate}\n\n`;
      });
      await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(msg.key.remoteJid, { text: 'Gagal mengambil berita anime.' }, { quoted: msg });
    }
  }
}; 