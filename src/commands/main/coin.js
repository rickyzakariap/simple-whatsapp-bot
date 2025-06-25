const axios = require('axios');

module.exports = {
  name: 'coin',
  description: 'Get crypto info and simple TP/SL from CoinGecko',
  usage: '.coin <symbol or name>',
  async execute(sock, msg, args) {
    if (!args.length) {
      return sock.sendMessage(msg.key.remoteJid, { text: 'Usage: .coin <symbol or name>' }, { quoted: msg });
    }
    const query = args[0].toLowerCase();
    try {
      // Search for the coin
      const search = await axios.get(`https://api.coingecko.com/api/v3/search?query=${query}`);
      if (!search.data.coins.length) {
        return sock.sendMessage(msg.key.remoteJid, { text: 'Coin not found.' }, { quoted: msg });
      }
      const coin = search.data.coins[0];
      // Get market data
      const { data } = await axios.get(`https://api.coingecko.com/api/v3/coins/${coin.id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`);
      const price = data.market_data.current_price.usd;
      const high = data.market_data.high_24h.usd;
      const low = data.market_data.low_24h.usd;
      const change = data.market_data.price_change_percentage_24h;
      const cap = data.market_data.market_cap.usd;
      const vol = data.market_data.total_volume.usd;
      // Simple TP/SL: TP = +5%, SL = -3%
      const tp = price * 1.05;
      const sl = price * 0.97;
      const text = `*${data.name} (${data.symbol.toUpperCase()})*

` +
        `💰 Price: $${price.toLocaleString(undefined, {maximumFractionDigits: 8})}
` +
        `📈 24h High: $${high.toLocaleString(undefined, {maximumFractionDigits: 8})}
` +
        `📉 24h Low: $${low.toLocaleString(undefined, {maximumFractionDigits: 8})}
` +
        `🔄 24h Change: ${change > 0 ? '+' : ''}${change.toFixed(2)}%
` +
        `🏦 Market Cap: $${cap.toLocaleString()}
` +
        `💸 Volume: $${vol.toLocaleString()}

` +
        `*TP (Take Profit):* $${tp.toLocaleString(undefined, {maximumFractionDigits: 8})} (+5%)
` +
        `*SL (Stop Loss):* $${sl.toLocaleString(undefined, {maximumFractionDigits: 8})} (-3%)
`;
      await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(msg.key.remoteJid, { text: 'Failed to fetch coin data.' }, { quoted: msg });
    }
  },
}; 