const { Search } = require('abot-scraper');
const search = new Search();

module.exports = {
  name: 'ytsearch',
  description: 'Search YouTube videos by keywords',
  async execute(sock, msg, args) {
    const query = args.join(' ');
    if (!query) return await sock.sendMessage(msg.key.remoteJid, { text: 'Please provide a search query!\nExample: .ytsearch phonk remix' }, { quoted: msg });
    try {
      const result = await search.ytSearch(query);
      if (result.status === 200 && Array.isArray(result.result) && result.result.length > 0) {
        let text = `*YouTube Search Results for:* _${query}_\n\n`;
        result.result.slice(0, 3).forEach((item, i) => {
          text += `${i + 1}. *${item.title}*\nhttps://youtu.be/${item.id}\n\n`;
        });
        await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
      } else {
        await sock.sendMessage(msg.key.remoteJid, { text: 'No results found.' }, { quoted: msg });
      }
    } catch (e) {
      await sock.sendMessage(msg.key.remoteJid, { text: 'Error: ' + (e.message || JSON.stringify(e) || e) }, { quoted: msg });
    }
  }
}; 