const axios = require('axios');
const { Downloader } = require('abot-scraper');
const downloader = new Downloader();

module.exports = {
  name: 'ig',
  description: 'Download post/reel Instagram',
  async execute(sock, msg, args) {
    const url = args[0];
    if (!url) return await sock.sendMessage(msg.key.remoteJid, { text: 'Masukkan link Instagram!\nContoh: .ig https://www.instagram.com/p/...' }, { quoted: msg });
    try {
      const result = await downloader.instagramDownloader(url);
      if (result.status === 200 && Array.isArray(result.result) && result.result.length > 0) {
        await sock.sendMessage(msg.key.remoteJid, { text: `Berhasil! Mengirim ${result.result.length} media...` }, { quoted: msg });
        for (const media of result.result) {
          if (!media.url) continue;
          const mediaRes = await axios.get(media.url, {
            responseType: 'arraybuffer',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });
          if (media.type === 'video') {
            if (mediaRes.data.length > 48 * 1024 * 1024) {
              await sock.sendMessage(msg.key.remoteJid, { text: 'Gagal: Video terlalu besar untuk dikirim via WhatsApp.' }, { quoted: msg });
              continue;
            }
            await sock.sendMessage(
              msg.key.remoteJid,
              {
                video: Buffer.from(mediaRes.data),
                mimetype: 'video/mp4',
                fileName: 'instagram.mp4'
              },
              { quoted: msg }
            );
          } else if (media.type === 'image') {
            await sock.sendMessage(
              msg.key.remoteJid,
              {
                image: Buffer.from(mediaRes.data),
                mimetype: 'image/jpeg',
                fileName: 'instagram.jpg'
              },
              { quoted: msg }
            );
          }
        }
      } else {
        await sock.sendMessage(
          msg.key.remoteJid,
          { text: 'Gagal download: ' + (result.msg || JSON.stringify(result) || 'Unknown error') },
          { quoted: msg }
        );
      }
    } catch (e) {
      await sock.sendMessage(
        msg.key.remoteJid,
        { text: 'Error: ' + (e.message || JSON.stringify(e) || e) },
        { quoted: msg }
      );
    }
  }
}; 