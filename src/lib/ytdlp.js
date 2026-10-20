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

async function downloadVideo(url, options = {}) {
  if (!(await isAvailable())) {
    const error = new Error('yt-dlp is not installed');
    error.code = 'YT_DLP_NOT_INSTALLED';
    throw error;
  }

  const maxSize = options.maxSize || config.fileProcessing.maxFileSize;
  const tempDir = path.join(__dirname, '../..', 'temp');
  await fs.promises.mkdir(tempDir, { recursive: true });

  const outputPath = path.join(tempDir, `yt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.mp4`);
  const args = [
    '--no-playlist',
    '--no-warnings',
    '--merge-output-format', 'mp4',
    '--max-filesize', `${Math.floor(maxSize / 1024 / 1024)}M`,
    '-f', 'bv*[ext=mp4][height<=480]+ba[ext=m4a]/b[ext=mp4][height<=480]/b[ext=mp4]',
    '-o', outputPath,
    url
  ];

  try {
    await execFileAsync(YTDLP, args, {
      timeout: 180000,
      maxBuffer: 10 * 1024 * 1024
    });

    const stat = await fs.promises.stat(outputPath);
    if (stat.size > maxSize) {
      throw new Error('Video exceeds the 100MB WhatsApp limit');
    }
    return { path: outputPath, size: stat.size };
  } catch (error) {
    await fs.promises.rm(outputPath, { force: true });
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
  downloadVideo
};
