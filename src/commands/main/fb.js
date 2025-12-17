const axios = require('axios');
const { Downloader } = require('abot-scraper');
const downloader = new Downloader();

module.exports = {
  name: 'fb',
  description: 'Download video Facebook',
  async execute(sock, msg, args) {
    const url = args[0];
    if (!url) return await sock.sendMessage(msg.key.remoteJid, { text: 'Masukkan link Facebook!\nContoh: .fb https://www.facebook.com/...' }, { quoted: msg });
    try {
      const result = await downloader.facebookDownloader(url);
      // Ambil link video dari videoUrl
      const videoUrl = result.result?.videoUrl || result.result?.url || result.result?.hd || result.result?.sd;
      if (result.status === 200 && result.result && videoUrl) {
        await sock.sendMessage(msg.key.remoteJid, { text: 'Berhasil! Mengirim video...' }, { quoted: msg });
        const videoRes = await axios.get(videoUrl, {
          responseType: 'arraybuffer',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        if (videoRes.data.length > 100 * 1024 * 1024) {
          return await sock.sendMessage(msg.key.remoteJid, { text: 'Gagal: Video terlalu besar untuk dikirim via WhatsApp (max 100MB).' }, { quoted: msg });
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