const { addPoint } = require('./points');
const questions = [
  { q: 'Ibukota Indonesia?', a: 'jakarta' },
  { q: '2 + 2 = ?', a: '4' },
  { q: 'Warna bendera Jepang?', a: 'putih merah' },
  { q: 'Siapa penemu lampu?', a: 'thomas edison' },
  { q: 'Planet terbesar di tata surya?', a: 'jupiter' },
];
const games = {};
const timers = {};

module.exports = {
  name: 'quiz',
  description: 'Quiz/Trivia: Jawab pertanyaan acak!',
  usage: '.quiz [start|<jawaban>]',
  async execute(sock, msg, args) {
    const id = msg.key.remoteJid;
    if (!games[id] || args[0] === 'start') {
      const q = questions[Math.floor(Math.random() * questions.length)];
      games[id] = q;
      if (timers[id]) clearTimeout(timers[id]);
      timers[id] = setTimeout(() => {
        delete games[id];
        sock.sendMessage(id, { text: '⏰ Waktu habis! Game quiz berakhir.' });
      }, 30000);
      return sock.sendMessage(id, { text: `Quiz: ${q.q} (30 detik)` }, { quoted: msg });
    }
    if (!games[id]) return sock.sendMessage(id, { text: 'Ketik .quiz start untuk mulai.' }, { quoted: msg });
    const answer = args.join(' ').toLowerCase();
    if (!answer) return sock.sendMessage(id, { text: 'Masukkan jawaban.' }, { quoted: msg });
    if (answer === games[id].a) {
      delete games[id];
      if (timers[id]) clearTimeout(timers[id]);
      addPoint(id, msg.key.participant || msg.key.remoteJid, 5);
      return sock.sendMessage(id, { text: 'Benar! 🎉 (+5 poin)' }, { quoted: msg });
    } else {
      return sock.sendMessage(id, { text: 'Salah! Coba lagi.' }, { quoted: msg });
    }
  },
}; 