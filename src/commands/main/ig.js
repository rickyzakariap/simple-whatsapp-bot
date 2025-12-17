const axios = require('axios');
const { Downloader } = require('abot-scraper');
const fallbackDownloader = require('../../lib/fallback-downloader');
const downloader = new Downloader();

module.exports = {
  name: 'ig',
  description: 'Download post/reel Instagram',
  async execute(sock, msg, args) {
    const url = args[0];
    if (!url) return await sock.sendMessage(msg.key.remoteJid, { text: 'Masukkan link Instagram!\nContoh: .ig https://www.instagram.com/p/...' }, { quoted: msg });

    try {
      await sock.sendMessage(msg.key.remoteJid, { text: '⏳ Mengunduh media Instagram...' }, { quoted: msg });

      // Try primary API first
      let result = await downloader.instagramDownloader(url);

      // If primary fails, try fallback API
      if (result.status !== 200 || !Array.isArray(result.result) || result.result.length === 0) {
        console.log('IG: Primary API failed, trying fallback...');
        result = await fallbackDownloader.instagramDownload(url);
      }

      if (result.status === 200 && Array.isArray(result.result) && result.result.length > 0) {
        await sock.sendMessage(msg.key.remoteJid, { text: `✅ Mengirim ${result.result.length} media...` }, { quoted: msg });

        for (const media of result.result) {
          if (!media.url) continue;

          try {
            const mediaRes = await axios.get(media.url, {
              responseType: 'arraybuffer',
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
              },
              timeout: 60000
            });

            if (media.type === 'video') {
              if (mediaRes.data.length > 100 * 1024 * 1024) {
                await sock.sendMessage(msg.key.remoteJid, { text: '❌ Video terlalu besar (max 100MB).' }, { quoted: msg });
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
            } else {
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
          } catch (mediaError) {
            console.error('Error downloading media:', mediaError.message);
          }
        }
      } else {
        await sock.sendMessage(
          msg.key.remoteJid,
          { text: '❌ Gagal download: ' + (result.msg || 'Media tidak ditemukan') },
          { quoted: msg }
        );
      }
    } catch (e) {
      console.error('IG download error:', e.message);
      await sock.sendMessage(
        msg.key.remoteJid,
        { text: '❌ Error: ' + e.message },
        { quoted: msg }
      );
    }
  }
};