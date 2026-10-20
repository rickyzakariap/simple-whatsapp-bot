const { isGroup, getSender, isGroupAdmin, isBotAdmin, isOwner } = require('../../lib/permissions');

module.exports = {
  name: 'setsubject',
  description: 'Set group subject/name (admin only)',
  usage: '.setsubject <new subject>',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!isGroup(jid)) {
      return sock.sendMessage(jid, { text: 'This command can only be used in groups.' }, { quoted: msg });
    }
    if (!isOwner(sock, msg) && !(await isGroupAdmin(sock, jid, getSender(msg)))) {
      return sock.sendMessage(jid, { text: 'Only admins can use this command.' }, { quoted: msg });
    }
    if (!(await isBotAdmin(sock, jid))) {
      return sock.sendMessage(jid, { text: 'I need to be an admin to change the subject.' }, { quoted: msg });
    }

    const subject = args.join(' ').trim();
    if (!subject) {
      return sock.sendMessage(jid, { text: 'Please provide a new group subject.' }, { quoted: msg });
    }

    try {
      await sock.groupUpdateSubject(jid, subject);
      await sock.sendMessage(jid, { text: 'Group subject updated.' }, { quoted: msg });
    } catch (error) {
      await sock.sendMessage(jid, { text: `Failed to update subject: ${error.message}` }, { quoted: msg });
    }
  }
};
