const { Search } = require('abot-scraper');
const axios = require('axios');
const search = new Search();

module.exports = {
  name: 'wallpaper',
  description: 'Search for high-quality wallpapers',
  async execute(sock, msg, args) {
    const query = args.join(' ');
    if (!query) return await sock.sendMessage(msg.key.remoteJid, { text: 'Please provide a search query!\nExample: .wallpaper anime' }, { quoted: msg });
    try {
      const result = await search.wallpaper(query);
      if (result.status === 200 && Array.isArray(result.result) && result.result.length > 0) {
        for (const item of result.result.slice(0, 3)) {
          if (!item.image || !item.image[0]) continue;
          const imgRes = await axios.get(item.image[0], { responseType: 'arraybuffer' });
          await sock.sendMessage(
            msg.key.remoteJid,
            {
              image: Buffer.from(imgRes.data),
              mimetype: 'image/jpeg',
              caption: item.title || 'Wallpaper'
            },
            { quoted: msg }
          );
        }
      } else {
        await sock.sendMessage(msg.key.remoteJid, { text: 'No wallpapers found.' }, { quoted: msg });
      }
    } catch (e) {
      await sock.sendMessage(msg.key.remoteJid, { text: 'Error: ' + (e.message || JSON.stringify(e) || e) }, { quoted: msg });
    }
  }
}; 