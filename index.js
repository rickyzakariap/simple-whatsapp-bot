const {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

const config = require('./config');
const { addPoint } = require('./src/commands/main/points');
const welcomeCmd = require('./src/commands/main/welcome');
const autoresponderStore = require('./src/lib/autoresponder');
const database = require('./src/lib/database');
const apiManager = require('./src/lib/api-manager');
const cache = require('./src/lib/cache');
const performanceMonitor = require('./src/lib/performance-monitor');
const connectionHealth = require('./src/lib/connection-health');
const { getMessageText } = require('./src/lib/message');
const { getSender, mentionJid } = require('./src/lib/permissions');
const { getDateParts } = require('./src/lib/time');

ffmpeg.setFfmpegPath(ffmpegPath);

const CommandLoader = require('./src/lib/command-loader');
const commandsDir = path.join(__dirname, 'src/commands/main');
const commandLoader = new CommandLoader(commandsDir);

const backgroundIntervals = [];
let reconnectTimer = null;
let shuttingDown = false;

async function pollBackground(sock) {
  let alertsRunning = false;
  const priceAlertInterval = setInterval(async () => {
    if (alertsRunning) return;
    alertsRunning = true;
    try {
      const db = await database.load('alerts');
      const alertsToCheck = [];
      for (const user of Object.keys(db)) {
        for (const alert of db[user] || []) {
          if (alert?.symbol && Number.isFinite(Number(alert.price))) {
            alertsToCheck.push({ user, alert });
          }
        }
      }
      if (alertsToCheck.length === 0) return;

      const symbols = [...new Set(alertsToCheck.map(item => item.alert.symbol))].join(',');
      const coins = await apiManager.getCoinPrice(symbols);
      const priceMap = new Map();
      (Array.isArray(coins) ? coins : []).forEach(coin => {
        priceMap.set(String(coin.symbol || '').toLowerCase(), coin);
      });

      let changed = false;
      for (const { user, alert } of alertsToCheck) {
        const coin = priceMap.get(String(alert.symbol).toLowerCase());
        if (!coin) continue;

        const current = Number(coin.current_price);
        const target = Number(alert.price);
        const triggered = alert.direction === 'below' ? current <= target : current >= target;
        if (!triggered) continue;

        try {
          await sock.sendMessage(user, {
            text: `🚨 ${coin.name} (${String(coin.symbol).toUpperCase()}) is $${current} (${alert.direction || 'above'} alert: $${target})`
          });
          db[user] = (db[user] || []).filter(item => item !== alert);
          if (db[user].length === 0) delete db[user];
          changed = true;
        } catch (error) {
          console.error(`Error sending price alert to ${user}:`, error.message);
        }
      }

      if (changed) database.save('alerts', db);
    } catch (error) {
      console.error('Error in price alerts polling:', error.message);
    } finally {
      alertsRunning = false;
    }
  }, config.polling.priceAlerts);
  backgroundIntervals.push(priceAlertInterval);

  const runScheduledMessages = async () => {
    try {
      const db = await database.load('schedules');
      const now = getDateParts(new Date(), config.timezone);
      let changed = false;

      for (const jid of Object.keys(db)) {
        for (const schedule of db[jid] || []) {
          if (schedule.time !== now.hhmm || schedule.lastSent === now.date) continue;
          try {
            await sock.sendMessage(jid, { text: `[Scheduled] ${schedule.message}` });
            schedule.lastSent = now.date;
            changed = true;
          } catch (error) {
            console.error(`Error sending scheduled message to ${jid}:`, error.message);
          }
        }
      }

      if (changed) database.save('schedules', db);
    } catch (error) {
      console.error('Error in scheduled messages polling:', error.message);
    }
  };

  // Check twice per minute so a 60-second interval cannot skip a scheduled
  // minute due to startup offset/drift. `lastSent` prevents duplicates.
  const scheduleInterval = setInterval(runScheduledMessages, Math.min(config.polling.scheduledMessages, 30000));
  backgroundIntervals.push(scheduleInterval);
  await runScheduledMessages();

  const runBirthdayReminders = async () => {
    try {
      const db = await database.load('birthdays');
      const now = getDateParts(new Date(), config.timezone);
      let changed = false;

      for (const [rawUser, rawEntry] of Object.entries(db)) {
        const user = rawUser;
        const entry = typeof rawEntry === 'string'
          ? { date: rawEntry, groups: [], lastSent: null }
          : rawEntry;

        if (!entry || entry.date !== now.mmdd || entry.lastSent === now.date) continue;

        const groups = Array.isArray(entry.groups) ? entry.groups : [];
        let delivered = false;

        if (groups.length === 0) {
          try {
            await sock.sendMessage(user, {
              text: `🎂 Selamat ulang tahun, ${mentionJid(user).replace('@', '')}!`
            });
            delivered = true;
          } catch (error) {
            console.error(`Error sending birthday DM to ${user}:`, error.message);
          }
        } else {
          for (const group of groups) {
            try {
              await sock.sendMessage(group, {
                text: `🎂 Selamat ulang tahun ${mentionJid(user)}!`,
                mentions: [user]
              });
              delivered = true;
            } catch (error) {
              console.error(`Error sending birthday message to ${group}:`, error.message);
            }
          }
        }

        if (delivered) {
          db[rawUser] = { ...entry, groups, lastSent: now.date };
          changed = true;
        }
      }

      if (changed) database.save('birthdays', db);
    } catch (error) {
      console.error('Error in birthday reminders polling:', error.message);
    }
  };

  const birthdayInterval = setInterval(runBirthdayReminders, Math.min(config.polling.birthdayReminders, 30000));
  backgroundIntervals.push(birthdayInterval);
  await runBirthdayReminders();
}

function clearBackgroundIntervals() {
  backgroundIntervals.forEach(interval => clearInterval(interval));
  backgroundIntervals.length = 0;
}

async function sendImageFromBase64(sock, jid, base64Data, quotedMsg) {
  const imageBuffer = Buffer.from(base64Data, 'base64');
  await sock.sendMessage(jid, { image: imageBuffer }, { quoted: quotedMsg });
}

async function sendVideoFromBase64(sock, jid, base64Data, quotedMsg) {
  const videoBuffer = Buffer.from(base64Data, 'base64');
  await sock.sendMessage(jid, { video: videoBuffer }, { quoted: quotedMsg });
}

async function sendAudioFromBase64(sock, jid, base64Data, quotedMsg) {
  const audioBuffer = Buffer.from(base64Data, 'base64');
  await sock.sendMessage(jid, { audio: audioBuffer }, { quoted: quotedMsg });
}

async function sendStickerFromBase64(sock, jid, base64Data, quotedMsg) {
  const stickerBuffer = Buffer.from(base64Data, 'base64');
  await sock.sendMessage(jid, { sticker: stickerBuffer }, { quoted: quotedMsg });
}

async function sendStickerFromUrl(sock, jid, url, quotedMsg) {
  let tempInput = null;
  let tempOutput = null;

  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
      maxContentLength: 25 * 1024 * 1024
    });
    const buffer = Buffer.from(response.data);

    const tempDir = path.join(__dirname, 'temp');
    await fs.promises.mkdir(tempDir, { recursive: true });
    const unique = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    tempInput = path.join(tempDir, `autoresponder_${unique}.jpg`);
    tempOutput = path.join(tempDir, `autoresponder_${unique}.webp`);
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
    await sock.sendMessage(jid, { sticker: stickerBuffer }, { quoted: quotedMsg });
  } catch (error) {
    console.error('Error creating sticker from URL:', error.message);
    await sock.sendMessage(jid, { text: '❌ Failed to create sticker from URL.' }, { quoted: quotedMsg });
  } finally {
    for (const file of [tempInput, tempOutput]) {
      if (file) await fs.promises.rm(file, { force: true }).catch(() => {});
    }
  }
}

