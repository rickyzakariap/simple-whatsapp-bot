const { isGroup, getSender, isGroupAdmin, isOwner } = require('../../lib/permissions');

module.exports = {
  name: 'tagall',
  description: 'Mention all group members (admin only)',
  usage: '.tagall [message]',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!isGroup(jid)) {
      return sock.sendMessage(jid, { text: 'This command can only be used in groups.' }, { quoted: msg });
    }
    if (!isOwner(sock, msg) && !(await isGroupAdmin(sock, jid, getSender(msg)))) {
      return sock.sendMessage(jid, { text: 'Only admins can use this command.' }, { quoted: msg });
    }

    try {
      const metadata = await sock.groupMetadata(jid);
      const members = metadata.participants.map(participant => participant.id).filter(Boolean);
      const text = args.length ? args.join(' ') : 'Tagging all members:';
      await sock.sendMessage(jid, { text, mentions: members }, { quoted: msg });
    } catch (error) {
      await sock.sendMessage(jid, { text: `Failed to tag members: ${error.message}` }, { quoted: msg });
    }
  }
};
