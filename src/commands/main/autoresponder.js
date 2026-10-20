const { isGroup, getSender, isGroupAdmin, isOwner } = require('../../lib/permissions');
const store = require('../../lib/autoresponder');

async function canManage(sock, msg, chatId) {
  return isGroup(chatId) && (isOwner(sock, msg) || await isGroupAdmin(sock, chatId, getSender(msg)));
}

module.exports = {
  name: 'autoresponder',
  description: 'Manage auto-reply triggers (group admin only)',
  usage: '.autoresponder add <trigger>|<response> | .autoresponder remove <trigger> | .autoresponder list',
  async execute(sock, msg, args) {
    const chatId = msg.key.remoteJid;
    if (!(await canManage(sock, msg, chatId))) {
      return sock.sendMessage(chatId, { text: 'Only group admins can use this command.' }, { quoted: msg });
    }

    const cmd = args[0]?.toLowerCase();
    if (cmd === 'add') {
      const [trigger, ...responseParts] = args.slice(1).join(' ').split('|');
      const response = responseParts.join('|').trim();
      if (!trigger || !response) {
        return sock.sendMessage(chatId, { text: 'Usage: .autoresponder add <trigger>|<response>' }, { quoted: msg });
      }
      await store.setTrigger(chatId, trigger.trim().toLowerCase(), response);
      return sock.sendMessage(chatId, { text: 'Trigger added.' }, { quoted: msg });
    }

    if (cmd === 'remove' || cmd === 'delete') {
      const trigger = args.slice(1).join(' ').trim().toLowerCase();
      if (!trigger) {
        return sock.sendMessage(chatId, { text: 'Usage: .autoresponder remove <trigger>' }, { quoted: msg });
      }
      const removed = await store.removeTrigger(chatId, trigger);
      return sock.sendMessage(chatId, {
        text: removed ? 'Trigger deleted.' : 'Trigger not found.'
      }, { quoted: msg });
    }

    const triggers = await store.getTriggers(chatId);
    if (!Object.keys(triggers).length) {
      return sock.sendMessage(chatId, { text: 'No triggers set in this chat.' }, { quoted: msg });
    }

    let text = '*Auto-Responder Triggers:*\n';
    Object.entries(triggers).forEach(([trigger, response], index) => {
      text += `${index + 1}. "${trigger}" → "${store.describeResponse(response)}"\n`;
    });
    return sock.sendMessage(chatId, { text }, { quoted: msg });
  },
  getTriggers: store.getTriggers
};
