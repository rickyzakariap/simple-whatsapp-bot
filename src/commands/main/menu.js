const config = require('../../../config');
const { formatMenu } = require('../../lib/command-catalog');

module.exports = {
  name: 'menu',
  description: 'Show the command list',
  usage: '.menu',
  async execute(sock, msg, args) {
    const menu = `🤖 *${config.botName} Menu*
Timezone: ${config.timezone}

${formatMenu(config.commandPrefix)}

Type *${config.commandPrefix}help <command>* for details.`;

    await sock.sendMessage(msg.key.remoteJid, { text: menu }, { quoted: msg });
  }
};
