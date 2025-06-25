module.exports = {
  name: 'owner',
  description: 'Show owner info',
  async execute(sock, msg, args) {
    const info = `*🤖 Bot Owner Information*
    
📱 Number: wa.me/628988814717
👤 Name: Ong-Bak Ganteng
🌐 GitHub: github.com/rickyzakariap
💬 Note: Nothing last forever, we can change the future [Alucrot 1945]

_Bot created with ❤️ by Ong-Bak_`;
    await sock.sendMessage(msg.key.remoteJid, { text: info }, { quoted: msg });
  },
}; 