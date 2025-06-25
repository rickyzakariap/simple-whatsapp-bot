const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../../schedules.json');
function load() { if (!fs.existsSync(dbPath)) return {}; return JSON.parse(fs.readFileSync(dbPath)); }
function save(data) { fs.writeFileSync(dbPath, JSON.stringify(data, null, 2)); }

module.exports = {
  name: 'schedule',
  description: 'Schedule messages: .schedule <HH:MM> <message>, .schedule list, .schedule remove <id>',
  usage: '.schedule <HH:MM> <message> | .schedule list | .schedule remove <id>',
  async execute(sock, msg, args) {
    const id = msg.key.remoteJid;
    const db = load();
    const cmd = args[0]?.toLowerCase();
    if (cmd === 'list') {
      const list = db[id] || [];
      if (!list.length) return sock.sendMessage(id, { text: 'No scheduled messages.' }, { quoted: msg });
      let text = '*Scheduled Messages:*\n';
      list.forEach((s, i) => { text += `${i + 1}. ${s.time} - ${s.message}\n`; });
      return sock.sendMessage(id, { text }, { quoted: msg });
    }
    if (cmd === 'remove') {
      const idx = parseInt(args[1]) - 1;
      if (isNaN(idx)) return sock.sendMessage(id, { text: 'Usage: .schedule remove <id>' }, { quoted: msg });
      db[id] = (db[id] || []).filter((_, i) => i !== idx);
      save(db);
      return sock.sendMessage(id, { text: 'Schedule removed.' }, { quoted: msg });
    }
    // Add schedule
    const time = args[0];
    const message = args.slice(1).join(' ');
    if (!/^\d{2}:\d{2}$/.test(time) || !message) return sock.sendMessage(id, { text: 'Usage: .schedule <HH:MM> <message>' }, { quoted: msg });
    db[id] = db[id] || [];
    db[id].push({ time, message });
    save(db);
    return sock.sendMessage(id, { text: `Scheduled message set for ${time}.` }, { quoted: msg });
  },
}; 