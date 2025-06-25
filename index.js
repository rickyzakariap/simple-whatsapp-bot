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
          const text = welcome.replace(/@user/g, '@' + user.split('@')[0]).replace(/@group/g, id.split('@')[0]);
          await sock.sendMessage(id, { text, mentions: [user] });
        }
      }
    } else if (action === 'remove') {
      const goodbye = welcomeCmd.getGoodbye(id);
      if (goodbye) {
        for (const user of participants) {
          const text = goodbye.replace(/@user/g, '@' + user.split('@')[0]).replace(/@group/g, id.split('@')[0]);
          await sock.sendMessage(id, { text, mentions: [user] });
        }
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;
    // Passive point for any message
    addPoint(msg.key.remoteJid, msg.key.participant || msg.key.remoteJid, 1);
    // Autoresponder logic
    const triggers = autoresponderCmd.getTriggers(msg.key.remoteJid);
    const body = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
    for (const [trigger, response] of Object.entries(triggers)) {
      if (body.toLowerCase().includes(trigger)) {
        await sock.sendMessage(msg.key.remoteJid, { text: response }, { quoted: msg });
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
        await sock.sendMessage(msg.key.remoteJid, { text: '❌ Error: ' + e.message }, { quoted: msg });
      }
    }
  });
}

startBot();