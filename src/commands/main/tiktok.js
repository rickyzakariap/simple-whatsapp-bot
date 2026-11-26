const fs = require('node:fs/promises');
const { isValidTikTokUrl, downloadTikTokVideo } = require('../../lib/ytdlp');

module.exports = {
  name: 'tiktok',
  description: 'Download video publik TikTok (requires yt-dlp)',
  usage: '.tiktok <url>',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const url = args[0];
    const reply = body => sock.sendMessage(jid, body, { quoted: msg });
    if (!isValidTikTokUrl(url)) {
      return reply({ text: 'Masukkan link video TikTok yang valid.\nContoh: .tiktok https://vt.tiktok.com/...' });
    }

    let downloaded;
    try {
      downloaded = await downloadTikTokVideo(url);
      await reply({
        video: await fs.readFile(downloaded.path),
        mimetype: 'video/mp4',
        fileName: 'tiktok.mp4'
      });
    } catch (error) {
      const reason = error.code === 'YT_DLP_NOT_INSTALLED'
        ? 'yt-dlp tidak tersedia di server.'
        : 'Video publik tidak bisa diunduh atau dikirim.';
      console.error('TikTok download/send failed:', String(error.code || error.signal || error.name));
      await reply({ text: `Gagal download TikTok: ${reason}` });
    } finally {
      if (downloaded) await downloaded.cleanup().catch(() => {});
    }
  }
};
