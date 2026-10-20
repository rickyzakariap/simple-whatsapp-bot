const { isGroup, getSender, phoneToJid, isGroupAdmin, isBotAdmin, isOwner, mentionJid } = require('../../lib/permissions');

module.exports = {
  name: 'add',
  description: 'Add a member to the group (admin only)',
  usage: '.add <phone number>',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!isGroup(jid)) {
      return sock.sendMessage(jid, { text: 'This command can only be used in groups.' }, { quoted: msg });
    }

    if (!isOwner(sock, msg) && !(await isGroupAdmin(sock, jid, getSender(msg)))) {
      return sock.sendMessage(jid, { text: 'Only group admins can use this command.' }, { quoted: msg });
    }
    if (!(await isBotAdmin(sock, jid))) {
      return sock.sendMessage(jid, { text: 'I need to be an admin to add members.' }, { quoted: msg });
    }

    const target = phoneToJid(args[0]);
    if (!target) {
      return sock.sendMessage(jid, { text: 'Usage: .add <phone number>\nExample: .add 6281234567890' }, { quoted: msg });
    }

    try {
      const result = await sock.groupParticipantsUpdate(jid, [target], 'add');
      const status = Array.isArray(result) ? result[0]?.status : null;
      if (status && status !== '200') {
        return sock.sendMessage(jid, {
          text: `Could not add ${mentionJid(target)} (status: ${status}). They may have privacy settings enabled.`,
          mentions: [target]
        }, { quoted: msg });
      }
      await sock.sendMessage(jid, {
        text: `Added ${mentionJid(target)}.`,
        mentions: [target]
      }, { quoted: msg });
    } catch (error) {
      console.error('Add member error:', error);
      await sock.sendMessage(jid, { text: `Failed to add member: ${error.message}` }, { quoted: msg });
    }
  }
};
