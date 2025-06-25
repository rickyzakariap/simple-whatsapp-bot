const config = require('../../../config');

module.exports = {
  name: 'broadcast',
  description: 'Broadcast a message to all chats (owner only)',
  async execute(sock, msg, args) {
    if (!msg.key.fromMe && msg.key.participant !== `${config.ownerNumber}@s.whatsapp.net`) {
      return sock.sendMessage(msg.key.remoteJid, { text: 'Owner only command.' }, { quoted: msg });
    }
    if (!args.length) return sock.sendMessage(msg.key.remoteJid, { text: 'Please provide a message to broadcast.' }, { quoted: msg });
    const text = args.join(' ');
    const chats = await sock.groupFetchAllParticipating();
    for (const jid of Object.keys(chats)) {
      await sock.sendMessage(jid, { text: `[Broadcast]\n${text}` });
    }
    await sock.sendMessage(msg.key.remoteJid, { text: 'Broadcast sent.' }, { quoted: msg });
  },
}; 