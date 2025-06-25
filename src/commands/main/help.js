const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'help',
  description: 'Show detailed help for a command',
  async execute(sock, msg, args) {
    const commandsDir = path.join(__dirname);
    if (!args.length) {
      const helpMsg = `*🆘 OngBak-Bot Help*

_Type .help <command> to get details about a specific command._`;
      return sock.sendMessage(msg.key.remoteJid, { text: helpMsg }, { quoted: msg });
    }
    const cmdName = args[0].toLowerCase();
    let cmdFile;
    try {
      cmdFile = require(path.join(commandsDir, cmdName + '.js'));
    } catch (e) {
      return sock.sendMessage(msg.key.remoteJid, { text: `No help found for *${cmdName}*.` }, { quoted: msg });
    }
    let helpText = `*Command: .${cmdName}*\n`;
    helpText += cmdFile.description ? `_${cmdFile.description}_\n` : '';
    if (cmdFile.usage) helpText += `\n*Usage:*\n${cmdFile.usage}\n`;
    return sock.sendMessage(msg.key.remoteJid, { text: helpText }, { quoted: msg });
  },
}; 