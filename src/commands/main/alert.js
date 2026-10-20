const database = require('../../lib/database');
const { getSender, normalizeJid } = require('../../lib/permissions');

module.exports = {
  name: 'alert',
  description: 'Set price alerts: .alert <symbol> <price> [above|below] | .alert list | .alert remove <symbol>',
  usage: '.alert btc 100000 above | .alert list | .alert remove btc',
  async execute(sock, msg, args) {
    try {
      const chatId = msg.key.remoteJid;
      const user = normalizeJid(getSender(msg) || chatId);
      const db = await database.load('alerts');
      const cmd = args[0]?.toLowerCase();

      if (cmd === 'list') {
        const alerts = db[user] || [];
        if (!alerts.length) {
          return sock.sendMessage(chatId, { text: 'No alerts set.' }, { quoted: msg });
        }
        let text = '*Your Alerts:*\n';
        alerts.forEach(alert => {
          text += `- ${alert.symbol.toUpperCase()} ${alert.direction || 'above'} $${alert.price}\n`;
        });
        return sock.sendMessage(chatId, { text }, { quoted: msg });
      }

      if (cmd === 'remove') {
        const symbol = args[1]?.toLowerCase();
        if (!symbol) {
          return sock.sendMessage(chatId, { text: 'Usage: .alert remove <symbol>' }, { quoted: msg });
        }
        db[user] = (db[user] || []).filter(alert => alert.symbol !== symbol);
        if (db[user].length === 0) delete db[user];
        database.save('alerts', db);
        return sock.sendMessage(chatId, { text: `Alert for ${symbol.toUpperCase()} removed.` }, { quoted: msg });
      }

      const symbol = args[0]?.toLowerCase();
      const direction = args.some(arg => String(arg).toLowerCase() === 'below') ? 'below' : 'above';
      const priceArg = args.slice(1).find(arg => /^\d+(?:\.\d+)?$/.test(String(arg)));
      const price = Number(priceArg);

      if (!symbol || !/^[a-z0-9-]{1,20}$/.test(symbol) || !Number.isFinite(price) || price <= 0) {
        return sock.sendMessage(chatId, {
          text: 'Usage: .alert <symbol> <price> [above|below]\nExample: .alert btc 100000 above'
        }, { quoted: msg });
      }

      db[user] = db[user] || [];
      const duplicate = db[user].some(alert => alert.symbol === symbol && alert.direction === direction);
      if (duplicate) {
        return sock.sendMessage(chatId, {
          text: `You already have a ${direction} alert for ${symbol.toUpperCase()}.`
        }, { quoted: msg });
      }

      db[user].push({ symbol, price, direction });
      database.save('alerts', db);
      return sock.sendMessage(chatId, {
        text: `Alert set for ${symbol.toUpperCase()} ${direction} $${price}.`
      }, { quoted: msg });
    } catch (error) {
      console.error('Alert command error:', error);
      return sock.sendMessage(msg.key.remoteJid, { text: '❌ Error: Failed to process alert command.' }, { quoted: msg });
    }
  }
};
