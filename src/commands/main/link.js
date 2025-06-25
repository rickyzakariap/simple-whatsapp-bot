module.exports = {
  name: 'link',
  description: 'Get group invite link (admin only)',
  async execute(sock, msg, args) {
    if (!msg.key.remoteJid.endsWith('@g.us')) {
      return sock.sendMessage(msg.key.remoteJid, { text: 'This command can only be used in groups.' }, { quoted: msg });
    }
    try {
      const code = await sock.groupInviteCode(msg.key.remoteJid);
      const link = `https://chat.whatsapp.com/${code}`;
      await sock.sendMessage(msg.key.remoteJid, { text: 'Group Link: ' + link }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(msg.key.remoteJid, { text: 'Failed to get group link: ' + e.message }, { quoted: msg });
    }
  },
}; 