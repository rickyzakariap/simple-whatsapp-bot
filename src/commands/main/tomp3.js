const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

ffmpeg.setFfmpegPath(ffmpegPath);

module.exports = {
  name: 'tomp3',
  description: 'Convert video or voice note to mp3 audio',
  usage: '.tomp3 (reply to video/voice note)',
  async execute(sock, msg, args) {
    const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted || (!quoted.videoMessage && !quoted.audioMessage)) {
      return sock.sendMessage(msg.key.remoteJid, { text: 'Reply to a video or voice note with .tomp3' }, { quoted: msg });
    }
    let mediaType = quoted.videoMessage ? 'video' : 'audio';
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
    const tempInput = path.join(tempDir, `${Date.now()}.${mediaType === 'video' ? 'mp4' : 'ogg'}`);
    const tempOutput = path.join(tempDir, `${Date.now()}.mp3`);
    fs.writeFileSync(tempInput, buffer);
    await new Promise((resolve, reject) => {
      ffmpeg(tempInput)
        .toFormat('mp3')
        .save(tempOutput)
        .on('end', resolve)
        .on('error', reject);
    });
    const mp3Buffer = fs.readFileSync(tempOutput);
    await sock.sendMessage(msg.key.remoteJid, { document: mp3Buffer, mimetype: 'audio/mpeg', fileName: 'audio.mp3' }, { quoted: msg });
    fs.unlinkSync(tempInput);
    fs.unlinkSync(tempOutput);
  },
}; 