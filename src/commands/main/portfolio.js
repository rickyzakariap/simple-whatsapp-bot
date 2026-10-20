const database = require('../../lib/database');
const apiManager = require('../../lib/api-manager');
const { getSender, normalizeJid } = require('../../lib/permissions');

module.exports = {
  name: 'portfolio',
  description: 'Track your favorite coins',
  usage: '.portfolio add <symbol> | .portfolio remove <symbol> | .portfolio show',
  async execute(sock, msg, args) {
    const chatId = msg.key.remoteJid;
    const user = normalizeJid(getSender(msg) || chatId);
    const db = await database.load('portfolio');
    const cmd = args[0]?.toLowerCase();

    if (cmd === 'add') {
      const symbol = args[1]?.toLowerCase();
      if (!symbol || !/^[a-z0-9-]{1,20}$/.test(symbol)) {
        return sock.sendMessage(chatId, { text: 'Usage: .portfolio add <symbol>' }, { quoted: msg });
      }
      db[user] = db[user] || [];
      if (!db[user].includes(symbol)) db[user].push(symbol);
      database.save('portfolio', db);
      return sock.sendMessage(chatId, { text: `Added ${symbol.toUpperCase()} to your portfolio.` }, { quoted: msg });
    }

    if (cmd === 'remove') {
      const symbol = args[1]?.toLowerCase();
      if (!symbol) {
        return sock.sendMessage(chatId, { text: 'Usage: .portfolio remove <symbol>' }, { quoted: msg });
      }
      db[user] = (db[user] || []).filter(item => item !== symbol);
      if (db[user].length === 0) delete db[user];
      database.save('portfolio', db);
      return sock.sendMessage(chatId, { text: `Removed ${symbol.toUpperCase()} from your portfolio.` }, { quoted: msg });
    }

    const list = db[user] || [];
    if (!list.length) {
      return sock.sendMessage(chatId, {
        text: 'Your portfolio is empty. Add coins with .portfolio add <symbol>'
      }, { quoted: msg });
    }

    try {
      const data = await apiManager.getCoinPrice(list.join(','));
      let text = '*Your Portfolio:*\n';
      list.forEach(symbol => {
        const coin = Array.isArray(data) ? data.find(item => item.symbol.toLowerCase() === symbol) : null;
        if (coin) {
          text += `- ${coin.name} (${coin.symbol.toUpperCase()}): $${coin.current_price}\n`;
        } else {
          text += `- ${symbol.toUpperCase()}: Not found\n`;
        }
      });
      await sock.sendMessage(chatId, { text }, { quoted: msg });
    } catch (error) {
      console.error('Portfolio error:', error.message);
      await sock.sendMessage(chatId, { text: 'Failed to fetch portfolio prices.' }, { quoted: msg });
    }
  }
};
