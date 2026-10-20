module.exports = {
  name: 'igstory',
  description: 'Instagram stories downloader (currently unavailable)',
  usage: '.igstory <username>',
  async execute(sock, msg, args) {
    const chatId = msg.key.remoteJid;
    if (!args[0]) {
      return sock.sendMessage(chatId, {
        text: 'Usage: .igstory <username>'
      }, { quoted: msg });
    }

    return sock.sendMessage(chatId, {
      text: '❌ Instagram story downloader sedang tidak tersedia.\n\nAPI scraper yang dipakai sebelumnya sudah mati, dan Instagram membatasi akses tanpa login. Fitur ini dinonaktifkan agar tidak menggantung.'
    }, { quoted: msg });
  }
};
