const axios = require('axios');
const { Downloader } = require('abot-scraper');

const downloader = new Downloader();

function pickTikTokMethod() {
  return downloader.tiktokDownloader ||
    downloader.tiktokDownloaderV1 ||
    downloader.tiktokDownloaderV2 ||
    null;
}

function extractTikTok(result) {
  const data = result?.result || result?.data || result;
  if (!data) return null;

  const videoUrl =
    data.video ||
    data.videoUrl ||
    data.videoDownloadUrl ||
    data.play ||
    data.downloadUrl ||
    data.mediaItems?.find(item => item.type === 'video' || /video/.test(item.type || ''))?.fileUrl ||
    data.mediaItems?.[0]?.fileUrl;

  const title = data.title || data.caption || data.desc || 'tiktok';
  return videoUrl ? { videoUrl, title } : null;
}

module.exports = {
  name: 'tiktok',
  description: 'Download video TikTok tanpa watermark',
  usage: '.tiktok <url>',
  async execute(sock, msg, args) {
    const chatId = msg.key.remoteJid;
    const url = args[0];
    if (!url) {
      return sock.sendMessage(chatId, {
        text: 'Masukkan link TikTok!\nContoh: .tiktok https://vt.tiktok.com/...'
      }, { quoted: msg });
    }

    try {
      const method = pickTikTokMethod();
      if (!method) throw new Error('TikTok downloader is not available in abot-scraper');

      const result = await method.call(downloader, url);
      const media = extractTikTok(result);
      if (!media) {
        return sock.sendMessage(chatId, {
          text: `Gagal download: ${result?.msg || result?.message || 'video tidak ditemukan'}`
        }, { quoted: msg });
      }

      await sock.sendMessage(chatId, { text: 'Berhasil! Mengirim video...' }, { quoted: msg });

      const video = await axios.get(media.videoUrl, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 60000,
        maxContentLength: 100 * 1024 * 1024,
        maxRedirects: 5
      });

      if (video.data.length > 100 * 1024 * 1024) {
        return sock.sendMessage(chatId, { text: 'Gagal: Video terlalu besar (max 100MB).' }, { quoted: msg });
      }

      await sock.sendMessage(chatId, {
        video: Buffer.from(video.data),
        mimetype: 'video/mp4',
        fileName: `${String(media.title).slice(0, 60).replace(/[\\/:*?"<>|]/g, '_') || 'tiktok'}.mp4`,
        caption: media.title || ''
      }, { quoted: msg });
    } catch (error) {
      console.error('TikTok error:', error.message);
      await sock.sendMessage(chatId, { text: `Error: ${error.message}` }, { quoted: msg });
    }
  }
};
