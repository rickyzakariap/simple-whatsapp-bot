const axios = require('axios');
const { Downloader } = require('abot-scraper');

const downloader = new Downloader();

module.exports = {
  name: 'fb',
  description: 'Download Facebook video (experimental)',
  usage: '.fb <facebook_url>',
  async execute(sock, msg, args) {
    const chatId = msg.key.remoteJid;
    const url = args[0];
    if (!url) {
      return sock.sendMessage(chatId, {
        text: 'Masukkan link Facebook!\nContoh: .fb https://www.facebook.com/...'
      }, { quoted: msg });
    }

    try {
      const result = await downloader.facebookDownloader(url);
      const data = result?.result || result?.data || {};
      const videoUrl = data.videoUrl || data.url || data.hd || data.sd;

      if (!videoUrl) {
        return sock.sendMessage(chatId, {
          text: '❌ Facebook downloader sedang tidak tersedia (API pihak ketiga gagal). Coba lagi nanti.'
        }, { quoted: msg });
      }

      const video = await axios.get(videoUrl, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 60000,
        maxContentLength: 100 * 1024 * 1024,
        maxRedirects: 5
      });

      if (video.data.length > 100 * 1024 * 1024) {
        return sock.sendMessage(chatId, { text: '❌ Video terlalu besar (max 100MB).' }, { quoted: msg });
      }

      await sock.sendMessage(chatId, {
        video: Buffer.from(video.data),
        mimetype: 'video/mp4',
        fileName: `${String(data.title || 'facebook').slice(0, 60)}.mp4`,
        caption: data.title || ''
      }, { quoted: msg });
    } catch (error) {
      console.error('FB download error:', error.message);
      await sock.sendMessage(chatId, {
        text: '❌ Facebook downloader sedang tidak tersedia. Platform membatasi akses API pihak ketiga.'
      }, { quoted: msg });
    }
  }
};
