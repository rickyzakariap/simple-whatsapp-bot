const apiManager = require('../../lib/api-manager');

module.exports = {
  name: 'coin',
  description: 'Get crypto info and simple TP/SL from CoinGecko',
  usage: '.coin <symbol or name> [currency]',
  async execute(sock, msg, args) {
    if (!args.length) {
      return sock.sendMessage(msg.key.remoteJid, { text: 'Usage: .coin <symbol or name> [currency]' }, { quoted: msg });
    }

    const query = args[0].toLowerCase();
    const currency = (args[1] || 'usd').toLowerCase();

    try {
      const search = await apiManager.request('search', {
        params: { query },
        cacheTTL: 60 * 60 * 1000
      });
      if (!search?.coins?.length) {
        return sock.sendMessage(msg.key.remoteJid, { text: 'Coin not found.' }, { quoted: msg });
      }

      const coin = search.coins[0];
      const data = await apiManager.request(`coins/${encodeURIComponent(coin.id)}`, {
        params: {
          localization: false,
          tickers: false,
          market_data: true,
          community_data: false,
          developer_data: false,
          sparkline: false
        },
        cacheTTL: 2 * 60 * 1000
      });

      const market = data?.market_data;
      const price = market?.current_price?.[currency];
      if (price === undefined) {
        return sock.sendMessage(msg.key.remoteJid, {
          text: `Currency '${currency.toUpperCase()}' is not supported for this coin.`
        }, { quoted: msg });
      }

      const high = market.high_24h?.[currency];
      const low = market.low_24h?.[currency];
      const change = Number(market.price_change_percentage_24h || 0);
      const cap = market.market_cap?.[currency];
      const volume = market.total_volume?.[currency];
      const symbol = currency.toUpperCase() === 'USD' ? '$' : `${currency.toUpperCase()} `;
      const format = value => value === undefined ? 'N/A' : value.toLocaleString(undefined, { maximumFractionDigits: 8 });

      const text = `*${data.name} (${data.symbol.toUpperCase()})*

💰 Price: ${symbol}${format(price)}
📈 24h High: ${symbol}${format(high)}
📉 24h Low: ${symbol}${format(low)}
🔄 24h Change: ${change >= 0 ? '+' : ''}${change.toFixed(2)}%
🏦 Market Cap: ${symbol}${format(cap)}
💸 Volume: ${symbol}${format(volume)}

*TP (Take Profit):* ${symbol}${format(price * 1.05)} (+5%)
*SL (Stop Loss):* ${symbol}${format(price * 0.97)} (-3%)`;

      await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
    } catch (error) {
      console.error('Coin error:', error.message);
      await sock.sendMessage(msg.key.remoteJid, { text: 'Failed to fetch coin data.' }, { quoted: msg });
    }
  }
};