async function sendTriggerResponse(sock, msg, response) {
  const jid = msg.key.remoteJid;

  if (response.startsWith('MEDIA_FILE:')) {
    const media = await autoresponderStore.readMedia(response);
    if (!media) {
      return sock.sendMessage(jid, { text: '❌ Trigger media file is missing. Please re-add the trigger.' }, { quoted: msg });
    }
    if (media.mime === 'image/webp') {
      return sock.sendMessage(jid, { sticker: media.buffer }, { quoted: msg });
    }
    if (media.mime.startsWith('image/')) {
      return sock.sendMessage(jid, { image: media.buffer }, { quoted: msg });
    }
    if (media.mime.startsWith('video/')) {
      return sock.sendMessage(jid, { video: media.buffer, mimetype: media.mime }, { quoted: msg });
    }
    if (media.mime.startsWith('audio/')) {
      return sock.sendMessage(jid, { audio: media.buffer, mimetype: media.mime }, { quoted: msg });
    }
    return sock.sendMessage(jid, { document: media.buffer, mimetype: media.mime, fileName: media.name }, { quoted: msg });
  }

  if (response.startsWith('STICKER:')) {
    return sendStickerFromUrl(sock, jid, response.substring(8).trim(), msg);
  }
  if (response.startsWith('STICKER_BASE64:')) {
    return sendStickerFromBase64(sock, jid, response.substring(15), msg);
  }
  if (response.startsWith('IMAGE_BASE64:')) {
    return sendImageFromBase64(sock, jid, response.substring(13), msg);
  }
  if (response.startsWith('VIDEO_BASE64:')) {
    return sendVideoFromBase64(sock, jid, response.substring(13), msg);
  }
  if (response.startsWith('AUDIO_BASE64:')) {
    return sendAudioFromBase64(sock, jid, response.substring(13), msg);
  }
  if (response.startsWith('FORWARD:')) {
    const forwardData = JSON.parse(response.substring(8));
    return sock.sendMessage(jid, forwardData.message, { quoted: msg });
  }
  if (response.startsWith('STICKER_REF:')) {
    return sock.sendMessage(jid, { text: '❌ This sticker trigger is no longer supported. Please re-add it.' }, { quoted: msg });
  }

  return sock.sendMessage(jid, { text: response }, { quoted: msg });
}

