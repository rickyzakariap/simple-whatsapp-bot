const database = require('../../lib/database');
const { normalizeJid, getSender, getTargetJid } = require('../../lib/permissions');

function key(jid) {
  return normalizeJid(jid) || String(jid || '');
}

async function addPoint(jid, user, amount = 1) {
  const chatId = key(jid);
  const userId = key(user);
  if (!chatId || !userId || !Number.isFinite(amount) || amount === 0) return;

  try {
    const db = await database.load('points');
    db[chatId] = db[chatId] || {};
    db[chatId][userId] = (db[chatId][userId] || 0) + amount;
    database.save('points', db);
  } catch (error) {
    console.error('Error adding point:', error);
  }
}

async function getPoint(jid, user) {
  try {
    const db = await database.load('points');
    return db[key(jid)]?.[key(user)] || 0;
  } catch (error) {
    console.error('Error getting point:', error);
    return 0;
  }
}

async function getLeaderboard(jid, top = 10) {
  try {
    const db = await database.load('points');
    if (!db[key(jid)]) return [];
    return Object.entries(db[key(jid)])
      .sort((a, b) => b[1] - a[1])
      .slice(0, top);
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return [];
  }
}

module.exports = {
  addPoint,
  getPoint,
  getLeaderboard,
  name: 'points',
  description: 'Cek poin kamu atau leaderboard grup',
  usage: '.points [@user] | .points top',
  async execute(sock, msg, args) {
    try {
      const id = msg.key.remoteJid;

      if (args[0] === 'top' || args[0] === 'leaderboard') {
        const top = await getLeaderboard(id, 10);
        if (!top.length) {
          return sock.sendMessage(id, { text: 'Belum ada poin di grup ini.' }, { quoted: msg });
        }
        let text = '*🏆 Leaderboard Grup:*\n';
        top.forEach(([user, point], index) => {
          text += `${index + 1}. @${user.split('@')[0]}: ${point} poin\n`;
        });
        return sock.sendMessage(id, {
          text,
          mentions: top.map(([user]) => user)
        }, { quoted: msg });
      }

      const target = getTargetJid(msg, args) || getSender(msg) || id;
      const point = await getPoint(id, target);
      return sock.sendMessage(id, {
        text: `Poin @${target.split('@')[0]}: ${point}`,
        mentions: [target]
      }, { quoted: msg });
    } catch (error) {
      console.error('Points command error:', error);
      return sock.sendMessage(msg.key.remoteJid, { text: '❌ Error: Failed to process points command.' }, { quoted: msg });
    }
  }
};
