const axios = require('axios');
const { Downloader } = require('abot-scraper');
const fallbackDownloader = require('../../lib/fallback-downloader');
const downloader = new Downloader();

module.exports = {
  name: 'fb',
  description: 'Download video Facebook',
  async execute(sock, msg, args) {
    const url = args[0];
    if (!url) return await sock.sendMessage(msg.key.remoteJid, { text: 'Masukkan link Facebook!\nContoh: .fb https://www.facebook.com/...' }, { quoted: msg });

    try {
      await sock.sendMessage(msg.key.remoteJid, { text: '⏳ Mengunduh video Facebook...' }, { quoted: msg });

      // Try primary API first
      let result = await downloader.facebookDownloader(url);
      let videoUrl = result.result?.videoUrl || result.result?.url || result.result?.hd || result.result?.sd;

      // If primary fails, try fallback API
      if (!videoUrl || result.status !== 200) {
        console.log('FB: Primary API failed, trying fallback...');
        result = await fallbackDownloader.facebookDownload(url);
        videoUrl = result.result?.videoUrl || result.result?.hd || result.result?.sd;
      }

      if (result.status === 200 && result.result && videoUrl) {
        const videoRes = await axios.get(videoUrl, {
          responseType: 'arraybuffer',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          timeout: 60000
        });

        if (videoRes.data.length > 100 * 1024 * 1024) {
          return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Video terlalu besar (max 100MB).' }, { quoted: msg });
        }

        await sock.sendMessage(
          msg.key.remoteJid,
          {
            video: Buffer.from(videoRes.data),
            mimetype: 'video/mp4',
            fileName: (result.result.title || 'facebook') + '.mp4',
            caption: result.result.title || ''
          },
          { quoted: msg }
        );
      } else {
        await sock.sendMessage(
          msg.key.remoteJid,
          { text: '❌ Gagal download: ' + (result.msg || 'Video tidak ditemukan') },
          { quoted: msg }
        );
      }
    } catch (e) {
      console.error('FB download error:', e.message);
      await sock.sendMessage(
        msg.key.remoteJid,
        { text: '❌ Error: ' + e.message },
        { quoted: msg }
      );
    }
  }
};