const warnings = require('./warn').warnings;

module.exports = {
  name: 'unwarn',
  description: 'Remove a warning from a member (admin only)',
  async execute(sock, msg, args) {
    if (!msg.key.remoteJid.endsWith('@g.us')) {
      return sock.sendMessage(msg.key.remoteJid, { text: 'This command can only be used in groups.' }, { quoted: msg });
    }
    if (!msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
      return sock.sendMessage(msg.key.remoteJid, { text: 'Tag the user you want to unwarn.' }, { quoted: msg });
    }
    const target = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
    if (warnings[target]) {
      warnings[target]--;
      await sock.sendMessage(msg.key.remoteJid, { text: `@${target.split('@')[0]}'s warning removed (${warnings[target]}).`, mentions: [target] }, { quoted: msg });
    } else {
      await sock.sendMessage(msg.key.remoteJid, { text: `@${target.split('@')[0]} has no warnings.`, mentions: [target] }, { quoted: msg });
    }
  },
}; 