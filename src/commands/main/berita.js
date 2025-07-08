const Parser = require('rss-parser');
const parser = new Parser();

module.exports = {
  name: 'berita',
  description: 'Tampilkan berita Indonesia dari Google News, bisa filter keyword',
  async execute(sock, msg, args) {
    const feedUrl = 'https://news.google.com/rss?hl=id&gl=ID&ceid=ID:id';
    const keyword = args.join(' ').toLowerCase();
    try {
      const feed = await parser.parseURL(feedUrl);
      let items = feed.items;
      if (keyword) {
        items = items.filter(item =>
          item.title.toLowerCase().includes(keyword) ||
          (item.contentSnippet && item.contentSnippet.toLowerCase().includes(keyword))
        );
      }
      if (items.length === 0) {
        await sock.sendMessage(msg.key.remoteJid, { text: `Tidak ada berita dengan kata kunci: ${keyword}` }, { quoted: msg });
        return;
      }
      let text = `*Berita Indonesia${keyword ? `: ${keyword}` : ''}*\n\n`;
      items.slice(0, 5).forEach(item => {
        text += `• ${item.title}\n${item.link}\n${item.pubDate}\n\n`;
      });
      await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(msg.key.remoteJid, { text: 'Gagal mengambil berita.' }, { quoted: msg });
    }
  }
}; 