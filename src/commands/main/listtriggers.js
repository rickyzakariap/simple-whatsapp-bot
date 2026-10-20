const { isGroup, getSender, isGroupAdmin, isOwner } = require('../../lib/permissions');
const { getTriggers, describeResponse } = require('../../lib/autoresponder');

module.exports = {
  name: 'listtriggers',
  description: 'List auto-reply triggers (group admin only)',
  usage: '.listtriggers',
  async execute(sock, msg, args) {
    const chatId = msg.key.remoteJid;
    try {
      if (!isGroup(chatId)) {
        return sock.sendMessage(chatId, { text: 'This command can only be used in groups.' }, { quoted: msg });
      }
      if (!isOwner(sock, msg) && !(await isGroupAdmin(sock, chatId, getSender(msg)))) {
        return sock.sendMessage(chatId, { text: 'Only admins can use this command.' }, { quoted: msg });
      }

      const triggers = await getTriggers(chatId);
      const entries = Object.entries(triggers);
      if (!entries.length) {
        return sock.sendMessage(chatId, {
          text: '📝 No triggers found for this group.\nUse .addtrigger to add one.'
        }, { quoted: msg });
      }

      const text = entries
        .map(([trigger, response], index) => `${index + 1}. "${trigger}" → "${describeResponse(response)}"`)
        .join('\n');

      return sock.sendMessage(chatId, {
        text: `📝 Auto-reply triggers:\n\n${text}\n\nTotal: ${entries.length}`
      }, { quoted: msg });
    } catch (error) {
      console.error('Listtriggers command error:', error);
      return sock.sendMessage(chatId, { text: '❌ Failed to list triggers.' }, { quoted: msg });
    }
  }
};
