const games = {};
const { addPoint } = require('./points');
const timers = {};

function randomProblem() {
  const a = Math.floor(Math.random() * 50) + 1;
  const b = Math.floor(Math.random() * 50) + 1;
  const op = ['+', '-', '*'][Math.floor(Math.random() * 3)];
  let q = `${a} ${op} ${b}`;
  let aVal = eval(q);
  return { q, a: aVal.toString() };
}

module.exports = {
  name: 'math',
  description: 'Math Challenge: Jawab soal matematika!',
  usage: '.math [start|<jawaban>]',
  async execute(sock, msg, args) {
    const id = msg.key.remoteJid;
    if (!games[id] || args[0] === 'start') {
      games[id] = randomProblem();
      if (timers[id]) clearTimeout(timers[id]);
      timers[id] = setTimeout(() => {
        delete games[id];
        sock.sendMessage(id, { text: '⏰ Waktu habis! Game math challenge berakhir.' });
      }, 30000);
      return sock.sendMessage(id, { text: `Soal: ${games[id].q} (30 detik)` }, { quoted: msg });
    }
    if (!games[id]) return sock.sendMessage(id, { text: 'Ketik .math start untuk mulai.' }, { quoted: msg });
    const answer = args[0];
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