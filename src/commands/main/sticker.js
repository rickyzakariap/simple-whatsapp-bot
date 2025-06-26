const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

ffmpeg.setFfmpegPath(ffmpegPath);

module.exports = {
  name: 'sticker',
  description: 'Convert image, video, or image URL to sticker',
  usage: '.sticker (reply to image/video or send image URL)',
  async execute(sock, msg, args) {
    let tempInput = null;
    let tempOutput = null;
    
    try {
      const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
      let buffer, mediaType;
      
      if (quoted) {
        if (quoted.imageMessage) {
          mediaType = 'image';
        } else if (quoted.videoMessage) {
          mediaType = 'video';
        } else {
          return sock.sendMessage(msg.key.remoteJid, { text: 'Reply to an image or short video.' }, { quoted: msg });
        }
        
        const stream = await downloadMediaMessage(
          { key: msg.key, message: quoted },
          sock
        );
        const chunks = [];
        for await (const chunk of stream) {
          chunks.push(chunk);
        }
        buffer = Buffer.concat(chunks);
      } else if (args[0] && args[0].startsWith('http')) {
        // Download image from URL
        try {
          const res = await axios.get(args[0], { 
            responseType: 'arraybuffer',
            timeout: 30000 // 30 second timeout
          });
          buffer = Buffer.from(res.data);
          mediaType = 'image';
        } catch (e) {
          return sock.sendMessage(msg.key.remoteJid, { text: 'Gagal mengunduh gambar dari URL.' }, { quoted: msg });
        }
      } else {
        return sock.sendMessage(msg.key.remoteJid, { text: 'Reply to an image/video or send an image URL with .sticker' }, { quoted: msg });
      }
      
      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      tempInput = path.join(tempDir, `${Date.now()}.${mediaType === 'image' ? 'jpg' : 'mp4'}`);
      tempOutput = path.join(tempDir, `${Date.now()}.webp`);
      
      fs.writeFileSync(tempInput, buffer);
      
      await new Promise((resolve, reject) => {
        let command = ffmpeg(tempInput)
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
      
      const stickerBuffer = fs.readFileSync(tempOutput);
      await sock.sendMessage(msg.key.remoteJid, { sticker: stickerBuffer }, { quoted: msg });
      
    } catch (error) {
      console.error('Sticker command error:', error);
      await sock.sendMessage(msg.key.remoteJid, { text: '❌ Error: Failed to create sticker.' }, { quoted: msg });
    } finally {
      // Clean up temporary files
      try {
        if (tempInput && fs.existsSync(tempInput)) {
          fs.unlinkSync(tempInput);
        }
        if (tempOutput && fs.existsSync(tempOutput)) {
          fs.unlinkSync(tempOutput);
        }
      } catch (cleanupError) {
        console.error('Error cleaning up temporary files:', cleanupError.message);
      }
    }
  },
}; 