const { isAdmin } = require('./utils');

module.exports = {
  name: 'demote',
  description: 'Demote an admin to member (admin only)',
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
      return sock.sendMessage(jid, { text: 'Tag or reply to the user you want to demote.' }, { quoted: msg });
    }
    try {
      await sock.groupParticipantsUpdate(jid, [target], 'demote');
      await sock.sendMessage(jid, { text: `Demoted @${target.split('@')[0]} to member.`, mentions: [target] }, { quoted: msg });
    } catch (e) {
      console.error('Demote error:', e);
      await sock.sendMessage(jid, { text: 'Failed to demote: ' + (e.message || e.toString()), mentions: [target] }, { quoted: msg });
    }
  },
}; 