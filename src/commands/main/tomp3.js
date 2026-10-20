const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { getQuotedMessage } = require('../../lib/message');

ffmpeg.setFfmpegPath(ffmpegPath);

module.exports = {
  name: 'tomp3',
  description: 'Convert a video or voice note to MP3 audio',
  usage: '.tomp3 (reply to video/voice note)',
  async execute(sock, msg, args) {
    const chatId = msg.key.remoteJid;
    let tempInput = null;
    let tempOutput = null;

    try {
      const quoted = getQuotedMessage(msg);
      if (!quoted || (!quoted.message.videoMessage && !quoted.message.audioMessage)) {
        return sock.sendMessage(chatId, { text: 'Reply to a video or voice note with .tomp3' }, { quoted: msg });
      }

      const mediaType = quoted.message.videoMessage ? 'video' : 'audio';
      const buffer = await downloadMediaMessage(
        { key: quoted.key, message: quoted.message },
        'buffer',
        {},
        sock
      );
      if (!buffer || buffer.length === 0) throw new Error('Empty media');

      const tempDir = path.join(__dirname, '../temp');
      await fs.promises.mkdir(tempDir, { recursive: true });
      const unique = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      tempInput = path.join(tempDir, `${unique}.${mediaType === 'video' ? 'mp4' : 'ogg'}`);
      tempOutput = path.join(tempDir, `${unique}.mp3`);
      await fs.promises.writeFile(tempInput, buffer);

      await new Promise((resolve, reject) => {
        ffmpeg(tempInput)
          .toFormat('mp3')
          .save(tempOutput)
          .on('end', resolve)
          .on('error', reject);
      });

      const mp3Buffer = await fs.promises.readFile(tempOutput);
      await sock.sendMessage(chatId, {
        document: mp3Buffer,
        mimetype: 'audio/mpeg',
        fileName: 'audio.mp3'
      }, { quoted: msg });
    } catch (error) {
      console.error('tomp3 error:', error.message);
      await sock.sendMessage(chatId, { text: 'Failed to convert media to MP3.' }, { quoted: msg });
    } finally {
      for (const file of [tempInput, tempOutput]) {
        if (file) await fs.promises.rm(file, { force: true }).catch(() => {});
      }
    }
  }
};
