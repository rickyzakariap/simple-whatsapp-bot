const axios = require('axios');
const fs = require('fs');
const { Downloader } = require('abot-scraper');
const downloader = new Downloader();

module.exports = {
  name: 'ytmp3',
  description: 'Download audio YouTube (MP3)',
  async execute(sock, msg, args) {
    const url = args[0];
    if (!url) return await sock.sendMessage(msg.key.remoteJid, { text: 'Masukkan link YouTube!\nContoh: .ytmp3 https://youtu.be/...' }, { quoted: msg });
    try {
      const result = await downloader.ytMp3Downloader(url);
      const audioUrl =
        result.result?.downloadUrl ||
        result.downloadUrl ||
        result.result?.url ||
        result.url;

      if (!audioUrl) {
        return await sock.sendMessage(msg.key.remoteJid, { text: 'Gagal: Tidak menemukan link audio yang bisa diunduh.' }, { quoted: msg });
      }
      await sock.sendMessage(msg.key.remoteJid, { text: 'Berhasil! Mengirim audio...' }, { quoted: msg });
      const audioRes = await axios.get(audioUrl, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'audio/mpeg'
        },
        maxRedirects: 5
      });

      // Debug: simpan buffer ke file lokal
      fs.writeFileSync('debug_ytmp3.mp3', audioRes.data);

      if (audioRes.data.length < 10 * 1024) {
        return await sock.sendMessage(msg.key.remoteJid, { text: 'Gagal: File audio terlalu kecil, kemungkinan error.' }, { quoted: msg });
      }
      if (audioRes.data.length > 48 * 1024 * 1024) {
        return await sock.sendMessage(msg.key.remoteJid, { text: 'Gagal: File audio terlalu besar untuk dikirim via WhatsApp.' }, { quoted: msg });
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
      await sock.sendMessage(
        msg.key.remoteJid,
        { text: 'Error: ' + (e.message || JSON.stringify(e) || e) },
        { quoted: msg }
      );
    }
  }
}; 