async function handleMessage(sock, msg) {
  if (!msg?.message || msg.key?.fromMe) return;

  const jid = msg.key?.remoteJid;
  if (!jid || jid === 'status@broadcast' || jid.endsWith('@newsletter')) return;

  const startTime = Date.now();

  try {
    performanceMonitor.recordMessage();
    connectionHealth.messageReceived();

    const body = getMessageText(msg.message);
    const sender = getSender(msg) || jid;
    const isCommand = body.startsWith(config.commandPrefix);

    // Passive points are only awarded for normal chat messages, not commands.
    if (!isCommand) {
      await addPoint(jid, sender, 1);
    }

    if (!isCommand && body.trim()) {
      const triggers = await autoresponderStore.getTriggers(jid);
      const normalizedBody = body.toLowerCase();
      for (const [trigger, response] of Object.entries(triggers)) {
        if (!trigger || !normalizedBody.includes(trigger.toLowerCase())) continue;
        try {
          await sendTriggerResponse(sock, msg, response);
        } catch (error) {
          console.error('Error sending autoresponder:', error.message);
          await sock.sendMessage(jid, { text: '❌ Failed to send auto-reply.' }, { quoted: msg }).catch(() => {});
        }
        break;
      }
    }

    if (!isCommand) return;

    const args = body.slice(config.commandPrefix.length).trim().split(/\s+/).filter(Boolean);
    const command = args.shift()?.toLowerCase();
    if (!command || !commandLoader.hasCommand(command)) return;

    console.log('COMMAND TRIGGERED:', command, args);
    try {
      const cmd = await commandLoader.getCommand(command);
      if (!cmd) {
        return sock.sendMessage(jid, { text: '❌ Failed to load command.' }, { quoted: msg });
      }
      await cmd.execute(sock, msg, args);
      performanceMonitor.recordCommand(command, startTime);
    } catch (error) {
      console.error(`Error executing command ${command}:`, error);
      performanceMonitor.recordError(error, `command:${command}`);
      await sock.sendMessage(jid, { text: `❌ Command failed: ${error.message}` }, { quoted: msg }).catch(() => {});
    }
  } catch (error) {
    console.error('Error processing message:', error.message);
    performanceMonitor.recordError(error, 'message_processing');
  }
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(config.sessionName);

  let version;
  try {
    ({ version } = await fetchLatestBaileysVersion());
  } catch (error) {
    console.warn('Could not fetch latest Baileys version:', error.message);
  }

  const sock = makeWASocket({
    version,
    auth: state,
    browser: [config.botName, 'Chrome', '120.0.0.0'],
    syncFullHistory: false,
    markOnlineOnConnect: false
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) qrcode.generate(qr, { small: true });

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.message || 'unknown';
      connectionHealth.connectionClosed(reason);
      clearBackgroundIntervals();
      connectionHealth.stopMonitoring();

      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      if (loggedOut) {
        console.log(chalk.red('Logged out. Not reconnecting.'));
        await shutdown();
        return;
      }

      if (!connectionHealth.shouldReconnect()) {
        console.log(chalk.red('Max reconnect attempts reached.'));
        await shutdown();
        return;
      }

      const delay = connectionHealth.getReconnectDelay();
      console.log(chalk.yellow(`Reconnecting in ${delay}ms...`));
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        startBot().catch(error => console.error('Reconnect failed:', error.message));
      }, delay);
      return;
    }

    if (connection === 'open') {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      connectionHealth.connectionOpened();
      console.log(chalk.green(`${config.botName} is ready!`));

      await commandLoader.initialize();
      await commandLoader.preloadCommands(['help', 'menu', 'ping', 'points', 'coin']);
      await database.preload();

      performanceMonitor.start();
      connectionHealth.startMonitoring(sock);

      clearBackgroundIntervals();
      await pollBackground(sock);
    }
  });

  sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
    if (!['add', 'remove'].includes(action)) return;

    const messageTemplate = action === 'add'
      ? await welcomeCmd.getWelcome(id)
      : await welcomeCmd.getGoodbye(id);
    if (!messageTemplate) return;

    for (const user of participants || []) {
      try {
        const text = messageTemplate
          .replace(/@user/g, mentionJid(user))
          .replace(/@group/g, id.split('@')[0]);
        await sock.sendMessage(id, { text, mentions: [user] });
      } catch (error) {
        console.error(`Error sending ${action} message to ${user}:`, error.message);
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    // "append" contains history/backlog; only "notify" is a new message.
    if (type && type !== 'notify') return;
    for (const message of messages || []) {
      await handleMessage(sock, message);
    }
  });

  return sock;
}

async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(chalk.yellow('\nShutting down bot...'));
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  clearBackgroundIntervals();
  commandLoader.shutdown();
  performanceMonitor.stop();
  connectionHealth.stopMonitoring();

  await database.flush();
  await cache.shutdown();
  apiManager.shutdown();

  console.log(chalk.blue('Shutdown complete'));
  process.exit(0);
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

startBot().catch(error => {
  console.error(chalk.red('Failed to start bot:'), error);
  process.exitCode = 1;
});
