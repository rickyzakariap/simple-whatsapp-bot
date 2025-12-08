const { makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion, downloadMediaMessage } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const axios = require('axios');
const config = require('./config');
const { addPoint } = require('./src/commands/main/points');
const welcomeCmd = require('./src/commands/main/welcome');
const autoresponderCmd = require('./src/commands/main/autoresponder');
const database = require('./src/lib/database');
const apiManager = require('./src/lib/api-manager');
const cache = require('./src/lib/cache');
const performanceMonitor = require('./src/lib/performance-monitor');
const connectionHealth = require('./src/lib/connection-health');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

ffmpeg.setFfmpegPath(ffmpegPath);

// Initialize optimized command loader
const CommandLoader = require('./src/lib/command-loader');
const commandsDir = path.join(__dirname, 'src/commands/main');
const commandLoader = new CommandLoader(commandsDir);

// Legacy functions replaced by database layer
async function loadJson(p) {
  const filename = path.basename(p, '.json');
  return await database.load(filename, {});
}

function saveJson(p, d) {
  const filename = path.basename(p, '.json');
  database.save(filename, d);
}

// Store interval IDs for proper cleanup
const backgroundIntervals = [];

async function pollBackground(sock) {
  // Price Alerts - Optimized with caching and rate limiting
  const priceAlertInterval = setInterval(async () => {
    try {
      const db = await database.load('alerts');
      const alertsToCheck = [];

      // Collect all unique symbols to check
      const symbolsToCheck = new Set();
      for (const user in db) {
        for (const alert of db[user]) {
          symbolsToCheck.add(alert.symbol);
          alertsToCheck.push({ user, alert });
        }
      }

      if (symbolsToCheck.size === 0) return;

      // Batch check prices for all symbols
      const symbols = Array.from(symbolsToCheck).join(',');
      try {
        const data = await apiManager.getCoinPrice(symbols);
        const priceMap = new Map();
        data.forEach(coin => {
          priceMap.set(coin.symbol.toLowerCase(), coin);
        });

        // Check alerts and send notifications
        const updatedDb = { ...db };
        for (const { user, alert } of alertsToCheck) {
          const coin = priceMap.get(alert.symbol.toLowerCase());
          if (coin && coin.current_price >= alert.price) {
            await sock.sendMessage(user, {
              text: `🚨 ${coin.name} (${coin.symbol.toUpperCase()}) hit $${coin.current_price} (alert: $${alert.price})`
            });
            updatedDb[user] = updatedDb[user].filter(a => a !== alert);
          }
        }

        database.save('alerts', updatedDb);
      } catch (error) {
        console.error('Error checking price alerts:', error.message);
      }
    } catch (error) {
      console.error('Error in price alerts polling:', error.message);
    }
  }, config.polling.priceAlerts);

  backgroundIntervals.push(priceAlertInterval);

  // Scheduled Messages - Optimized
  const scheduleInterval = setInterval(async () => {
    try {
      const db = await database.load('schedules');
      const now = new Date();
      const hhmm = now.toTimeString().slice(0, 5);

      const messagesToSend = [];
      for (const jid in db) {
        const schedules = db[jid] || [];
        for (const s of schedules) {
          if (s.time === hhmm) {
            messagesToSend.push({ jid, message: s.message });
          }
        }
      }

      // Send messages concurrently
      if (messagesToSend.length > 0) {
        await Promise.allSettled(
          messagesToSend.map(({ jid, message }) =>
            sock.sendMessage(jid, { text: `[Scheduled] ${message}` })
              .catch(error => console.error(`Error sending scheduled message to ${jid}:`, error.message))
          )
        );
      }
    } catch (error) {
      console.error('Error in scheduled messages polling:', error.message);
    }
  }, config.polling.scheduledMessages);

  backgroundIntervals.push(scheduleInterval);

  // Birthday Reminders - Optimized
  const birthdayInterval = setInterval(async () => {
    try {
      const db = await database.load('birthdays');
      const now = new Date();
      const mmdd = ('0' + (now.getMonth() + 1)).slice(-2) + '-' + ('0' + now.getDate()).slice(-2);

      const birthdayMessages = [];
      for (const user in db) {
        if (db[user] === mmdd) {
          const jid = user.includes('@g.us') ? user : null;
          const mention = user;
          if (jid) {
            birthdayMessages.push({ jid, mention });
          }
        }
      }

      // Send birthday messages concurrently
      if (birthdayMessages.length > 0) {
        await Promise.allSettled(
          birthdayMessages.map(({ jid, mention }) =>
            sock.sendMessage(jid, {
              text: `🎂 Selamat ulang tahun @${mention.split('@')[0]}!`,
              mentions: [mention]
            }).catch(error => console.error(`Error sending birthday message to ${jid}:`, error.message))
          )
        );
      }
    } catch (error) {
      console.error('Error in birthday reminders polling:', error.message);
    }
  }, config.polling.birthdayReminders);

  backgroundIntervals.push(birthdayInterval);
}

