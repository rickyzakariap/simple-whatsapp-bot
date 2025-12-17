const axios = require('axios');
const { Downloader } = require('abot-scraper');
const { formatError, formatLoading, isValidYouTubeUrl } = require('../../lib/response-helper');
const downloader = new Downloader();

module.exports = {
  name: 'yt',
  description: 'Download video YouTube',
  usage: '.yt <youtube_url>',
  async execute(sock, msg, args) {
    const url = args[0];
    if (!url || !isValidYouTubeUrl(url)) {
      return await sock.sendMessage(msg.key.remoteJid, {
        text: formatError('Invalid YouTube URL', 'Usage: .yt https://youtu.be/...')
      }, { quoted: msg });
    }
    try {
      const result = await downloader.youtubeDownloader(url);
      if (result.status === 200 && result.result) {
        // Pilih kualitas terendah yang tersedia
        let videoUrl = null;
        if (result.result.downloadLinks) {
          videoUrl = result.result.downloadLinks['360p'] ||
            result.result.downloadLinks['240p'] ||
            result.result.downloadLinks['144p'] ||
            result.result.downloadLinks['480p'] ||
            result.result.downloadLinks['720p'] ||
            result.result.downloadLinks['1080p'];
        }
        // Fallback ke result.result.video jika ada
        if (!videoUrl && result.result.video) videoUrl = result.result.video;

        if (!videoUrl) {
          return await sock.sendMessage(msg.key.remoteJid, { text: 'Gagal: Tidak menemukan link video yang bisa diunduh.' }, { quoted: msg });
        }

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
            fileName: (result.result.title || 'youtube') + '.mp4',
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