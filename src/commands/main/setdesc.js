const { isGroup, getSender, isGroupAdmin, isBotAdmin, isOwner } = require('../../lib/permissions');

module.exports = {
  name: 'setdesc',
  description: 'Set group description (admin only)',
  usage: '.setdesc <new description>',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!isGroup(jid)) {
      return sock.sendMessage(jid, { text: 'This command can only be used in groups.' }, { quoted: msg });
    }
    if (!isOwner(sock, msg) && !(await isGroupAdmin(sock, jid, getSender(msg)))) {
      return sock.sendMessage(jid, { text: 'Only admins can use this command.' }, { quoted: msg });
    }
    if (!(await isBotAdmin(sock, jid))) {
      return sock.sendMessage(jid, { text: 'I need to be an admin to change the description.' }, { quoted: msg });
    }

    const desc = args.join(' ').trim();
    if (!desc) {
      return sock.sendMessage(jid, { text: 'Please provide a new group description.' }, { quoted: msg });
    }

    try {
      await sock.groupUpdateDescription(jid, desc);
      await sock.sendMessage(jid, { text: 'Group description updated.' }, { quoted: msg });
    } catch (error) {
      await sock.sendMessage(jid, { text: `Failed to update description: ${error.message}` }, { quoted: msg });
    }
  }
};
