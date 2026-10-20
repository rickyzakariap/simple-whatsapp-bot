const axios = require('axios');
const { Downloader } = require('abot-scraper');

const downloader = new Downloader();

module.exports = {
  name: 'ig',
  description: 'Download Instagram post/reel (experimental)',
  usage: '.ig <instagram_url>',
  async execute(sock, msg, args) {
    const chatId = msg.key.remoteJid;
    const url = args[0];
    if (!url) {
      return sock.sendMessage(chatId, {
        text: 'Masukkan link Instagram!\nContoh: .ig https://www.instagram.com/p/...'
      }, { quoted: msg });
    }

    try {
      const result = await downloader.instagramDownloader(url);
      const mediaItems = Array.isArray(result?.result) ? result.result : [];

      if (!mediaItems.length) {
        return sock.sendMessage(chatId, {
          text: '❌ Instagram downloader sedang tidak tersedia (API pihak ketiga berubah/diblokir). Coba lagi nanti atau gunakan link lain.'
        }, { quoted: msg });
      }

      await sock.sendMessage(chatId, {
        text: `⚠️ Experimental: mengirim ${Math.min(mediaItems.length, 10)} media...`
      }, { quoted: msg });

      for (const media of mediaItems.slice(0, 10)) {
        if (!media?.url) continue;

        try {
          const response = await axios.get(media.url, {
            responseType: 'arraybuffer',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 60000,
            maxContentLength: 100 * 1024 * 1024,
            maxRedirects: 5
          });

          const isVideo = media.type === 'video' ||
            media.isVideo === true ||
            /\.(mp4|mov|webm)(\?|$)/i.test(media.url);

          if (isVideo) {
            await sock.sendMessage(chatId, {
              video: Buffer.from(response.data),
              mimetype: 'video/mp4',
              fileName: 'instagram.mp4'
            }, { quoted: msg });
          } else {
            await sock.sendMessage(chatId, {
              image: Buffer.from(response.data),
              fileName: 'instagram.jpg'
            }, { quoted: msg });
          }
        } catch (mediaError) {
          console.error('Instagram media download failed:', mediaError.message);
        }
      }
    } catch (error) {
      console.error('IG download error:', error.message);
      await sock.sendMessage(chatId, {
        text: '❌ Instagram downloader sedang tidak tersedia. Platform membatasi akses API pihak ketiga.'
      }, { quoted: msg });
    }
  }
};
