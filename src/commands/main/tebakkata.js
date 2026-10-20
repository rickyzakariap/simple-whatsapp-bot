const words = ['komputer', 'program', 'javascript', 'whatsapp', 'bot', 'modular', 'teknologi', 'internet', 'database', 'aplikasi'];
const games = {};
const config = require('../../../config');
const { addPoint } = require('./points');
const timers = {};

function scramble(word) {
  return word.split('').sort(() => Math.random() - 0.5).join('');
}

module.exports = {
  name: 'tebakkata',
  description: 'Tebak Kata: Guess the original word from the scramble!',
  usage: '.tebakkata [start|<guess>]',
  async execute(sock, msg, args) {
    const id = msg.key.remoteJid;
    if (!games[id] || args[0] === 'start') {
      const word = words[Math.floor(Math.random() * words.length)];
      games[id] = { word, scramble: scramble(word) };
      if (timers[id]) clearTimeout(timers[id]);
      timers[id] = setTimeout(() => {
        delete games[id];
        sock.sendMessage(id, { text: '⏰ Waktu habis! Game tebak kata berakhir.' });
      }, config.games.tebakkata.timeout);
      return sock.sendMessage(id, { text: `Tebak kata: ${games[id].scramble} (${config.games.tebakkata.timeout / 1000} detik)` }, { quoted: msg });
    }
    if (!games[id]) return sock.sendMessage(id, { text: 'Ketik .tebakkata start untuk mulai.' }, { quoted: msg });
    const guess = args[0]?.toLowerCase();
    if (!guess) return sock.sendMessage(id, { text: 'Masukkan tebakan kata.' }, { quoted: msg });
    if (guess === games[id].word) {
      delete games[id];
      if (timers[id]) clearTimeout(timers[id]);
      await addPoint(id, msg.key.participant || msg.key.remoteJid, config.games.tebakkata.pointsForCorrect);
      return sock.sendMessage(id, { text: `Benar! 🎉 (+${config.games.tebakkata.pointsForCorrect} poin)` }, { quoted: msg });
    } else {
      return sock.sendMessage(id, { text: 'Salah! Coba lagi.' }, { quoted: msg });
    }
  },
}; 