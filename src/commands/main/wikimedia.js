const axios = require('axios');

const USER_AGENT = 'OngBak-Bot/1.1 (https://github.com/rickyzakariap/simple-whatsapp-bot)';

module.exports = {
  name: 'wikimedia',
  description: 'Search images on Wikimedia Commons',
  usage: '.wikimedia <query>',
  async execute(sock, msg, args) {
    const chatId = msg.key.remoteJid;
    const query = args.join(' ').trim();
    if (!query) {
      return sock.sendMessage(chatId, { text: 'Usage: .wikimedia <query>\nExample: .wikimedia cat' }, { quoted: msg });
    }

    try {
      const { data } = await axios.get('https://commons.wikimedia.org/w/api.php', {
        params: {
          action: 'query',
          generator: 'search',
          gsrsearch: query,
          gsrnamespace: 6,
          gsrlimit: 3,
          prop: 'imageinfo',
          iiprop: 'url',
          iiurlwidth: 1024,
          format: 'json',
          origin: '*'
        },
        headers: { 'User-Agent': USER_AGENT },
        timeout: 15000
      });

      const pages = Object.values(data?.query?.pages || {});
      const images = pages
        .map(page => ({
          title: (page.title || 'Wikimedia image').replace(/^File:/i, ''),
          url: page.imageinfo?.[0]?.thumburl || page.imageinfo?.[0]?.url
        }))
        .filter(item => item.url);

      if (!images.length) {
        return sock.sendMessage(chatId, { text: 'No media found.' }, { quoted: msg });
      }

      for (const item of images) {
        try {
          const image = await axios.get(item.url, {
            responseType: 'arraybuffer',
            headers: { 'User-Agent': USER_AGENT },
            timeout: 30000,
            maxContentLength: 20 * 1024 * 1024
          });
          await sock.sendMessage(chatId, {
            image: Buffer.from(image.data),
            caption: item.title
          }, { quoted: msg });
        } catch (error) {
          console.error('Wikimedia image download failed:', error.message);
        }
      }
    } catch (error) {
      console.error('Wikimedia error:', error.message);
      await sock.sendMessage(chatId, { text: 'Failed to search Wikimedia Commons.' }, { quoted: msg });
    }
  }
};
