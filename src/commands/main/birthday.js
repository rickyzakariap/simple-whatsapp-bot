const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../../birthdays.json');
function load() { if (!fs.existsSync(dbPath)) return {}; return JSON.parse(fs.readFileSync(dbPath)); }
function save(data) { fs.writeFileSync(dbPath, JSON.stringify(data, null, 2)); }

module.exports = {
  name: 'birthday',
  description: 'Birthday reminders: .birthday add <MM-DD> | .birthday remove | .birthday list',
  usage: '.birthday add <MM-DD> | .birthday remove | .birthday list',
  async execute(sock, msg, args) {
    const user = msg.key.participant || msg.key.remoteJid;
    const db = load();
    const cmd = args[0]?.toLowerCase();
    if (cmd === 'add') {
      const date = args[1];
      if (!/^\d{2}-\d{2}$/.test(date)) return sock.sendMessage(msg.key.remoteJid, { text: 'Usage: .birthday add <MM-DD>' }, { quoted: msg });
      db[user] = date;
      save(db);
      return sock.sendMessage(msg.key.remoteJid, { text: `Birthday set for ${date}` }, { quoted: msg });
    }
    if (cmd === 'remove') {
      delete db[user];
      save(db);
      return sock.sendMessage(msg.key.remoteJid, { text: 'Birthday removed.' }, { quoted: msg });
    }
    // List all birthdays
    let text = '*Birthdays:*\n';
    Object.entries(db).forEach(([u, d]) => { text += `- @${u.split('@')[0]}: ${d}\n`; });
    await sock.sendMessage(msg.key.remoteJid, { text, mentions: Object.keys(db) }, { quoted: msg });
  },
}; 