const { isGroup, getSender, isGroupAdmin, isBotAdmin, isOwner } = require('../../lib/permissions');

module.exports = {
  name: 'mute',
  description: 'Mute group (admin only)',
  usage: '.mute',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!isGroup(jid)) {
      return sock.sendMessage(jid, { text: 'This command can only be used in groups.' }, { quoted: msg });
    }
    if (!isOwner(sock, msg) && !(await isGroupAdmin(sock, jid, getSender(msg)))) {
      return sock.sendMessage(jid, { text: 'Only admins can use this command.' }, { quoted: msg });
    }
    if (!(await isBotAdmin(sock, jid))) {
      return sock.sendMessage(jid, { text: 'I need to be an admin to mute the group.' }, { quoted: msg });
    }

    try {
      await sock.groupSettingUpdate(jid, 'announcement');
      await sock.sendMessage(jid, { text: 'Group muted (only admins can send messages).' }, { quoted: msg });
    } catch (error) {
      await sock.sendMessage(jid, { text: `Failed to mute group: ${error.message}` }, { quoted: msg });
    }
  }
};
