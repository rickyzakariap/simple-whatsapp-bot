const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../../welcome.json');
function load() { if (!fs.existsSync(dbPath)) return {}; return JSON.parse(fs.readFileSync(dbPath)); }
function save(data) { fs.writeFileSync(dbPath, JSON.stringify(data, null, 2)); }

module.exports = {
  name: 'welcome',
  description: 'Show or set custom welcome/goodbye messages (admin only)',
  usage: '.setwelcome <msg> | .setgoodbye <msg> | .welcome | .goodbye',
  async execute(sock, msg, args) {
    const id = msg.key.remoteJid;
    const isAdmin = msg.participant || msg.key.participant;
    const db = load();
    const cmd = args[0]?.toLowerCase();
    if (cmd === 'setwelcome') {
      if (!isAdmin) return sock.sendMessage(id, { text: 'Admin only.' }, { quoted: msg });
      db[id] = db[id] || {};
      db[id].welcome = args.slice(1).join(' ');
      save(db);
      return sock.sendMessage(id, { text: 'Welcome message set.' }, { quoted: msg });
    }
    if (cmd === 'setgoodbye') {
      if (!isAdmin) return sock.sendMessage(id, { text: 'Admin only.' }, { quoted: msg });
      db[id] = db[id] || {};
      db[id].goodbye = args.slice(1).join(' ');
      save(db);
      return sock.sendMessage(id, { text: 'Goodbye message set.' }, { quoted: msg });
    }
    if (cmd === 'goodbye') {
      return sock.sendMessage(id, { text: db[id]?.goodbye || 'No goodbye message set.' }, { quoted: msg });
    }
    // Default: show welcome
    return sock.sendMessage(id, { text: db[id]?.welcome || 'No welcome message set.' }, { quoted: msg });
  },
  getWelcome(id) { const db = load(); return db[id]?.welcome; },
  getGoodbye(id) { const db = load(); return db[id]?.goodbye; }
}; 