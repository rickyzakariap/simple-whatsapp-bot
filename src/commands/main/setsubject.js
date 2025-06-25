module.exports = {
  name: 'setsubject',
  description: 'Set group subject/name (admin only)',
  async execute(sock, msg, args) {
    if (!msg.key.remoteJid.endsWith('@g.us')) {
      return sock.sendMessage(msg.key.remoteJid, { text: 'This command can only be used in groups.' }, { quoted: msg });
    }
    if (!args.length) return sock.sendMessage(msg.key.remoteJid, { text: 'Please provide a new group subject.' }, { quoted: msg });
    const subject = args.join(' ');
    try {
      await sock.groupUpdateSubject(msg.key.remoteJid, subject);
      await sock.sendMessage(msg.key.remoteJid, { text: 'Group subject updated.' }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(msg.key.remoteJid, { text: 'Failed to update subject: ' + e.message }, { quoted: msg });
    }
  },
}; 