const axios = require('axios');

const MEDIA_LIMIT = 10;
const MAX_BYTES = 100 * 1024 * 1024;

function postPath(input) {
  try {
    const url = new URL(input);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    if (!['www.instagram.com', 'instagram.com'].includes(url.hostname)) return null;
    return /^\/(p|reel)\/([A-Za-z0-9_-]{1,64})\/?$/.exec(url.pathname)?.slice(1) || null;
  } catch {
    return null;
  }
}

function getMedia(html, shortcode) {
  // Public embeds put a JSON string inside a script. Parse data without executing it.
  for (const match of html.matchAll(/"contextJSON"\s*:\s*("(?:[^"\\]|\\[\s\S])*")/g)) {
    try {
      const media = JSON.parse(JSON.parse(match[1])).gql_data?.shortcode_media;
      if (media?.shortcode !== shortcode) continue;
      return media.edge_sidecar_to_children?.edges?.map(edge => edge?.node) || [media];
    } catch {
      // Ignore unrelated embed data.
    }
  }
  return [];
}

function cdnUrl(input) {
  try {
    const url = new URL(input);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    if (!url.hostname.endsWith('.cdninstagram.com') && !url.hostname.endsWith('.fbcdn.net')) return null;
    return url.href;
  } catch {
    return null;
  }
}

function mediaPayload(response, video) {
  const mime = response.headers?.['content-type']?.split(';')[0].trim().toLowerCase();
  const bytes = Buffer.from(response.data);
  if (video && mime === 'video/mp4' && bytes.toString('latin1', 4, 8) === 'ftyp') {
    return { video: bytes, mimetype: 'video/mp4', fileName: 'instagram.mp4' };
  }
  const jpeg = mime === 'image/jpeg' && bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  const png = mime === 'image/png' && bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
  const webp = mime === 'image/webp' && bytes.toString('latin1', 0, 4) === 'RIFF' && bytes.toString('latin1', 8, 12) === 'WEBP';
  if (!video && (jpeg || png || webp)) return { image: bytes, mimetype: mime };
  return null;
}

module.exports = {
  name: 'ig',
  description: 'Download foto/video Instagram post atau Reel publik',
  usage: '.ig <link post atau Reel publik>',
  async execute(sock, msg, args) {
    const reply = body => sock.sendMessage(msg.key.remoteJid, body, { quoted: msg });
    const path = postPath(args[0]);
    if (!path) return reply({ text: 'Masukkan link post atau Reel Instagram publik. Contoh: .ig https://www.instagram.com/p/...' });

    const [kind, shortcode] = path;
    const signal = AbortSignal.timeout(60_000);
    const request = { signal, timeout: 12_000, maxRedirects: 0 };
    let items;
    try {
      const { data } = await axios.get(`https://www.instagram.com/${kind}/${shortcode}/embed/`, {
        ...request, responseType: 'text', maxContentLength: 2 * 1024 * 1024
      });
      items = getMedia(data, shortcode);
    } catch (error) {
      console.error('Instagram public embed failed:', error.response?.status || error.code || error.name);
      items = [];
    }

    let sent = 0;
    for (const media of items.slice(0, MEDIA_LIMIT)) {
      if (signal.aborted) break;
      const video = media?.is_video === true;
      const url = cdnUrl(video ? media?.video_url : media?.display_url);
      if (!url) continue;
      try {
        const response = await axios.get(url, { ...request, responseType: 'arraybuffer', maxContentLength: MAX_BYTES });
        const payload = mediaPayload(response, video);
        if (!payload) continue;
        await reply(payload);
        sent++;
      } catch (error) {
        console.error('Instagram media failed:', error.response?.status || error.code || error.name);
      }
    }

    if (!sent) return reply({ text: 'Media Instagram tidak bisa diunduh. Pastikan post atau Reel publik dan dapat dibuka.' });
    if (sent < items.length) {
      return reply({ text: `Terkirim ${sent} dari ${items.length} item. Maksimal ${MEDIA_LIMIT} item per perintah.` });
    }
  }
};
