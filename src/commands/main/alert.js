const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../../alerts.json');
function load() { if (!fs.existsSync(dbPath)) return {}; return JSON.parse(fs.readFileSync(dbPath)); }
function save(data) { fs.writeFileSync(dbPath, JSON.stringify(data, null, 2)); }

module.exports = {
  name: 'alert',
  description: 'Set price alerts: .alert <symbol> <price>, .alert list, .alert remove <symbol>',
  usage: '.alert <symbol> <price> | .alert list | .alert remove <symbol>',
  async execute(sock, msg, args) {
    const user = msg.key.participant || msg.key.remoteJid;
    const db = load();
    const cmd = args[0]?.toLowerCase();
    if (cmd === 'list') {
      const alerts = db[user] || [];
      if (!alerts.length) return sock.sendMessage(msg.key.remoteJid, { text: 'No alerts set.' }, { quoted: msg });
      let text = '*Your Alerts:*\n';
      alerts.forEach(a => { text += `- ${a.symbol.toUpperCase()} at $${a.price}\n`; });
      return sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
    }
    if (cmd === 'remove') {
      const symbol = args[1]?.toLowerCase();
      if (!symbol) return sock.sendMessage(msg.key.remoteJid, { text: 'Usage: .alert remove <symbol>' }, { quoted: msg });
      db[user] = (db[user] || []).filter(a => a.symbol !== symbol);
      save(db);
      return sock.sendMessage(msg.key.remoteJid, { text: `Alert for ${symbol.toUpperCase()} removed.` }, { quoted: msg });
    }
    // Add alert
    const symbol = args[0]?.toLowerCase();
    const price = parseFloat(args[1]);
    if (!symbol || isNaN(price)) return sock.sendMessage(msg.key.remoteJid, { text: 'Usage: .alert <symbol> <price>' }, { quoted: msg });
    db[user] = db[user] || [];
    db[user].push({ symbol, price });
    save(db);
    return sock.sendMessage(msg.key.remoteJid, { text: `Alert set for ${symbol.toUpperCase()} at $${price}` }, { quoted: msg });
  },
}; 