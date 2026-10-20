const { isGroup, getSender, isGroupAdmin, isBotAdmin, isOwner } = require('../../lib/permissions');

module.exports = {
  name: 'unmute',
  description: 'Unmute group (admin only)',
  usage: '.unmute',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!isGroup(jid)) {
      return sock.sendMessage(jid, { text: 'This command can only be used in groups.' }, { quoted: msg });
    }
    if (!isOwner(sock, msg) && !(await isGroupAdmin(sock, jid, getSender(msg)))) {
      return sock.sendMessage(jid, { text: 'Only admins can use this command.' }, { quoted: msg });
    }
    if (!(await isBotAdmin(sock, jid))) {
      return sock.sendMessage(jid, { text: 'I need to be an admin to unmute the group.' }, { quoted: msg });
    }

    try {
      await sock.groupSettingUpdate(jid, 'not_announcement');
      await sock.sendMessage(jid, { text: 'Group unmuted (everyone can send messages).' }, { quoted: msg });
    } catch (error) {
      await sock.sendMessage(jid, { text: `Failed to unmute group: ${error.message}` }, { quoted: msg });
    }
  }
};
