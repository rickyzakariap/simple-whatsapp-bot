const fs = require('fs');
const path = require('path');
const axios = require('axios');
const dbPath = path.join(__dirname, '../../portfolio.json');
function load() { if (!fs.existsSync(dbPath)) return {}; return JSON.parse(fs.readFileSync(dbPath)); }
function save(data) { fs.writeFileSync(dbPath, JSON.stringify(data, null, 2)); }

module.exports = {
  name: 'portfolio',
  description: 'Track your favorite coins: .portfolio add <symbol>, .portfolio remove <symbol>, .portfolio show',
  usage: '.portfolio add <symbol> | .portfolio remove <symbol> | .portfolio show',
  async execute(sock, msg, args) {
    const user = msg.key.participant || msg.key.remoteJid;
    const db = load();
    const cmd = args[0]?.toLowerCase();
    if (cmd === 'add') {
      const symbol = args[1]?.toLowerCase();
      if (!symbol) return sock.sendMessage(msg.key.remoteJid, { text: 'Usage: .portfolio add <symbol>' }, { quoted: msg });
      db[user] = db[user] || [];
      if (!db[user].includes(symbol)) db[user].push(symbol);
      save(db);
      return sock.sendMessage(msg.key.remoteJid, { text: `Added ${symbol.toUpperCase()} to your portfolio.` }, { quoted: msg });
    }
    if (cmd === 'remove') {
      const symbol = args[1]?.toLowerCase();
      if (!symbol) return sock.sendMessage(msg.key.remoteJid, { text: 'Usage: .portfolio remove <symbol>' }, { quoted: msg });
      db[user] = (db[user] || []).filter(s => s !== symbol);
      save(db);
      return sock.sendMessage(msg.key.remoteJid, { text: `Removed ${symbol.toUpperCase()} from your portfolio.` }, { quoted: msg });
    }
    // Show portfolio
    const list = db[user] || [];
    if (!list.length) return sock.sendMessage(msg.key.remoteJid, { text: 'Your portfolio is empty. Add coins with .portfolio add <symbol>' }, { quoted: msg });
    try {
      const { data } = await axios.get('https://api.coingecko.com/api/v3/coins/markets', { params: { vs_currency: 'usd', ids: '', symbols: list.join(','), order: 'market_cap_desc', per_page: 50, page: 1 } });
      let text = '*Your Portfolio:*\n';
      list.forEach(symbol => {
        const coin = data.find(c => c.symbol.toLowerCase() === symbol);
        if (coin) text += `- ${coin.name} (${coin.symbol.toUpperCase()}): $${coin.current_price}\n`;
        else text += `- ${symbol.toUpperCase()}: Not found\n`;
      });
      await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(msg.key.remoteJid, { text: 'Failed to fetch portfolio prices.' }, { quoted: msg });
    }
  },
}; 