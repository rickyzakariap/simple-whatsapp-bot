module.exports = {
  name: 'ping',
  description: 'Check bot response',
  async execute(sock, msg, args) {
    await sock.sendMessage(msg.key.remoteJid, { text: 'pong!' }, { quoted: msg });
  },
}; 