const choices = ['batu', 'gunting', 'kertas'];
const { addPoint } = require('./points');

module.exports = {
  name: 'suit',
  description: 'Suit: Batu, Gunting, Kertas (Rock Paper Scissors) vs Bot!',
  usage: '.suit <batu|gunting|kertas>',
  async execute(sock, msg, args) {
    const user = args[0]?.toLowerCase();
    if (!choices.includes(user)) {
      return sock.sendMessage(msg.key.remoteJid, { text: 'Pilih: batu, gunting, atau kertas.' }, { quoted: msg });
    }
    const bot = choices[Math.floor(Math.random() * 3)];
    let result = '';
    if (user === bot) result = 'Seri!';
    else if (
      (user === 'batu' && bot === 'gunting') ||
      (user === 'gunting' && bot === 'kertas') ||
      (user === 'kertas' && bot === 'batu')
    ) {
      addPoint(msg.key.remoteJid, msg.key.participant || msg.key.remoteJid, 2);
      result = 'Kamu menang! (+2 poin)';
    }
    else result = 'Bot menang!';
    await sock.sendMessage(msg.key.remoteJid, { text: `Kamu: ${user}\nBot: ${bot}\n${result}` }, { quoted: msg });
  },
}; 