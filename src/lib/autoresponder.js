const fs = require('fs');
const path = require('path');
const database = require('./database');

const ROOT_DIR = path.join(__dirname, '../..');
const MEDIA_DIR = path.join(ROOT_DIR, 'uploads', 'triggers');

async function getTriggers(chatId) {
  const db = await database.load('autoresponder');
  return db[chatId] || {};
}

async function setTrigger(chatId, trigger, response) {
  const db = await database.load('autoresponder');
  db[chatId] = db[chatId] || {};
  db[chatId][trigger] = response;
  database.save('autoresponder', db);
}

async function removeTrigger(chatId, trigger) {
  const db = await database.load('autoresponder');
  if (!db[chatId] || !db[chatId][trigger]) return false;

  const response = db[chatId][trigger];
  delete db[chatId][trigger];
  if (Object.keys(db[chatId]).length === 0) delete db[chatId];
  database.save('autoresponder', db);

  await deleteMediaIfPresent(response);
  return true;
}

function mediaExtension(kind) {
  return {
    sticker: 'webp',
    image: 'jpg',
    video: 'mp4',
    audio: 'ogg'
  }[kind] || 'bin';
}

async function saveMedia(buffer, kind) {
  await fs.promises.mkdir(MEDIA_DIR, { recursive: true });
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${mediaExtension(kind)}`;
  const filePath = path.join(MEDIA_DIR, filename);
  await fs.promises.writeFile(filePath, buffer);
  const relativePath = path.relative(ROOT_DIR, filePath);
  return `MEDIA_FILE:${JSON.stringify({
    path: relativePath,
    mime: kind === 'sticker' ? 'image/webp' : kind === 'image' ? 'image/jpeg' : kind === 'video' ? 'video/mp4' : 'audio/ogg',
    name: filename
  })}`;
}

function parseMediaFile(response) {
  if (!response || !response.startsWith('MEDIA_FILE:')) return null;
  try {
    const info = JSON.parse(response.slice('MEDIA_FILE:'.length));
    if (!info.path || typeof info.path !== 'string') return null;
    const absolutePath = path.resolve(ROOT_DIR, info.path);
    if (!absolutePath.startsWith(MEDIA_DIR + path.sep)) return null;
    return {
      path: absolutePath,
      mime: info.mime || 'application/octet-stream',
      name: info.name || path.basename(absolutePath)
    };
  } catch {
    return null;
  }
}

async function readMedia(response) {
  const info = parseMediaFile(response);
  if (!info) return null;
  try {
    const buffer = await fs.promises.readFile(info.path);
    return { ...info, buffer };
  } catch {
    return null;
  }
}

async function deleteMediaIfPresent(response) {
  const info = parseMediaFile(response);
  if (!info) return;
  await fs.promises.rm(info.path, { force: true }).catch(() => {});
}

function describeResponse(response) {
  if (!response) return '(empty)';
  if (response.startsWith('MEDIA_FILE:')) {
    const info = parseMediaFile(response);
    return `MEDIA FILE (${info?.name || 'unknown'})`;
  }
  if (response.startsWith('STICKER:')) return 'STICKER (from URL)';
  if (response.startsWith('STICKER_BASE64:')) return 'STICKER (legacy base64)';
  if (response.startsWith('IMAGE_BASE64:')) return 'IMAGE (legacy base64)';
  if (response.startsWith('VIDEO_BASE64:')) return 'VIDEO (legacy base64)';
  if (response.startsWith('AUDIO_BASE64:')) return 'AUDIO (legacy base64)';
  if (response.startsWith('FORWARD:')) return 'FORWARD (reply)';
  return response;
}

module.exports = {
  MEDIA_DIR,
  getTriggers,
  setTrigger,
  removeTrigger,
  saveMedia,
  parseMediaFile,
  readMedia,
  describeResponse
};
