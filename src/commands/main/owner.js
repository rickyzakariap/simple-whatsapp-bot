const config = require('../../../config');

module.exports = {
  name: 'owner',
  description: 'Show owner info',
  async execute(sock, msg, args) {
    const number = config.ownerNumber
      ? `wa.me/${config.ownerNumber}`
      : 'Not configured (set OWNER_NUMBER in .env)';

    const info = `*🤖 Bot Owner Information*

📱 Number: ${number}
👤 Name: ${config.ownerName}
🌐 GitHub: github.com/${config.ownerGithub}

_Bot created with ❤️ by ${config.ownerName}_`;
    await sock.sendMessage(msg.key.remoteJid, { text: info }, { quoted: msg });
  }
};
