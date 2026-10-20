const { isGroup, getSender, isGroupAdmin, isOwner } = require('../../lib/permissions');

module.exports = {
  name: 'link',
  description: 'Get the group invite link (admin only)',
  usage: '.link',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!isGroup(jid)) {
      return sock.sendMessage(jid, { text: 'This command can only be used in groups.' }, { quoted: msg });
    }
    if (!isOwner(sock, msg) && !(await isGroupAdmin(sock, jid, getSender(msg)))) {
      return sock.sendMessage(jid, { text: 'Only admins can use this command.' }, { quoted: msg });
    }

    try {
      const code = await sock.groupInviteCode(jid);
      await sock.sendMessage(jid, { text: `Group Link: https://chat.whatsapp.com/${code}` }, { quoted: msg });
    } catch (error) {
      await sock.sendMessage(jid, { text: `Failed to get group link: ${error.message}` }, { quoted: msg });
    }
  }
};
