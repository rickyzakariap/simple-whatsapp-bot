const axios = require('axios');
const { Downloader } = require('abot-scraper');
const { formatError, formatLoading, isValidYouTubeUrl } = require('../../lib/response-helper');
const downloader = new Downloader();

module.exports = {
  name: 'ytmp3',
  description: 'Download audio YouTube (MP3)',
  usage: '.ytmp3 <youtube_url>',
  async execute(sock, msg, args) {
    const url = args[0];

    // Validate URL
    if (!url || !isValidYouTubeUrl(url)) {
      return await sock.sendMessage(msg.key.remoteJid, {
        text: formatError('Invalid YouTube URL', 'Usage: .ytmp3 https://youtu.be/...')
      }, { quoted: msg });
    }

    try {
      const result = await downloader.ytMp3Downloader(url);
      const audioUrl =
        result.result?.downloadUrl ||
        result.downloadUrl ||
        result.result?.url ||
        result.url;

      if (!audioUrl) {
        return await sock.sendMessage(msg.key.remoteJid, {
          text: formatError('Download failed', 'Could not find audio download link')
        }, { quoted: msg });
      }

      await sock.sendMessage(msg.key.remoteJid, {
        text: formatLoading('Downloading audio...')
      }, { quoted: msg });

      const audioRes = await axios.get(audioUrl, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'audio/mpeg'
        },
        maxRedirects: 5,
        timeout: 60000 // 60 second timeout
      });

      // Validate file size
      if (audioRes.data.length < 10 * 1024) {
        return await sock.sendMessage(msg.key.remoteJid, {
          text: formatError('Download failed', 'Audio file too small, likely an error')
        }, { quoted: msg });
      }

      if (audioRes.data.length > 48 * 1024 * 1024) {
        return await sock.sendMessage(msg.key.remoteJid, {
          text: formatError('File too large', 'Audio exceeds WhatsApp 48MB limit')
        }, { quoted: msg });
      }

      await sock.sendMessage(
        msg.key.remoteJid,
        {
          audio: Buffer.from(audioRes.data),
          mimetype: 'audio/mpeg',
          fileName: (result.result?.title || result.title || 'youtube') + '.mp3',
          ptt: false
        },
        { quoted: msg }
      );
    } catch (e) {
      console.error('ytmp3 error:', e.message);
      await sock.sendMessage(
        msg.key.remoteJid,
        { text: formatError('Download failed', e.message) },
        { quoted: msg }
      );
    }
  }
};