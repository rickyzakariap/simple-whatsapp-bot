const database = require('../../lib/database');
const config = require('../../../config');
const { isGroup, getSender, isGroupAdmin, isOwner } = require('../../lib/permissions');
const { getDateParts } = require('../../lib/time');

module.exports = {
  name: 'schedule',
  description: 'Schedule a daily message (group admins only in groups)',
  usage: '.schedule <HH:MM> <message> | .schedule list | .schedule remove <id>',
  async execute(sock, msg, args) {
    try {
      const chatId = msg.key.remoteJid;
      if (isGroup(chatId) && !isOwner(sock, msg) && !(await isGroupAdmin(sock, chatId, getSender(msg)))) {
        return sock.sendMessage(chatId, { text: 'Only admins can schedule messages in this group.' }, { quoted: msg });
      }

      const db = await database.load('schedules');
      const cmd = args[0]?.toLowerCase();

      if (cmd === 'list') {
        const list = db[chatId] || [];
        if (!list.length) {
          return sock.sendMessage(chatId, { text: 'No scheduled messages.' }, { quoted: msg });
        }
        let text = `*Scheduled Messages* (${config.timezone}):\n`;
        list.forEach((schedule, index) => {
          text += `${index + 1}. [${schedule.id || index + 1}] ${schedule.time} - ${schedule.message}\n`;
        });
        return sock.sendMessage(chatId, { text }, { quoted: msg });
      }

      if (cmd === 'remove') {
        const list = db[chatId] || [];
        const identifier = args[1];
        if (!identifier) {
          return sock.sendMessage(chatId, { text: 'Usage: .schedule remove <id>' }, { quoted: msg });
        }

        const index = list.findIndex(schedule => schedule.id === identifier);
        const fallbackIndex = Number(identifier) - 1;
        const removeIndex = index >= 0 ? index : fallbackIndex;
        if (!Number.isInteger(removeIndex) || removeIndex < 0 || removeIndex >= list.length) {
          return sock.sendMessage(chatId, { text: 'Invalid schedule ID.' }, { quoted: msg });
        }

        list.splice(removeIndex, 1);
        if (list.length) db[chatId] = list;
        else delete db[chatId];
        database.save('schedules', db);
        return sock.sendMessage(chatId, { text: 'Schedule removed.' }, { quoted: msg });
      }

      const time = args[0];
      const message = args.slice(1).join(' ').trim();
      if (!/^\d{2}:\d{2}$/.test(time || '') || !message) {
        return sock.sendMessage(chatId, {
          text: 'Usage: .schedule <HH:MM> <message>\nExample: .schedule 08:00 Selamat pagi!'
        }, { quoted: msg });
      }

      const [hours, minutes] = time.split(':').map(Number);
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return sock.sendMessage(chatId, { text: 'Invalid time. Use HH:MM (00:00-23:59).' }, { quoted: msg });
      }
      if (message.length > config.validation.maxMessageLength) {
        return sock.sendMessage(chatId, {
          text: `Message too long. Maximum ${config.validation.maxMessageLength} characters.`
        }, { quoted: msg });
      }

      db[chatId] = db[chatId] || [];
      db[chatId].push({
        id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        time,
        message,
        lastSent: null
      });
      database.save('schedules', db);

      const now = getDateParts(new Date(), config.timezone);
      return sock.sendMessage(chatId, {
        text: `Scheduled message set for ${time} (${config.timezone}).\nCurrent local time: ${now.hhmm}`
      }, { quoted: msg });
    } catch (error) {
      console.error('Schedule command error:', error);
      return sock.sendMessage(msg.key.remoteJid, { text: '❌ Error: Failed to process schedule command.' }, { quoted: msg });
    }
  }
};
