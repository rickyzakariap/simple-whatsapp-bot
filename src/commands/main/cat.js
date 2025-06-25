const axios = require('axios');

module.exports = {
  name: 'cat',
  description: 'Send a random cat image',
  usage: '.cat',
  async execute(sock, msg, args) {
    try {
      const { data } = await axios.get('https://api.thecatapi.com/v1/images/search');
      const url = data[0].url;
      await sock.sendMessage(msg.key.remoteJid, { image: { url }, caption: 'Meow! 🐱' }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(msg.key.remoteJid, { text: 'Failed to fetch cat image.' }, { quoted: msg });
    }
  },
}; 