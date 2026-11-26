const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const config = require('../../config');

const execFileAsync = promisify(execFile);
const YTDLP = process.env.YTDLP_PATH || 'yt-dlp';

let availability = null;

async function isAvailable() {
  if (availability !== null) return availability;
  try {
    await execFileAsync(YTDLP, ['--version'], { timeout: 10000 });
    availability = true;
  } catch {
    availability = false;
  }
  return availability;
}

function isValidTikTokUrl(input) {
  try {
    const url = new URL(input);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return false;
    if (['vt.tiktok.com', 'vm.tiktok.com'].includes(url.hostname)) return /^\/[a-z0-9]+\/?$/i.test(url.pathname);
    return ['tiktok.com', 'www.tiktok.com', 'm.tiktok.com'].includes(url.hostname)
      && /^\/(?:@[\w.-]+\/video\/\d+|t\/[a-z0-9]+)\/?$/i.test(url.pathname);
  } catch {
    return false;
  }
}

function downloadTikTokVideo(url) {
  if (!isValidTikTokUrl(url)) throw new Error('Link video TikTok tidak valid');
  return downloadVideo(url, { format: 'b[ext=mp4][format_id!=download][vcodec^=avc1]/b[ext=mp4][format_id!=download][vcodec^=h264]' });
}

async function downloadVideo(url, { maxSize = config.fileProcessing.maxFileSize, format = 'bv*[ext=mp4][height<=480]+ba[ext=m4a]/b[ext=mp4][height<=480]/b[ext=mp4]' } = {}) {
  if (!(await isAvailable())) {
    const error = new Error('yt-dlp is not installed');
    error.code = 'YT_DLP_NOT_INSTALLED';
    throw error;
  }

  const root = path.join(__dirname, '../..', 'temp');
  await fs.promises.mkdir(root, { recursive: true });
  const tempDir = await fs.promises.mkdtemp(path.join(root, 'ytdlp-'));
  const outputPath = path.join(tempDir, 'video.mp4');
  const cleanup = () => fs.promises.rm(tempDir, { recursive: true, force: true });
  const args = [
    '--ignore-config', '--no-playlist', '--no-warnings',
    '--socket-timeout', '12', '--retries', '1',
    '--merge-output-format', 'mp4',
    '--max-filesize', `${Math.floor(maxSize / 1024 / 1024)}M`,
    '-f', format, '-o', outputPath, '--', url
  ];

  try {
    await execFileAsync(YTDLP, args, {
      timeout: 180000,
      maxBuffer: 10 * 1024 * 1024
    });

    const stat = await fs.promises.stat(outputPath).catch(error => {
      if (error.code === 'ENOENT') throw new Error('No video file produced by yt-dlp');
      throw error;
    });
    if (stat.size > maxSize) {
      throw new Error('Video exceeds the 100MB WhatsApp limit');
    }
    if (!stat.size) throw new Error('Downloaded video is empty');
    return { path: outputPath, size: stat.size, cleanup };
  } catch (error) {
    await cleanup().catch(() => {});
    if (error.code === 'ENOENT') {
      const wrapped = new Error('yt-dlp is not installed');
      wrapped.code = 'YT_DLP_NOT_INSTALLED';
      throw wrapped;
    }
    if (error.killed || error.signal === 'SIGTERM') {
      throw new Error('yt-dlp timed out');
    }
    throw error;
  }
}

module.exports = {
  isAvailable,
  isValidTikTokUrl,
  downloadTikTokVideo,
  downloadVideo
};
