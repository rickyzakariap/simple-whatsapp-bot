const { Search } = require('abot-scraper');
const axios = require('axios');
const search = new Search();

module.exports = {
  name: 'igstory',
  description: 'Get Instagram user stories',
  async execute(sock, msg, args) {
    const username = args[0];
    if (!username) return await sock.sendMessage(msg.key.remoteJid, { text: 'Please provide an Instagram username!\nExample: .igstory cristiano' }, { quoted: msg });
    try {
      const result = await search.igStory(username);
      if (result.status === 200 && Array.isArray(result.result) && result.result.length > 0) {
        await sock.sendMessage(msg.key.remoteJid, { text: `*Instagram Stories for @${username}:*` }, { quoted: msg });
        for (const story of result.result) {
          if (!story.url) continue;
          const mediaRes = await axios.get(story.url, {
            responseType: 'arraybuffer',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });
          if (story.type === 'video') {
            await sock.sendMessage(
              msg.key.remoteJid,
              { video: Buffer.from(mediaRes.data), mimetype: 'video/mp4', fileName: 'story.mp4' },
              { quoted: msg }
            );
          } else if (story.type === 'image') {
            await sock.sendMessage(
              msg.key.remoteJid,
              { image: Buffer.from(mediaRes.data), mimetype: 'image/jpeg', fileName: 'story.jpg' },
              { quoted: msg }
            );
          }
        }
      } else {
        await sock.sendMessage(msg.key.remoteJid, { text: 'No stories found or user is private.' }, { quoted: msg });
      }
    } catch (e) {
      await sock.sendMessage(msg.key.remoteJid, { text: 'Error: ' + (e.message || JSON.stringify(e) || e) }, { quoted: msg });
    }
  }
}; 