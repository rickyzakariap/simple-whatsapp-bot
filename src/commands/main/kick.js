const { isGroup, getSender, getTargetJid, isGroupAdmin, isBotAdmin, isOwner, mentionJid } = require('../../lib/permissions');

module.exports = {
  name: 'kick',
  description: 'Remove a member from the group (admin only)',
  usage: '.kick @user | reply | <phone number>',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!isGroup(jid)) {
      return sock.sendMessage(jid, { text: 'This command can only be used in groups.' }, { quoted: msg });
    }

    if (!isOwner(sock, msg) && !(await isGroupAdmin(sock, jid, getSender(msg)))) {
      return sock.sendMessage(jid, { text: 'Only admins can use this command.' }, { quoted: msg });
    }
    if (!(await isBotAdmin(sock, jid))) {
      return sock.sendMessage(jid, { text: 'I need to be an admin to remove members.' }, { quoted: msg });
    }

    const target = getTargetJid(msg, args);
    if (!target) {
      return sock.sendMessage(jid, { text: 'Tag, reply to, or provide the phone number of the user you want to kick.' }, { quoted: msg });
    }

    try {
      await sock.groupParticipantsUpdate(jid, [target], 'remove');
      await sock.sendMessage(jid, {
        text: `Removed ${mentionJid(target)}.`,
        mentions: [target]
      }, { quoted: msg });
    } catch (error) {
      console.error('Kick error:', error);
      await sock.sendMessage(jid, { text: 'An error occurred while removing the member from the group.' }, { quoted: msg });
    }
  }
};