// Function to clear all background intervals
function clearBackgroundIntervals() {
  backgroundIntervals.forEach(interval => {
    clearInterval(interval);
  });
  backgroundIntervals.length = 0;
}

// Function to send image from base64 data
async function sendImageFromBase64(sock, jid, base64Data, quotedMsg) {
  try {
    const imageBuffer = Buffer.from(base64Data, 'base64');
    await sock.sendMessage(jid, { image: imageBuffer }, { quoted: quotedMsg });
  } catch (error) {
    console.error('Error sending image from base64:', error);
    throw error;
  }
}

// Function to send video from base64 data
async function sendVideoFromBase64(sock, jid, base64Data, quotedMsg) {
  try {
    const videoBuffer = Buffer.from(base64Data, 'base64');
    await sock.sendMessage(jid, { video: videoBuffer }, { quoted: quotedMsg });
  } catch (error) {
    console.error('Error sending video from base64:', error);
    throw error;
  }
}

// Function to send audio from base64 data
async function sendAudioFromBase64(sock, jid, base64Data, quotedMsg) {
  try {
    const audioBuffer = Buffer.from(base64Data, 'base64');
    await sock.sendMessage(jid, { audio: audioBuffer }, { quoted: quotedMsg });
  } catch (error) {
    console.error('Error sending audio from base64:', error);
    throw error;
  }
}

// Function to send sticker from base64 data
async function sendStickerFromBase64(sock, jid, base64Data, quotedMsg) {
  try {
    const stickerBuffer = Buffer.from(base64Data, 'base64');
    await sock.sendMessage(jid, { sticker: stickerBuffer }, { quoted: quotedMsg });
  } catch (error) {
    console.error('Error sending sticker from base64:', error);
    // Fallback to text message if sticker sending fails
    await sock.sendMessage(jid, { text: '❌ Failed to send sticker.' }, { quoted: quotedMsg });
  }
}

