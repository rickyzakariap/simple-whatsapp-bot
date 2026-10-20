const database = require('../../lib/database');
const config = require('../../../config');
const { isGroup, getSender, isGroupAdmin, isOwner } = require('../../lib/permissions');

async function canManage(sock, msg, chatId) {
  return isGroup(chatId) && (isOwner(sock, msg) || await isGroupAdmin(sock, chatId, getSender(msg)));
}

async function setWelcome(chatId, message) {
  const db = await database.load('welcome');
  db[chatId] = db[chatId] || {};
  db[chatId].welcome = message;
  database.save('welcome', db);
}

async function setGoodbye(chatId, message) {
  const db = await database.load('welcome');
  db[chatId] = db[chatId] || {};
  db[chatId].goodbye = message;
  database.save('welcome', db);
}

async function getWelcome(chatId) {
  const db = await database.load('welcome');
  return db[chatId]?.welcome || null;
}

async function getGoodbye(chatId) {
  const db = await database.load('welcome');
  return db[chatId]?.goodbye || null;
}

module.exports = {
  name: 'welcome',
  description: 'Show or set welcome/goodbye messages (group admin only)',
  usage: '.welcome | .welcome goodbye | .setwelcome <message> | .setgoodbye <message>',
  getWelcome,
  getGoodbye,
  setWelcome,
  setGoodbye,
  async execute(sock, msg, args) {
    const chatId = msg.key.remoteJid;
    try {
      if (!isGroup(chatId)) {
        return sock.sendMessage(chatId, { text: 'This command can only be used in groups.' }, { quoted: msg });
      }

      const cmd = args[0]?.toLowerCase();
      const isSetCommand = ['setwelcome', 'setgoodbye'].includes(cmd);
      if (isSetCommand) {
        if (!(await canManage(sock, msg, chatId))) {
          return sock.sendMessage(chatId, { text: 'Only admins can use this command.' }, { quoted: msg });
        }

        const message = args.slice(1).join(' ').trim();
        if (!message) {
          return sock.sendMessage(chatId, { text: `Usage: .${cmd} <message>` }, { quoted: msg });
        }
        if (message.length > config.validation.maxMessageLength) {
          return sock.sendMessage(chatId, {
            text: `Message too long. Maximum ${config.validation.maxMessageLength} characters.`
          }, { quoted: msg });
        }

        if (cmd === 'setwelcome') {
          await setWelcome(chatId, message);
          return sock.sendMessage(chatId, { text: 'Welcome message set.' }, { quoted: msg });
        }
        await setGoodbye(chatId, message);
        return sock.sendMessage(chatId, { text: 'Goodbye message set.' }, { quoted: msg });
      }

      const type = cmd === 'goodbye' || cmd === 'setgoodbye' ? 'goodbye' : 'welcome';
      const message = type === 'goodbye' ? await getGoodbye(chatId) : await getWelcome(chatId);
      return sock.sendMessage(chatId, {
        text: message || `No ${type} message set.`
      }, { quoted: msg });
    } catch (error) {
      console.error('Welcome command error:', error);
      return sock.sendMessage(msg.key.remoteJid, { text: '❌ Failed to process welcome command.' }, { quoted: msg });
    }
  }
};
