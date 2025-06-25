const words = ['komputer', 'program', 'javascript', 'whatsapp', 'bot', 'modular', 'teknologi', 'internet', 'database', 'aplikasi'];
const games = {};
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
      }, 30000);
      return sock.sendMessage(id, { text: `Tebak kata: ${games[id].scramble} (30 detik)` }, { quoted: msg });
    }
    if (!games[id]) return sock.sendMessage(id, { text: 'Ketik .tebakkata start untuk mulai.' }, { quoted: msg });
    const guess = args[0]?.toLowerCase();
    if (!guess) return sock.sendMessage(id, { text: 'Masukkan tebakan kata.' }, { quoted: msg });
    if (guess === games[id].word) {
      delete games[id];
      if (timers[id]) clearTimeout(timers[id]);
      addPoint(id, msg.key.participant || msg.key.remoteJid, 5);
      return sock.sendMessage(id, { text: 'Benar! 🎉 (+5 poin)' }, { quoted: msg });
    } else {
      return sock.sendMessage(id, { text: 'Salah! Coba lagi.' }, { quoted: msg });
    }
  },
}; 