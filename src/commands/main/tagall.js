module.exports = {
  name: 'tagall',
  description: 'Mention all group members (admin only)',
  async execute(sock, msg, args) {
    if (!msg.key.remoteJid.endsWith('@g.us')) {
      return sock.sendMessage(msg.key.remoteJid, { text: 'This command can only be used in groups.' }, { quoted: msg });
    }
    const metadata = await sock.groupMetadata(msg.key.remoteJid);
    const members = metadata.participants.map(p => p.id);
    const text = args.length ? args.join(' ') : 'Tagging all members:';
    await sock.sendMessage(msg.key.remoteJid, { text, mentions: members }, { quoted: msg });
  },
}; 