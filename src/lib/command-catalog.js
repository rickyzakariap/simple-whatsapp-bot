const fs = require('fs');
const path = require('path');

const COMMANDS_DIR = path.join(__dirname, '../commands/main');

// Curated ordering/categories for the menu. Unknown command files are appended
// to a "Lainnya" section rather than silently disappearing.
const CATEGORIES = [
  {
    title: 'Basic',
    commands: ['menu', 'help', 'ping', 'owner']
  },
  {
    title: 'Downloader',
    commands: ['tiktok', 'ytmp3', 'ytsearch', 'yt', 'ig', 'igstory', 'fb']
  },
  {
    title: 'Tools',
    commands: ['sticker', 'toimg', 'tomp3', 'coin', 'topgainers', 'toplosers', 'portfolio', 'weather', 'waifu', 'wallpaper', 'wikimedia', 'cat', 'dog', 'anime', 'berita', 'canva']
  },
  {
    title: 'Games',
    commands: ['quiz', 'tebakangka', 'tebakkata', 'math', 'suit', 'tictactoe']
  },
  {
    title: 'Group',
    commands: ['add', 'kick', 'promote', 'demote', 'mute', 'unmute', 'setsubject', 'setdesc', 'tagall', 'link', 'warn', 'unwarn', 'welcome', 'setwelcome', 'setgoodbye', 'poll', 'vote', 'pollresult', 'schedule', 'alert', 'birthday', 'points']
  },
  {
    title: 'Admin',
    commands: ['addtrigger', 'deltrigger', 'listtriggers', 'autoresponder', 'broadcast', 'performance']
  }
];

function listCommandNames() {
  try {
    return fs.readdirSync(COMMANDS_DIR)
      .filter(file => file.endsWith('.js'))
      .map(file => path.basename(file, '.js'))
      .sort();
  } catch (error) {
    console.error('Command catalog: cannot read commands directory:', error.message);
    return [];
  }
}

function isValidCommandName(name) {
  if (typeof name !== 'string') return false;
  if (!/^[a-z0-9_-]+$/.test(name)) return false;
  if (name === 'utils' || name === 'index') return false;
  return fs.existsSync(path.join(COMMANDS_DIR, `${name}.js`));
}

function getCommandMetadata(name) {
  if (!isValidCommandName(name)) return null;

  try {
    const command = require(path.join(COMMANDS_DIR, `${name}.js`));
    return {
      name: command.name || name,
      description: command.description || '',
      usage: command.usage || '',
      category: command.category || ''
    };
  } catch (error) {
    console.error(`Command catalog: cannot load '${name}':`, error.message);
    return null;
  }
}

function getAllMetadata() {
  const metadata = new Map();
  for (const name of listCommandNames()) {
    if (name === 'utils') continue;
    const info = getCommandMetadata(name);
    if (info) metadata.set(name, info);
  }
  return metadata;
}

function formatMenu(prefix = '.') {
  const metadata = getAllMetadata();
  const included = new Set();
  const lines = [];

  for (const category of CATEGORIES) {
    const entries = category.commands
      .filter(name => metadata.has(name))
      .map(name => {
        included.add(name);
        const info = metadata.get(name);
        return `• ${prefix}${name}${info.description ? ` — ${info.description}` : ''}`;
      });

    if (entries.length > 0) {
      lines.push(`*${category.title}*`);
      lines.push(...entries);
      lines.push('');
    }
  }

  const remaining = [...metadata.keys()]
    .filter(name => !included.has(name))
    .sort();

  if (remaining.length > 0) {
    lines.push('*Lainnya*');
    for (const name of remaining) {
      const info = metadata.get(name);
      lines.push(`• ${prefix}${name}${info.description ? ` — ${info.description}` : ''}`);
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}

module.exports = {
  COMMANDS_DIR,
  listCommandNames,
  isValidCommandName,
  getCommandMetadata,
  getAllMetadata,
  formatMenu
};
