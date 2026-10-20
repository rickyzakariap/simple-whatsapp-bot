const { isGroup, getSender, isGroupAdmin, isOwner } = require('../../lib/permissions');
const { removeTrigger } = require('../../lib/autoresponder');

module.exports = {
  name: 'deltrigger',
  description: 'Delete an auto-reply trigger (group admin only)',
  usage: '.deltrigger <trigger>',
  async execute(sock, msg, args) {
    const chatId = msg.key.remoteJid;
    try {
      if (!isGroup(chatId)) {
        return sock.sendMessage(chatId, { text: 'This command can only be used in groups.' }, { quoted: msg });
      }
      if (!isOwner(sock, msg) && !(await isGroupAdmin(sock, chatId, getSender(msg)))) {
        return sock.sendMessage(chatId, { text: 'Only admins can use this command.' }, { quoted: msg });
      }
      const trigger = args.join(' ').trim().toLowerCase();
      if (!trigger) {
        return sock.sendMessage(chatId, { text: 'Usage: .deltrigger <trigger>' }, { quoted: msg });
      }
      const removed = await removeTrigger(chatId, trigger);
      return sock.sendMessage(chatId, {
        text: removed ? `✅ Trigger "${trigger}" deleted.` : `❌ Trigger "${trigger}" not found.`
      }, { quoted: msg });
    } catch (error) {
      console.error('Deltrigger command error:', error);
      return sock.sendMessage(chatId, { text: '❌ Failed to delete trigger.' }, { quoted: msg });
    }
  }
};
