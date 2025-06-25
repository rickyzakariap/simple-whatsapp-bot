const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

ffmpeg.setFfmpegPath(ffmpegPath);

module.exports = {
  name: 'toimg',
  description: 'Convert sticker to image (PNG or JPG)',
  usage: '.toimg [png|jpg] (reply to sticker)',
  async execute(sock, msg, args) {
    const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted || !quoted.stickerMessage) {
      return sock.sendMessage(msg.key.remoteJid, { text: 'Reply to a sticker with .toimg [png|jpg]' }, { quoted: msg });
    }
    const format = (args[0] && ['jpg', 'jpeg'].includes(args[0].toLowerCase())) ? 'jpg' : 'png';
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const stream = await downloadMediaMessage(
      { key: msg.key, message: quoted },
      sock
    );
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const tempInput = path.join(tempDir, `${Date.now()}.webp`);
    let tempOutput = path.join(tempDir, `${Date.now()}.${format}`);
    fs.writeFileSync(tempInput, buffer);
    let success = true;
    try {
      await new Promise((resolve, reject) => {
        ffmpeg(tempInput)
          .toFormat(format)
          .save(tempOutput)
          .on('end', resolve)
          .on('error', reject);
      });
    } catch (e) {
      console.log('ffmpeg error (main):', e);
      if (format === 'jpg') {
        // Fallback to PNG
        tempOutput = tempOutput.replace(/\.jpg$/, '.png');
        try {
          await new Promise((resolve, reject) => {
            ffmpeg(tempInput)
              .toFormat('png')
              .save(tempOutput)
              .on('end', resolve)
              .on('error', reject);
          });
          success = false;
        } catch (err) {
          console.log('ffmpeg error (fallback PNG):', err);
          fs.unlinkSync(tempInput);
          return sock.sendMessage(msg.key.remoteJid, { text: 'Failed to convert sticker to image.' }, { quoted: msg });
        }
      } else {
        fs.unlinkSync(tempInput);
        return sock.sendMessage(msg.key.remoteJid, { text: 'Failed to convert sticker to image.' }, { quoted: msg });
      }
    }
    const imgBuffer = fs.readFileSync(tempOutput);
    await sock.sendMessage(msg.key.remoteJid, { image: imgBuffer, caption: `Here is your image.${success ? '' : ' (JPG not supported, sent as PNG)'}` }, { quoted: msg });
    fs.unlinkSync(tempInput);
    fs.unlinkSync(tempOutput);
  },
}; 