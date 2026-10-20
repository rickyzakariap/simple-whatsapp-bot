const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { getQuotedMessage } = require('../../lib/message');

ffmpeg.setFfmpegPath(ffmpegPath);

module.exports = {
  name: 'toimg',
  description: 'Convert a sticker to an image (PNG or JPG)',
  usage: '.toimg [png|jpg] (reply to sticker)',
  async execute(sock, msg, args) {
    const chatId = msg.key.remoteJid;
    let tempInput = null;
    let tempOutput = null;

    try {
      const quoted = getQuotedMessage(msg);
      if (!quoted || !quoted.message.stickerMessage) {
        return sock.sendMessage(chatId, { text: 'Reply to a sticker with .toimg [png|jpg]' }, { quoted: msg });
      }

      const format = ['jpg', 'jpeg'].includes((args[0] || '').toLowerCase()) ? 'jpg' : 'png';
      const buffer = await downloadMediaMessage(
        { key: quoted.key, message: quoted.message },
        'buffer',
        {},
        sock
      );
      if (!buffer || buffer.length === 0) throw new Error('Empty sticker');

      const tempDir = path.join(__dirname, '../temp');
      await fs.promises.mkdir(tempDir, { recursive: true });
      const unique = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      tempInput = path.join(tempDir, `${unique}.webp`);
      tempOutput = path.join(tempDir, `${unique}.${format}`);
      await fs.promises.writeFile(tempInput, buffer);

      let sentFormat = format;
      try {
        await convert(tempInput, tempOutput, format);
      } catch (error) {
        if (format !== 'jpg') throw error;
        sentFormat = 'png';
        tempOutput = path.join(tempDir, `${unique}.png`);
        await convert(tempInput, tempOutput, 'png');
      }

      const imageBuffer = await fs.promises.readFile(tempOutput);
      await sock.sendMessage(chatId, {
        image: imageBuffer,
        caption: `Here is your image.${sentFormat === 'png' && format === 'jpg' ? ' (JPG not supported, sent as PNG)' : ''}`
      }, { quoted: msg });
    } catch (error) {
      console.error('toimg error:', error.message);
      await sock.sendMessage(chatId, { text: 'Failed to convert sticker to image.' }, { quoted: msg });
    } finally {
      for (const file of [tempInput, tempOutput]) {
        if (file) await fs.promises.rm(file, { force: true }).catch(() => {});
      }
    }
  }
};

function convert(input, output, format) {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .toFormat(format)
      .save(output)
      .on('end', resolve)
      .on('error', reject);
  });
}
