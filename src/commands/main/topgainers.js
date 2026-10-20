const apiManager = require('../../lib/api-manager');

module.exports = {
  name: 'topgainers',
  description: 'Show top 5 crypto gainers (24h)',
  usage: '.topgainers',
  async execute(sock, msg, args) {
    try {
      const data = await apiManager.getTopGainers(5);
      let text = '*Top 5 Gainers (24h):*\n';
      (data || []).forEach((coin, index) => {
        const change = Number(coin.price_change_percentage_24h || 0);
        text += `${index + 1}. ${coin.name} (${coin.symbol.toUpperCase()}): $${coin.current_price} (${change >= 0 ? '+' : ''}${change.toFixed(2)}%)\n`;
      });
      await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
    } catch (error) {
      console.error('Top gainers error:', error.message);
      await sock.sendMessage(msg.key.remoteJid, { text: 'Failed to fetch top gainers.' }, { quoted: msg });
    }
  }
};
