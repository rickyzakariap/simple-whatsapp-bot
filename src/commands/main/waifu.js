const axios = require('axios');

module.exports = {
  name: 'waifu',
  description: 'Send a random waifu image',
  usage: '.waifu',
  async execute(sock, msg, args) {
    try {
      const { data } = await axios.get('https://api.waifu.pics/sfw/waifu');
      const url = data.url;
      await sock.sendMessage(msg.key.remoteJid, { image: { url }, caption: 'Here is your waifu! 💖' }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(msg.key.remoteJid, { text: 'Failed to fetch waifu image.' }, { quoted: msg });
    }
  },
}; 