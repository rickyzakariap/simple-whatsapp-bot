const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../../../points.json');

function load() {
  try {
    if (!fs.existsSync(dbPath)) return {};
    return JSON.parse(fs.readFileSync(dbPath));
  } catch (error) {
    console.error('Error loading points database:', error);
    return {};
  }
}

function save(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving points database:', error);
  }
}

function addPoint(jid, user, amount = 1) {
  try {
    const db = load();
    if (!db[jid]) db[jid] = {};
    if (!db[jid][user]) db[jid][user] = 0;
    db[jid][user] += amount;
    save(db);
  } catch (error) {
    console.error('Error adding point:', error);
  }
}

function getPoint(jid, user) {
  try {
    const db = load();
    return db[jid]?.[user] || 0;
  } catch (error) {
    console.error('Error getting point:', error);
    return 0;
  }
}

function getLeaderboard(jid, top = 10) {
  try {
    const db = load();
    if (!db[jid]) return [];
    return Object.entries(db[jid])
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
  usage: '.points [@user]',
  async execute(sock, msg, args) {
    try {
      const id = msg.key.remoteJid;
      let target = args[0]?.replace(/[^0-9@]/g, '');
      if (!target) target = msg.key.participant || msg.key.remoteJid;
      
      if (args[0] === 'top' || args[0] === 'leaderboard') {
        const top = getLeaderboard(id, 10);
        if (!top.length) return sock.sendMessage(id, { text: 'Belum ada poin di grup ini.' }, { quoted: msg });
        let text = `*🏆 Leaderboard Grup:*\n`;
        top.forEach(([user, point], i) => {
          text += `${i + 1}. @${user.split('@')[0]}: ${point} poin\n`;
        });
        return sock.sendMessage(id, { text, mentions: top.map(([u]) => u) }, { quoted: msg });
      } else {
        const point = getPoint(id, target);
        return sock.sendMessage(id, { text: `Poin @${target.split('@')[0]}: ${point}` , mentions: [target]}, { quoted: msg });
      }
    } catch (error) {
      console.error('Points command error:', error);
      return sock.sendMessage(msg.key.remoteJid, { text: '❌ Error: Failed to process points command.' }, { quoted: msg });
    }
  }
}; 