const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../../autoresponder.json');
function load() { if (!fs.existsSync(dbPath)) return {}; return JSON.parse(fs.readFileSync(dbPath)); }
function save(data) { fs.writeFileSync(dbPath, JSON.stringify(data, null, 2)); }

module.exports = {
  name: 'autoresponder',
  description: 'Set custom auto-reply triggers (admin only)',
  usage: '.addtrigger <trigger>|<response> | .deltrigger <trigger> | .listtriggers',
  async execute(sock, msg, args) {
    const id = msg.key.remoteJid;
    const isAdmin = msg.participant || msg.key.participant;
    const db = load();
    const cmd = args[0]?.toLowerCase();
    if (cmd === 'addtrigger') {
      if (!isAdmin) return sock.sendMessage(id, { text: 'Admin only.' }, { quoted: msg });
      const [trigger, ...respArr] = args.slice(1).join(' ').split('|');
      if (!trigger || !respArr.length) return sock.sendMessage(id, { text: 'Usage: .addtrigger <trigger>|<response>' }, { quoted: msg });
      db[id] = db[id] || {};
      db[id][trigger.toLowerCase()] = respArr.join('|').trim();
      save(db);
      return sock.sendMessage(id, { text: 'Trigger added.' }, { quoted: msg });
    }
    if (cmd === 'deltrigger') {
      if (!isAdmin) return sock.sendMessage(id, { text: 'Admin only.' }, { quoted: msg });
      const trigger = args.slice(1).join(' ').toLowerCase();
      if (!db[id] || !db[id][trigger]) return sock.sendMessage(id, { text: 'Trigger not found.' }, { quoted: msg });
      delete db[id][trigger];
      save(db);
      return sock.sendMessage(id, { text: 'Trigger deleted.' }, { quoted: msg });
    }
    if (cmd === 'listtriggers') {
      if (!db[id] || !Object.keys(db[id]).length) return sock.sendMessage(id, { text: 'No triggers set.' }, { quoted: msg });
      let text = '*Auto-Responder Triggers:*\n';
      Object.entries(db[id]).forEach(([k, v], i) => { text += `${i + 1}. "${k}" → "${v}"\n`; });
      return sock.sendMessage(id, { text }, { quoted: msg });
    }
    return sock.sendMessage(id, { text: 'Usage: .addtrigger <trigger>|<response> | .deltrigger <trigger> | .listtriggers' }, { quoted: msg });
  },
  getTriggers(id) { const db = load(); return db[id] || {}; }
}; 