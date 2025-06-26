const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../../../alerts.json');

function load() { 
  try {
    if (!fs.existsSync(dbPath)) return {}; 
    return JSON.parse(fs.readFileSync(dbPath));
  } catch (error) {
    console.error('Error loading alerts database:', error);
    return {};
  }
}

function save(data) { 
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving alerts database:', error);
  }
}

module.exports = {
  name: 'alert',
  description: 'Set price alerts: .alert <symbol> <price>, .alert list, .alert remove <symbol>',
  usage: '.alert <symbol> <price> | .alert list | .alert remove <symbol>',
  async execute(sock, msg, args) {
    try {
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
      
      // Input validation
      if (!symbol || isNaN(price) || price <= 0) {
        return sock.sendMessage(msg.key.remoteJid, { text: 'Usage: .alert <symbol> <price> (price must be positive)' }, { quoted: msg });
      }
      
      // Check if symbol is valid (basic validation)
      if (symbol.length < 1 || symbol.length > 10) {
        return sock.sendMessage(msg.key.remoteJid, { text: 'Invalid symbol. Symbol must be 1-10 characters.' }, { quoted: msg });
      }
      
      db[user] = db[user] || [];
      db[user].push({ symbol, price });
      save(db);
      return sock.sendMessage(msg.key.remoteJid, { text: `Alert set for ${symbol.toUpperCase()} at $${price}` }, { quoted: msg });
    } catch (error) {
      console.error('Alert command error:', error);
      return sock.sendMessage(msg.key.remoteJid, { text: '❌ Error: Failed to process alert command.' }, { quoted: msg });
    }
  },
}; 