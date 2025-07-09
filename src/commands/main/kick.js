const { isAdmin } = require('./utils');

module.exports = {
  name: 'kick',
  description: 'Remove a member from the group (admin only)',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.participant;
    if (!jid.endsWith('@g.us')) {
      return sock.sendMessage(jid, { text: 'This command can only be used in groups.' }, { quoted: msg });
    }
    if (!(await isAdmin(sock, jid, sender))) {
      return sock.sendMessage(jid, { text: 'Only admins can use this command.' }, { quoted: msg });
    }
    // Support both reply and mention
    let target = args[0];
    if (msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
      target = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
    } else if (msg.message.extendedTextMessage?.contextInfo?.participant) {
      target = msg.message.extendedTextMessage.contextInfo.participant;
    }
    if (!target) {
      return sock.sendMessage(jid, { text: 'Tag or reply to the user you want to kick.' }, { quoted: msg });
    }
    try {
      await sock.groupParticipantsUpdate(jid, [target], 'remove');
      await sock.sendMessage(jid, { text: `Removed @${target.split('@')[0]}`, mentions: [target] }, { quoted: msg });
    } catch (error) {
      await sock.sendMessage(jid, { text: 'An error occurred while removing the member from the group.' }, { quoted: msg });
    }
  },
};