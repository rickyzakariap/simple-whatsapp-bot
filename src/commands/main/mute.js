module.exports = {
  name: 'mute',
  description: 'Mute group (admin only)',
  async execute(sock, msg, args) {
    if (!msg.key.remoteJid.endsWith('@g.us')) {
      return sock.sendMessage(msg.key.remoteJid, { text: 'This command can only be used in groups.' }, { quoted: msg });
    }
    try {
      await sock.groupSettingUpdate(msg.key.remoteJid, 'announcement');
      await sock.sendMessage(msg.key.remoteJid, { text: 'Group muted (only admins can send messages).' }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(msg.key.remoteJid, { text: 'Failed to mute group: ' + e.message }, { quoted: msg });
    }
  },
}; 