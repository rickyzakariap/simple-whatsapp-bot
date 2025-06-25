const axios = require('axios');

module.exports = {
  name: 'toplosers',
  description: 'Show top 5 crypto losers (24h)',
  usage: '.toplosers',
  async execute(sock, msg, args) {
    try {
      const { data } = await axios.get('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&price_change_percentage=24h');
      const sorted = data.sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h).slice(0, 5);
      let text = '*Top 5 Losers (24h):*\n';
      sorted.forEach((coin, i) => {
        text += `${i + 1}. ${coin.name} (${coin.symbol.toUpperCase()}): $${coin.current_price} (${coin.price_change_percentage_24h.toFixed(2)}%)\n`;
      });
      await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(msg.key.remoteJid, { text: 'Failed to fetch top losers.' }, { quoted: msg });
    }
  },
}; 