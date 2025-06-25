module.exports = {
  name: 'menu',
  description: 'Show command list',
  async execute(sock, msg, args) {
    const menu = `*OngBak-Bot Command List*

` +
      `.ping - Check bot response
` +
      `.menu - Show this menu
` +
      `.owner - Show owner info
`;
    await sock.sendMessage(msg.key.remoteJid, { text: menu }, { quoted: msg });
  },
}; 