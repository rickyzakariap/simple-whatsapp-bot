const warnings = {};

module.exports = {
  name: 'warn',
  description: 'Warn a member (admin only)',
  async execute(sock, msg, args) {
    if (!msg.key.remoteJid.endsWith('@g.us')) {
      return sock.sendMessage(msg.key.remoteJid, { text: 'This command can only be used in groups.' }, { quoted: msg });
    }
    if (!msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
      return sock.sendMessage(msg.key.remoteJid, { text: 'Tag the user you want to warn.' }, { quoted: msg });
    }
    const target = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
    warnings[target] = (warnings[target] || 0) + 1;
    await sock.sendMessage(msg.key.remoteJid, { text: `@${target.split('@')[0]} has been warned (${warnings[target]}).`, mentions: [target] }, { quoted: msg });
  },
  warnings,
}; 