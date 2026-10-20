const database = require('../../lib/database');
const { getSender, normalizeJid, isGroup } = require('../../lib/permissions');

function normalizeEntry(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    return { date: value, groups: [], lastSent: null };
  }
  if (typeof value === 'object' && /^\d{2}-\d{2}$/.test(value.date || '')) {
    return {
      date: value.date,
      groups: Array.isArray(value.groups) ? value.groups.map(normalizeJid).filter(Boolean) : [],
      lastSent: value.lastSent || null
    };
  }
  return null;
}

function isValidDate(date) {
  if (!/^\d{2}-\d{2}$/.test(date || '')) return false;
  const [month, day] = date.split('-').map(Number);
  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth[month - 1];
}

module.exports = {
  name: 'birthday',
  description: 'Birthday reminders: .birthday add <MM-DD> | .birthday remove | .birthday list',
  usage: '.birthday add 12-25 | .birthday remove | .birthday list',
  async execute(sock, msg, args) {
    try {
      const chatId = msg.key.remoteJid;
      const sender = normalizeJid(getSender(msg) || chatId);
      const db = await database.load('birthdays');
      const cmd = args[0]?.toLowerCase();

      if (cmd === 'add') {
        const date = args[1];
        if (!isValidDate(date)) {
          return sock.sendMessage(chatId, {
            text: 'Usage: .birthday add <MM-DD>\nExample: .birthday add 12-25'
          }, { quoted: msg });
        }

        const entry = normalizeEntry(db[sender]) || { date, groups: [], lastSent: null };
        entry.date = date;
        entry.lastSent = null;
        if (isGroup(chatId) && !entry.groups.includes(chatId)) {
          entry.groups.push(chatId);
        }
        db[sender] = entry;
        database.save('birthdays', db);

        return sock.sendMessage(chatId, {
          text: `Birthday set for ${date}${isGroup(chatId) ? ' (reminder in this group)' : ''}.`
        }, { quoted: msg });
      }

      if (cmd === 'remove') {
        if (isGroup(chatId)) {
          const entry = normalizeEntry(db[sender]);
          if (entry) {
            entry.groups = entry.groups.filter(group => group !== chatId);
            if (entry.groups.length === 0) {
              delete db[sender];
            } else {
              db[sender] = entry;
            }
            database.save('birthdays', db);
          }
        } else {
          delete db[sender];
          database.save('birthdays', db);
        }
        return sock.sendMessage(chatId, { text: 'Birthday reminder removed.' }, { quoted: msg });
      }

      const entries = Object.entries(db)
        .map(([user, value]) => ({ user: normalizeJid(user), ...normalizeEntry(value) }))
        .filter(entry => entry.date && (isGroup(chatId)
          ? entry.groups.includes(chatId)
          : entry.user === sender));

      if (!entries.length) {
        return sock.sendMessage(chatId, { text: 'Belum ada ulang tahun yang tercatat di sini.' }, { quoted: msg });
      }

      let text = '*Birthdays:*\n';
      entries.forEach(entry => {
        text += `- @${entry.user.split('@')[0]}: ${entry.date}\n`;
      });
      await sock.sendMessage(chatId, {
        text,
        mentions: entries.map(entry => entry.user)
      }, { quoted: msg });
    } catch (error) {
      console.error('Birthday command error:', error);
      return sock.sendMessage(msg.key.remoteJid, { text: '❌ Error: Failed to process birthday command.' }, { quoted: msg });
    }
  }
};
