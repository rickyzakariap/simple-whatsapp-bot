const axios = require('axios');

module.exports = {
  name: 'waifu',
  description: 'Send a random waifu image',
  usage: '.waifu',
  async execute(sock, msg, args) {
    try {
      const { data } = await axios.get('https://nekos.best/api/v2/neko', {
        timeout: 10000,
        headers: { 'User-Agent': 'OngBak-Bot/1.1' }
      });
      const url = data?.results?.[0]?.url;
      if (!url) throw new Error('No image URL returned');
      await sock.sendMessage(msg.key.remoteJid, {
        image: { url },
        caption: 'Here is your waifu! 💖'
      }, { quoted: msg });
    } catch (error) {
      console.error('Waifu error:', error.message);
      await sock.sendMessage(msg.key.remoteJid, { text: 'Failed to fetch waifu image.' }, { quoted: msg });
    }
  }
};
