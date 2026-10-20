require('dotenv').config();

function envList(name) {
  return String(process.env[name] || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
}

const ownerNumber = String(process.env.OWNER_NUMBER || '').replace(/[^0-9]/g, '');

module.exports = {
  botName: process.env.BOT_NAME || 'OngBak-Bot',
  ownerName: process.env.OWNER_NAME || 'Ong-Bak',
  // Human owner's number. The bot account is also treated as an owner fallback.
  ownerNumber,
  ownerJids: envList('OWNER_JIDS'),
  ownerGithub: process.env.OWNER_GITHUB || 'rickyzakariap',
  commandPrefix: process.env.COMMAND_PREFIX || '.',
  sessionName: process.env.SESSION_NAME || 'session',
  timezone: process.env.TIMEZONE || 'Asia/Jakarta',

  // Runtime JSON files. These are created automatically and must never be committed.
  databaseFiles: {
    alerts: 'alerts.json',
    schedules: 'schedules.json',
    birthdays: 'birthdays.json',
    points: 'points.json',
    autoresponder: 'autoresponder.json',
    welcome: 'welcome.json',
    polls: 'polls.json',
    portfolio: 'portfolio.json',
    warnings: 'warnings.json'
  },

  // Background polling intervals (in milliseconds)
  polling: {
    priceAlerts: 60 * 1000, // 1 minute
    scheduledMessages: 60 * 1000, // 1 minute
    birthdayReminders: 60 * 1000 // 1 minute
  },

  // Game settings
  games: {
    tictactoe: {
      turnTimeout: 60 * 1000, // 60 seconds per turn
      pointsForWin: 5
    },
    quiz: {
      timeout: 30 * 1000, // 30 seconds
      pointsForCorrect: 3
    },
    tebakangka: {
      timeout: 30 * 1000, // 30 seconds
      pointsForCorrect: 2
    },
    tebakkata: {
      timeout: 60 * 1000, // 60 seconds
      pointsForCorrect: 3
    }
  },

  // API settings
  api: {
    coingecko: {
      baseUrl: 'https://api.coingecko.com/api/v3',
      timeout: 10000 // 10 seconds
    },
    imageDownload: {
      timeout: 30000 // 30 seconds
    }
  },

  // Input validation limits
  validation: {
    maxMessageLength: 1000,
    maxTriggerLength: 100,
    maxResponseLength: 1000,
    maxSymbolLength: 10,
    minPrice: 0.01
  },

  // File processing
  fileProcessing: {
    maxFileSize: 100 * 1024 * 1024, // 100MB (WhatsApp limit)
    supportedImageFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    supportedVideoFormats: ['mp4', 'avi', 'mov', 'mkv']
  }
};
