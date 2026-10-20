const { isGroup, getSender, getTargetJid, isGroupAdmin, isBotAdmin, isOwner, mentionJid } = require('../../lib/permissions');

module.exports = {
  name: 'demote',
  description: 'Demote an admin to member (admin only)',
  usage: '.demote @user | reply | <phone number>',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!isGroup(jid)) {
      return sock.sendMessage(jid, { text: 'This command can only be used in groups.' }, { quoted: msg });
    }

    if (!isOwner(sock, msg) && !(await isGroupAdmin(sock, jid, getSender(msg)))) {
      return sock.sendMessage(jid, { text: 'Only group admins can use this command.' }, { quoted: msg });
    }
    if (!(await isBotAdmin(sock, jid))) {
      return sock.sendMessage(jid, { text: 'I need to be an admin to demote members.' }, { quoted: msg });
    }

    const target = getTargetJid(msg, args);
    if (!target) {
      return sock.sendMessage(jid, { text: 'Tag, reply to, or provide the phone number of the user you want to demote.' }, { quoted: msg });
    }

    try {
      await sock.groupParticipantsUpdate(jid, [target], 'demote');
      await sock.sendMessage(jid, {
        text: `Demoted ${mentionJid(target)} to member.`,
        mentions: [target]
      }, { quoted: msg });
    } catch (error) {
      console.error('Demote error:', error);
      await sock.sendMessage(jid, { text: `Failed to demote: ${error.message}` }, { quoted: msg });
    }
  }
};
