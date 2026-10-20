const config = require('../../../config');
const { getCommandMetadata, listCommandNames } = require('../../lib/command-catalog');

module.exports = {
  name: 'help',
  description: 'Show help for a command',
  usage: '.help [command]',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const prefix = config.commandPrefix;

    if (!args.length) {
      const commands = listCommandNames().filter(name => name !== 'utils');
      const helpMsg = `*🆘 ${config.botName} Help*

Type *${prefix}help <command>* for details.
Type *${prefix}menu* for the categorized command list.

*Commands (${commands.length}):*
${commands.map(name => `${prefix}${name}`).join(', ')}`;

      return sock.sendMessage(jid, { text: helpMsg }, { quoted: msg });
    }

    const cmdName = String(args[0] || '').toLowerCase();
    const command = getCommandMetadata(cmdName);
    if (!command) {
      return sock.sendMessage(jid, { text: `No help found for *${cmdName}*.` }, { quoted: msg });
    }

    let helpText = `*Command: ${prefix}${cmdName}*\n`;
    if (command.description) helpText += `_${command.description}_\n`;
    if (command.usage) helpText += `\n*Usage:*\n${command.usage}\n`;

    return sock.sendMessage(jid, { text: helpText }, { quoted: msg });
  }
};
