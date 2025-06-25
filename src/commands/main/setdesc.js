module.exports = {
  name: 'setdesc',
  description: 'Set group description (admin only)',
  async execute(sock, msg, args) {
    if (!msg.key.remoteJid.endsWith('@g.us')) {
      return sock.sendMessage(msg.key.remoteJid, { text: 'This command can only be used in groups.' }, { quoted: msg });
    }
    if (!args.length) return sock.sendMessage(msg.key.remoteJid, { text: 'Please provide a new group description.' }, { quoted: msg });
    const desc = args.join(' ');
    try {
      await sock.groupUpdateDescription(msg.key.remoteJid, desc);
      await sock.sendMessage(msg.key.remoteJid, { text: 'Group description updated.' }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(msg.key.remoteJid, { text: 'Failed to update description: ' + e.message }, { quoted: msg });
    }
  },
}; 