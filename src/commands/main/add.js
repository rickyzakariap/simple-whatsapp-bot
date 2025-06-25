module.exports = {
  name: 'add',
  description: 'Add a member to the group (admin only)',
  async execute(sock, msg, args) {
    if (!msg.key.participant || !msg.key.remoteJid.endsWith('@g.us')) {
      return sock.sendMessage(msg.key.remoteJid, { text: 'This command can only be used in groups.' }, { quoted: msg });
    }
    if (!args[0]) return sock.sendMessage(msg.key.remoteJid, { text: 'Please provide a phone number to add.' }, { quoted: msg });
    const number = args[0].replace(/[^0-9]/g, '');
    try {
      await sock.groupAdd(msg.key.remoteJid, [`${number}@s.whatsapp.net`]);
      await sock.sendMessage(msg.key.remoteJid, { text: `Added @${number}` }, { quoted: msg, mentions: [`${number}@s.whatsapp.net`] });
    } catch (e) {
      await sock.sendMessage(msg.key.remoteJid, { text: 'Failed to add member: ' + e.message }, { quoted: msg });
    }
  },
}; 