// Function to send sticker from URL
async function sendStickerFromUrl(sock, jid, url, quotedMsg) {
  let tempInput = null;
  let tempOutput = null;

  try {
    // Download image from URL
    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000 // 30 second timeout
    });
    const buffer = Buffer.from(res.data);

    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    tempInput = path.join(tempDir, `autoresponder_${Date.now()}.jpg`);
    tempOutput = path.join(tempDir, `autoresponder_${Date.now()}.webp`);

    fs.writeFileSync(tempInput, buffer);

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

    const stickerBuffer = fs.readFileSync(tempOutput);
    await sock.sendMessage(jid, { sticker: stickerBuffer }, { quoted: quotedMsg });

  } catch (error) {
    console.error('Error creating sticker from URL:', error);
    // Fallback to text message if sticker creation fails
    await sock.sendMessage(jid, { text: '❌ Failed to create sticker from URL.' }, { quoted: quotedMsg });
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
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(config.sessionName);
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    auth: state,
    browser: ['OngBak-Bot', 'Chrome', '110.0.0.0'],
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) qrcode.generate(qr, { small: true });
    if (connection === 'close') {
      const reason = lastDisconnect?.error?.message || 'unknown';
      connectionHealth.connectionClosed(reason);

      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(chalk.red('Connection closed. Reconnecting...'));

      // Clear intervals before reconnecting
      clearBackgroundIntervals();
      connectionHealth.stopMonitoring();

      if (shouldReconnect && connectionHealth.shouldReconnect()) {
        const delay = connectionHealth.getReconnectDelay();
        console.log(chalk.yellow(`Reconnecting in ${delay}ms...`));
        setTimeout(() => startBot(), delay);
      } else if (!shouldReconnect) {
        console.log(chalk.red('Logged out. Not reconnecting.'));
      } else {
        console.log(chalk.red('Max reconnect attempts reached.'));
      }
    } else if (connection === 'open') {
      connectionHealth.connectionOpened();
      console.log(chalk.green('OngBak-Bot is ready!'));

      // Initialize command loader
      await commandLoader.initialize();
      console.log(chalk.blue('Command loader initialized'));

      // Preload frequently used commands
      const frequentCommands = ['help', 'menu', 'ping', 'points', 'coin'];
      await commandLoader.preloadCommands(frequentCommands);

      // Preload frequently accessed data
      await database.preload();
      console.log(chalk.blue('Database preloaded successfully'));

      // Start performance monitoring
      performanceMonitor.start();
      console.log(chalk.blue('Performance monitoring started'));

      // Start connection health monitoring
      connectionHealth.startMonitoring(sock);
      console.log(chalk.blue('Connection health monitoring started'));
    }
  });

  sock.ev.on('group-participants.update', async (update) => {
    const { id, participants, action } = update;
    if (action === 'add') {
      const welcome = welcomeCmd.getWelcome(id);
      if (welcome) {
        for (const user of participants) {
          try {
            const text = welcome.replace(/@user/g, '@' + user.split('@')[0]).replace(/@group/g, id.split('@')[0]);
            await sock.sendMessage(id, { text, mentions: [user] });
          } catch (error) {
            console.error(`Error sending welcome message to ${user}:`, error.message);
          }
        }
      }
    } else if (action === 'remove') {
      const goodbye = welcomeCmd.getGoodbye(id);
      if (goodbye) {
        for (const user of participants) {
          try {
            const text = goodbye.replace(/@user/g, '@' + user.split('@')[0]).replace(/@group/g, id.split('@')[0]);
            await sock.sendMessage(id, { text, mentions: [user] });
          } catch (error) {
            console.error(`Error sending goodbye message to ${user}:`, error.message);
          }
        }
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const startTime = Date.now();

    try {
      // Record message processing
      performanceMonitor.recordMessage();

      // Passive point for any message
      await addPoint(msg.key.remoteJid, msg.key.participant || msg.key.remoteJid, 1);

      // Autoresponder logic
      const triggers = autoresponderCmd.getTriggers(msg.key.remoteJid);
      const body = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
      for (const [trigger, response] of Object.entries(triggers)) {
        if (body.toLowerCase().includes(trigger)) {
          try {
            // Check if response is a sticker format
            if (response.startsWith('STICKER:')) {
              const stickerUrl = response.substring(8).trim();
              await sendStickerFromUrl(sock, msg.key.remoteJid, stickerUrl, msg);
            } else if (response.startsWith('STICKER_BASE64:')) {
              const stickerBase64 = response.substring(15);
              try {
                await sendStickerFromBase64(sock, msg.key.remoteJid, stickerBase64, msg);
              } catch (e) {
                await sock.sendMessage(msg.key.remoteJid, { text: '❌ Failed to send sticker.' }, { quoted: msg });
              }
            } else if (response.startsWith('IMAGE_BASE64:')) {
              const imageBase64 = response.substring(13);
              try {
                await sendImageFromBase64(sock, msg.key.remoteJid, imageBase64, msg);
              } catch (e) {
                await sock.sendMessage(msg.key.remoteJid, { text: '❌ Failed to send image.' }, { quoted: msg });
              }
            } else if (response.startsWith('VIDEO_BASE64:')) {
              const videoBase64 = response.substring(13);
              try {
                await sendVideoFromBase64(sock, msg.key.remoteJid, videoBase64, msg);
              } catch (e) {
                await sock.sendMessage(msg.key.remoteJid, { text: '❌ Failed to send video.' }, { quoted: msg });
              }
            } else if (response.startsWith('AUDIO_BASE64:')) {
              const audioBase64 = response.substring(13);
              try {
                await sendAudioFromBase64(sock, msg.key.remoteJid, audioBase64, msg);
              } catch (e) {
                await sock.sendMessage(msg.key.remoteJid, { text: '❌ Failed to send audio.' }, { quoted: msg });
              }
            } else if (response.startsWith('FORWARD:')) {
              try {
                const forwardData = JSON.parse(response.substring(8));
                await sock.sendMessage(msg.key.remoteJid, forwardData.message, { quoted: msg });
              } catch (e) {
                await sock.sendMessage(msg.key.remoteJid, { text: '❌ Failed to forward message.' }, { quoted: msg });
              }
            } else if (response.startsWith('STICKER_REF:')) {
              // Ignore or show error, never send raw data
              await sock.sendMessage(msg.key.remoteJid, { text: '❌ This sticker trigger is not supported. Please re-add it.' }, { quoted: msg });
            } else {
              // Only send as text if it is not a special prefix
              await sock.sendMessage(msg.key.remoteJid, { text: response }, { quoted: msg });
            }
          } catch (error) {
            console.error('Error sending autoresponder:', error.message);
          }
          break;
        }
      }

      if (!body.startsWith(config.commandPrefix)) return;
      const args = body.slice(config.commandPrefix.length).trim().split(/ +/);
      const command = args.shift().toLowerCase();
      if (commandLoader.hasCommand(command)) {
        console.log('COMMAND TRIGGERED:', command, args);
        const commandStartTime = Date.now();
        try {
          const cmd = await commandLoader.getCommand(command);
          if (cmd) {
            await cmd.execute(sock, msg, args);
            performanceMonitor.recordCommand(command, commandStartTime);
          } else {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Failed to load command.' }, { quoted: msg });
          }
        } catch (e) {
          console.error(`Error executing command ${command}:`, e);
          performanceMonitor.recordError(e, `command:${command}`);
          await sock.sendMessage(msg.key.remoteJid, { text: '❌ Error: ' + e.message }, { quoted: msg });
        }
      }
    } catch (error) {
      console.error('Error processing message:', error.message);
      performanceMonitor.recordError(error, 'message_processing');
    }
  });

  await pollBackground(sock);
}

// Handle process termination gracefully
process.on('SIGINT', async () => {
  console.log(chalk.yellow('\nShutting down bot...'));
  clearBackgroundIntervals();

  // Shutdown command loader
  commandLoader.shutdown();
  console.log(chalk.blue('Command loader shutdown'));

  // Stop performance monitoring
  performanceMonitor.stop();
  console.log(chalk.blue('Performance monitoring stopped'));

  // Flush any pending database writes
  await database.flush();
  console.log(chalk.blue('Database flushed'));

  // Shutdown API manager
  apiManager.shutdown();

  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log(chalk.yellow('\nShutting down bot...'));
  clearBackgroundIntervals();

  // Shutdown command loader
  commandLoader.shutdown();
  console.log(chalk.blue('Command loader shutdown'));

  // Stop performance monitoring
  performanceMonitor.stop();
  console.log(chalk.blue('Performance monitoring stopped'));

  // Flush any pending database writes
  await database.flush();
  console.log(chalk.blue('Database flushed'));

  // Shutdown API manager
  apiManager.shutdown();

  process.exit(0);
});

startBot();