const { isAdmin } = require('./utils');

function formatJid(input) {
  if (!input) return null;
  if (input.endsWith('@s.whatsapp.net') || input.endsWith('@g.us')) return input;
  // Remove non-digit characters and format as JID
  const num = input.replace(/[^0-9]/g, '');
  if (num.length > 5) return num + '@s.whatsapp.net';
  return null;
}

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
      return sock.sendMessage(jid, { text: 'Only group admins can use this command.' }, { quoted: msg });
    }
    // Check if bot is admin
    const botId = (await sock.user.id) || (sock.user && sock.user.id);
    if (!(await isAdmin(sock, jid, botId))) {
      return sock.sendMessage(jid, { text: 'I need to be an admin to demote members.' }, { quoted: msg });
    }
    // Support reply, mention, or phone number
    let target = args[0];
    if (msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
      target = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
    } else if (msg.message.extendedTextMessage?.contextInfo?.participant) {
      target = msg.message.extendedTextMessage.contextInfo.participant;
    } else {
      target = formatJid(target);
    }
    if (!target) {
      return sock.sendMessage(jid, { text: 'Tag, reply, or provide the phone number of the user you want to demote.' }, { quoted: msg });
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