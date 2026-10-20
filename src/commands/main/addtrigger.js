const { isGroup, getSender, isGroupAdmin, isOwner } = require('../../lib/permissions');
const { getQuotedMessage, getMessageType } = require('../../lib/message');
const { saveMedia, setTrigger } = require('../../lib/autoresponder');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

const MAX_TRIGGER_MEDIA = 25 * 1024 * 1024;

function mediaKind(type) {
  if (type === 'stickerMessage') return 'sticker';
  if (type === 'imageMessage') return 'image';
  if (type === 'videoMessage') return 'video';
  if (type === 'audioMessage') return 'audio';
  return null;
}

module.exports = {
  name: 'addtrigger',
  description: 'Add an auto-reply trigger (group admin only)',
  usage: '.addtrigger <trigger>|<response> OR reply to media with .addtrigger <trigger>',
  async execute(sock, msg, args) {
    const chatId = msg.key.remoteJid;
    try {
      if (!isGroup(chatId)) {
        return sock.sendMessage(chatId, { text: 'This command can only be used in groups.' }, { quoted: msg });
      }
      if (!isOwner(sock, msg) && !(await isGroupAdmin(sock, chatId, getSender(msg)))) {
        return sock.sendMessage(chatId, { text: 'Only admins can use this command.' }, { quoted: msg });
      }
      if (!args.length) {
        return sock.sendMessage(chatId, {
          text: 'Usage: .addtrigger <trigger>|<response>\nOr reply to media with: .addtrigger <trigger>'
        }, { quoted: msg });
      }

      const trigger = args.join(' ').trim().toLowerCase();
      if (trigger.length < 1 || trigger.length > 100) {
        return sock.sendMessage(chatId, { text: 'Trigger must be 1-100 characters long.' }, { quoted: msg });
      }

      const quoted = getQuotedMessage(msg);
      if (quoted) {
        const type = getMessageType(quoted.message);
        if (['conversation', 'extendedTextMessage'].includes(type) || !type) {
          const response = `FORWARD:${JSON.stringify({ message: quoted.message })}`;
          await setTrigger(chatId, trigger, response);
          return sock.sendMessage(chatId, {
            text: `✅ Text forward trigger added.\nTrigger: "${trigger}"`
          }, { quoted: msg });
        }

        const kind = mediaKind(type);
        if (!kind) {
          return sock.sendMessage(chatId, { text: 'Unsupported media type for a trigger.' }, { quoted: msg });
        }

        const buffer = await downloadMediaMessage(
          { key: quoted.key, message: quoted.message },
          'buffer',
          {},
          sock
        );
        if (!buffer || buffer.length === 0) {
          throw new Error('Downloaded media is empty');
        }
        if (buffer.length > MAX_TRIGGER_MEDIA) {
          return sock.sendMessage(chatId, {
            text: `Media too large for a trigger (max ${MAX_TRIGGER_MEDIA / 1024 / 1024}MB).`
          }, { quoted: msg });
        }

        const response = await saveMedia(buffer, kind);
        await setTrigger(chatId, trigger, response);
        return sock.sendMessage(chatId, {
          text: `✅ Media trigger added.\nTrigger: "${trigger}"\nType: ${kind}`
        }, { quoted: msg });
      }

      const [rawTrigger, ...responseParts] = args.join(' ').split('|');
      const response = responseParts.join('|').trim();
      const triggerText = rawTrigger?.trim().toLowerCase();
      if (!triggerText || !response) {
        return sock.sendMessage(chatId, {
          text: 'Usage: .addtrigger <trigger>|<response>\nExample: .addtrigger hello|Hello! How can I help?'
        }, { quoted: msg });
      }
      if (triggerText.length > 100) {
        return sock.sendMessage(chatId, { text: 'Trigger must be 1-100 characters long.' }, { quoted: msg });
      }
      if (response.length > 1000) {
        return sock.sendMessage(chatId, { text: 'Response must be 1-1000 characters long.' }, { quoted: msg });
      }

      await setTrigger(chatId, triggerText, response);
      return sock.sendMessage(chatId, {
        text: `✅ Trigger added.\nTrigger: "${triggerText}"\nResponse: "${response}"`
      }, { quoted: msg });
    } catch (error) {
      console.error('Addtrigger command error:', error);
      return sock.sendMessage(chatId, { text: `❌ Failed to add trigger: ${error.message}` }, { quoted: msg });
    }
  }
};
