const { isGroup, getSender, getTargetJid, isGroupAdmin, isBotAdmin, isOwner, mentionJid } = require('../../lib/permissions');

module.exports = {
  name: 'promote',
  description: 'Promote a member to admin (admin only)',
  usage: '.promote @user | reply | <phone number>',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!isGroup(jid)) {
      return sock.sendMessage(jid, { text: 'This command can only be used in groups.' }, { quoted: msg });
    }

    if (!isOwner(sock, msg) && !(await isGroupAdmin(sock, jid, getSender(msg)))) {
      return sock.sendMessage(jid, { text: 'Only group admins can use this command.' }, { quoted: msg });
    }
    if (!(await isBotAdmin(sock, jid))) {
      return sock.sendMessage(jid, { text: 'I need to be an admin to promote members.' }, { quoted: msg });
    }

    const target = getTargetJid(msg, args);
    if (!target) {
      return sock.sendMessage(jid, { text: 'Tag, reply to, or provide the phone number of the user you want to promote.' }, { quoted: msg });
    }

    try {
      await sock.groupParticipantsUpdate(jid, [target], 'promote');
      await sock.sendMessage(jid, {
        text: `Promoted ${mentionJid(target)} to admin.`,
        mentions: [target]
      }, { quoted: msg });
    } catch (error) {
      console.error('Promote error:', error);
      await sock.sendMessage(jid, { text: `Failed to promote: ${error.message}` }, { quoted: msg });
    }
  }
};
