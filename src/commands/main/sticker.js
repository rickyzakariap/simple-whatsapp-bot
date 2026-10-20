const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { getQuotedMessage } = require('../../lib/message');

ffmpeg.setFfmpegPath(ffmpegPath);

module.exports = {
  name: 'sticker',
  description: 'Convert an image, video, or image URL to a sticker',
  usage: '.sticker (reply to image/video or send image URL)',
  async execute(sock, msg, args) {
    let tempInput = null;
    let tempOutput = null;

    try {
      const quoted = getQuotedMessage(msg);
      let buffer;
      let mediaType = 'image';

      if (quoted) {
        if (quoted.message.imageMessage) {
          mediaType = 'image';
        } else if (quoted.message.videoMessage) {
          mediaType = 'video';
        } else {
          return sock.sendMessage(msg.key.remoteJid, { text: 'Reply to an image or short video.' }, { quoted: msg });
        }

        buffer = await downloadMediaMessage(
          { key: quoted.key, message: quoted.message },
          'buffer',
          {},
          sock
        );
      } else if (args[0] && /^https?:\/\//i.test(args[0])) {
        const response = await axios.get(args[0], {
          responseType: 'arraybuffer',
          timeout: 30000,
          maxContentLength: 25 * 1024 * 1024
        });
        buffer = Buffer.from(response.data);
      } else {
        return sock.sendMessage(msg.key.remoteJid, {
          text: 'Reply to an image/video or send an image URL with .sticker'
        }, { quoted: msg });
      }

      if (!buffer || buffer.length === 0) throw new Error('Empty media');

      const tempDir = path.join(__dirname, '../temp');
      await fs.promises.mkdir(tempDir, { recursive: true });

      tempInput = path.join(tempDir, `${Date.now()}_${Math.random().toString(36).slice(2)}.${mediaType === 'image' ? 'jpg' : 'mp4'}`);
      tempOutput = path.join(tempDir, `${Date.now()}_${Math.random().toString(36).slice(2)}.webp`);
      await fs.promises.writeFile(tempInput, buffer);

      await new Promise((resolve, reject) => {
        ffmpeg(tempInput)
          .outputOptions([
            '-vcodec', 'libwebp',
            '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,fps=15',
            '-lossless', '1',
            '-compression_level', '6',
            '-q:v', '50',
            '-loop', '0',
            '-preset', 'default',
            '-an',
            '-vsync', '0'
          ])
          .toFormat('webp')
          .save(tempOutput)
          .on('end', resolve)
          .on('error', reject);
      });

      const stickerBuffer = await fs.promises.readFile(tempOutput);
      await sock.sendMessage(msg.key.remoteJid, { sticker: stickerBuffer }, { quoted: msg });
    } catch (error) {
      console.error('Sticker command error:', error);
      await sock.sendMessage(msg.key.remoteJid, { text: '❌ Failed to create sticker.' }, { quoted: msg });
    } finally {
      for (const file of [tempInput, tempOutput]) {
        if (file) await fs.promises.rm(file, { force: true }).catch(() => {});
      }
    }
  }
};
