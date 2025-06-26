const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const chokidar = require('chokidar');
const config = require('./config');
const { addPoint } = require('./src/commands/main/points');
const welcomeCmd = require('./src/commands/main/welcome');
const autoresponderCmd = require('./src/commands/main/autoresponder');
const alertPath = path.join(__dirname, 'alerts.json');
const schedulePath = path.join(__dirname, 'schedules.json');
const birthdayPath = path.join(__dirname, 'birthdays.json');
const axios = require('axios');

// Load commands with hot-reload
const commands = new Map();
const commandsDir = path.join(__dirname, 'src/commands/main');
function loadAllCommands() {
  commands.clear();
  fs.readdirSync(commandsDir).forEach(file => {
    if (file.endsWith('.js')) {
      delete require.cache[require.resolve(path.join(commandsDir, file))];
      const cmd = require(path.join(commandsDir, file));
      commands.set(cmd.name, cmd);
    }
  });
}
loadAllCommands();

// Watch for changes in the commands directory
chokidar.watch(commandsDir).on('all', (event, filePath) => {
  if (filePath.endsWith('.js')) {
    console.log(`[HOT-RELOAD] Reloading command: ${path.basename(filePath)}`);
    loadAllCommands();
  }
});

function loadJson(p) { 
  try {
    if (!fs.existsSync(p)) return {}; 
    return JSON.parse(fs.readFileSync(p));
  } catch (error) {
    console.error(`Error loading JSON file ${p}:`, error);
    return {};
  }
}

function saveJson(p, d) { 
  try {
    fs.writeFileSync(p, JSON.stringify(d, null, 2));
  } catch (error) {
    console.error(`Error saving JSON file ${p}:`, error);
  }
}

// Store interval IDs for proper cleanup
const backgroundIntervals = [];

async function pollBackground(sock) {
  // Price Alerts
  const priceAlertInterval = setInterval(async () => {
    try {
      const db = loadJson(alertPath);
      for (const user in db) {
        for (const alert of db[user]) {
          try {
            const { data } = await axios.get(`https://api.coingecko.com/api/v3/coins/markets`, { 
              params: { vs_currency: 'usd', ids: '', symbols: alert.symbol, per_page: 1 },
              timeout: 10000 // 10 second timeout
            });
            const coin = data.find(c => c.symbol.toLowerCase() === alert.symbol);
            if (coin && coin.current_price >= alert.price) {
              await sock.sendMessage(user, { text: `🚨 ${coin.name} (${coin.symbol.toUpperCase()}) hit $${coin.current_price} (alert: $${alert.price})` });
              db[user] = db[user].filter(a => a !== alert);
              saveJson(alertPath, db);
            }
          } catch (error) {
            console.error(`Error checking price alert for ${alert.symbol}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.error('Error in price alerts polling:', error.message);
    }
  }, 60 * 1000);
  
  backgroundIntervals.push(priceAlertInterval);

  // Scheduled Messages
  const scheduleInterval = setInterval(async () => {
    try {
      const db = loadJson(schedulePath);
      const now = new Date();
      const hhmm = now.toTimeString().slice(0,5);
      for (const jid in db) {
        db[jid] = db[jid] || [];
        for (const s of db[jid]) {
          if (s.time === hhmm) {
            try {
              await sock.sendMessage(jid, { text: `[Scheduled] ${s.message}` });
            } catch (error) {
              console.error(`Error sending scheduled message to ${jid}:`, error.message);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in scheduled messages polling:', error.message);
    }
  }, 60 * 1000);
  
  backgroundIntervals.push(scheduleInterval);

  // Birthday Reminders
  const birthdayInterval = setInterval(async () => {
    try {
      const db = loadJson(birthdayPath);
      const now = new Date();
      const mmdd = ('0'+(now.getMonth()+1)).slice(-2)+'-'+('0'+now.getDate()).slice(-2);
      for (const user in db) {
        if (db[user] === mmdd) {
          const jid = user.includes('@g.us') ? user : null;
          const mention = user;
          if (jid) {
            try {
              await sock.sendMessage(jid, { text: `🎂 Selamat ulang tahun @${mention.split('@')[0]}!`, mentions: [mention] });
            } catch (error) {
              console.error(`Error sending birthday message to ${jid}:`, error.message);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in birthday reminders polling:', error.message);
    }
  }, 60 * 1000);
  
  backgroundIntervals.push(birthdayInterval);
}

// Function to clear all background intervals
function clearBackgroundIntervals() {
  backgroundIntervals.forEach(interval => {
    clearInterval(interval);
  });
  backgroundIntervals.length = 0;
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

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) qrcode.generate(qr, { small: true });
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(chalk.red('Connection closed. Reconnecting...'));
      // Clear intervals before reconnecting
      clearBackgroundIntervals();
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log(chalk.green('OngBak-Bot is ready!'));
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
    
    try {
      // Passive point for any message
      addPoint(msg.key.remoteJid, msg.key.participant || msg.key.remoteJid, 1);
      
      // Autoresponder logic
      const triggers = autoresponderCmd.getTriggers(msg.key.remoteJid);
      const body = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
      for (const [trigger, response] of Object.entries(triggers)) {
        if (body.toLowerCase().includes(trigger)) {
          try {
            await sock.sendMessage(msg.key.remoteJid, { text: response }, { quoted: msg });
          } catch (error) {
            console.error('Error sending autoresponder:', error.message);
          }
          break;
        }
      }
      
      if (!body.startsWith(config.commandPrefix)) return;
      const args = body.slice(config.commandPrefix.length).trim().split(/ +/);
      const command = args.shift().toLowerCase();
      if (commands.has(command)) {
        console.log('COMMAND TRIGGERED:', command, args);
        try {
          await commands.get(command).execute(sock, msg, args);
        } catch (e) {
          console.error(`Error executing command ${command}:`, e);
          await sock.sendMessage(msg.key.remoteJid, { text: '❌ Error: ' + e.message }, { quoted: msg });
        }
      }
    } catch (error) {
      console.error('Error processing message:', error.message);
    }
  });

  await pollBackground(sock);
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log(chalk.yellow('\nShutting down bot...'));
  clearBackgroundIntervals();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(chalk.yellow('\nShutting down bot...'));
  clearBackgroundIntervals();
  process.exit(0);
});

startBot();