const fs = require('fs');
const { formatError, formatLoading, isValidYouTubeUrl } = require('../../lib/response-helper');
const ytdlp = require('../../lib/ytdlp');

module.exports = {
  name: 'yt',
  description: 'Download a YouTube video (requires yt-dlp)',
  usage: '.yt <youtube_url>',
  async execute(sock, msg, args) {
    const chatId = msg.key.remoteJid;
    const url = args[0];
    if (!url || !isValidYouTubeUrl(url)) {
      return sock.sendMessage(chatId, {
        text: formatError('Invalid YouTube URL', 'Usage: .yt https://youtu.be/...')
      }, { quoted: msg });
    }

    let downloaded = null;
    try {
      if (!(await ytdlp.isAvailable())) {
        return sock.sendMessage(chatId, {
          text: 'YouTube video download is disabled because *yt-dlp* is not installed.\n\nInstall yt-dlp or use *.ytmp3* for audio.'
        }, { quoted: msg });
      }

      await sock.sendMessage(chatId, { text: formatLoading('Downloading video...') }, { quoted: msg });
      downloaded = await ytdlp.downloadVideo(url);

      const buffer = await fs.promises.readFile(downloaded.path);
      await sock.sendMessage(chatId, {
        video: buffer,
        mimetype: 'video/mp4',
        fileName: 'youtube.mp4',
        caption: 'YouTube video'
      }, { quoted: msg });
    } catch (error) {
      console.error('yt error:', error.message);
      const message = error.code === 'YT_DLP_NOT_INSTALLED'
        ? 'YouTube video download requires *yt-dlp* on the server.'
        : formatError('Download failed', error.message);
      await sock.sendMessage(chatId, { text: message }, { quoted: msg });
    } finally {
      if (downloaded?.path) {
        await fs.promises.rm(downloaded.path, { force: true }).catch(() => {});
      }
    }
  }
};
