const axios = require('axios');
const fs = require('fs');
const { Downloader } = require('abot-scraper');
const downloader = new Downloader();

module.exports = {
  name: 'tiktok',
  description: 'Download video TikTok tanpa watermark',
  async execute(sock, msg, args) {
    const url = args[0];
    if (!url) return await sock.sendMessage(msg.key.remoteJid, { text: 'Masukkan link TikTok!\nContoh: .tiktok https://vt.tiktok.com/...' }, { quoted: msg });
    try {
      const result = await downloader.tiktokDownloader(url);
      if (result.status === 200 && result.result && result.result.video) {
        await sock.sendMessage(msg.key.remoteJid, { text: 'Berhasil! Mengirim video...' }, { quoted: msg });
        // Download video as buffer with user-agent
        const videoRes = await axios.get(result.result.video, {
          responseType: 'arraybuffer',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        // Debug: save to file (uncomment if needed)
        // fs.writeFileSync('debug_tiktok.mp4', videoRes.data);

        // Cek ukuran
        if (videoRes.data.length > 48 * 1024 * 1024) {
          return await sock.sendMessage(msg.key.remoteJid, { text: 'Gagal: Video terlalu besar untuk dikirim via WhatsApp.' }, { quoted: msg });
        }

        await sock.sendMessage(
          msg.key.remoteJid,
          {
            video: Buffer.from(videoRes.data),
            mimetype: 'video/mp4',
            fileName: (result.result.title || 'tiktok') + '.mp4',
            caption: result.result.title || ''
          },
          { quoted: msg }
        );
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