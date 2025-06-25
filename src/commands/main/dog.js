const axios = require('axios');

module.exports = {
  name: 'dog',
  description: 'Send a random dog image',
  usage: '.dog',
  async execute(sock, msg, args) {
    try {
      const { data } = await axios.get('https://dog.ceo/api/breeds/image/random');
      const url = data.message;
      await sock.sendMessage(msg.key.remoteJid, { image: { url }, caption: 'Woof! 🐶' }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(msg.key.remoteJid, { text: 'Failed to fetch dog image.' }, { quoted: msg });
    }
  },
}; 