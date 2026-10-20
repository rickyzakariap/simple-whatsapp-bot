const apiManager = require('../../lib/api-manager');

module.exports = {
  name: 'toplosers',
  description: 'Show top 5 crypto losers (24h)',
  usage: '.toplosers',
  async execute(sock, msg, args) {
    try {
      const data = await apiManager.getTopLosers(5);
      let text = '*Top 5 Losers (24h):*\n';
      (data || []).forEach((coin, index) => {
        const change = Number(coin.price_change_percentage_24h || 0);
        text += `${index + 1}. ${coin.name} (${coin.symbol.toUpperCase()}): $${coin.current_price} (${change.toFixed(2)}%)\n`;
      });
      await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
    } catch (error) {
      console.error('Top losers error:', error.message);
      await sock.sendMessage(msg.key.remoteJid, { text: 'Failed to fetch top losers.' }, { quoted: msg });
    }
  }
};
