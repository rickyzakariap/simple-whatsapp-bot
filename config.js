module.exports = {
  botName: 'OngBak-Bot',
  ownerName: 'Ong-Bak',
  ownerNumber: '628988814717', // Change to your number
  commandPrefix: '.',
  sessionName: 'session',

  // Database file paths
  databaseFiles: {
    alerts: 'alerts.json',
    schedules: 'schedules.json',
    birthdays: 'birthdays.json',
    points: 'points.json',
    autoresponder: 'autoresponder.json',
    welcome: 'welcome.json'
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