const games = {};
const config = require('../../../config');
const { addPoint } = require('./points');
const timers = {};

module.exports = {
  name: 'tebakangka',
  description: 'Tebak Angka: Guess the number (1-100)!',
  usage: '.tebakangka [start|<guess>]',
  async execute(sock, msg, args) {
    const id = msg.key.remoteJid;
    if (!games[id] || args[0] === 'start') {
      games[id] = { number: Math.floor(Math.random() * 100) + 1, tries: 0 };
      if (timers[id]) clearTimeout(timers[id]);
      timers[id] = setTimeout(() => {
        delete games[id];
        sock.sendMessage(id, { text: '⏰ Waktu habis! Game tebak angka berakhir.' });
      }, config.games.tebakangka.timeout);
      return sock.sendMessage(id, { text: `Game dimulai! Tebak angka antara 1-100. (${config.games.tebakangka.timeout / 1000} detik)` }, { quoted: msg });
    }
    if (!games[id]) return sock.sendMessage(id, { text: 'Ketik .tebakangka start untuk mulai.' }, { quoted: msg });
    const guess = parseInt(args[0]);
    if (isNaN(guess)) return sock.sendMessage(id, { text: 'Masukkan angka tebakan.' }, { quoted: msg });
    games[id].tries++;
    if (guess === games[id].number) {
      const tries = games[id].tries;
      delete games[id];
      if (timers[id]) clearTimeout(timers[id]);
      await addPoint(id, msg.key.participant || msg.key.remoteJid, config.games.tebakangka.pointsForCorrect);
      return sock.sendMessage(id, { text: `Benar! 🎉 Kamu menebak dalam ${tries} percobaan. (+${config.games.tebakangka.pointsForCorrect} poin)` }, { quoted: msg });
    } else if (guess < games[id].number) {
      return sock.sendMessage(id, { text: 'Terlalu kecil! Coba lagi.' }, { quoted: msg });
    } else {
      return sock.sendMessage(id, { text: 'Terlalu besar! Coba lagi.' }, { quoted: msg });
    }
  },
}; 