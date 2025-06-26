const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../../../birthdays.json');

function load() { 
  try {
    if (!fs.existsSync(dbPath)) return {}; 
    return JSON.parse(fs.readFileSync(dbPath));
  } catch (error) {
    console.error('Error loading birthdays database:', error);
    return {};
  }
}

function save(data) { 
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving birthdays database:', error);
  }
}

module.exports = {
  name: 'birthday',
  description: 'Birthday reminders: .birthday add <MM-DD> | .birthday remove | .birthday list',
  usage: '.birthday add <MM-DD> | .birthday remove | .birthday list',
  async execute(sock, msg, args) {
    try {
      const user = msg.key.participant || msg.key.remoteJid;
      const db = load();
      const cmd = args[0]?.toLowerCase();
      
      if (cmd === 'add') {
        const date = args[1];
        
        // Input validation
        if (!/^\d{2}-\d{2}$/.test(date)) {
          return sock.sendMessage(msg.key.remoteJid, { text: 'Usage: .birthday add <MM-DD> (e.g., 12-25)' }, { quoted: msg });
        }
        
        // Validate date format
        const [month, day] = date.split('-').map(Number);
        if (month < 1 || month > 12 || day < 1 || day > 31) {
          return sock.sendMessage(msg.key.remoteJid, { text: 'Invalid date. Use MM-DD format (e.g., 12-25)' }, { quoted: msg });
        }
        
        // Additional validation for specific months
        const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        if (day > daysInMonth[month - 1]) {
          return sock.sendMessage(msg.key.remoteJid, { text: `Invalid day for month ${month}. Maximum days: ${daysInMonth[month - 1]}` }, { quoted: msg });
        }
        
        db[user] = date;
        save(db);
        return sock.sendMessage(msg.key.remoteJid, { text: `Birthday set for ${date}` }, { quoted: msg });
      }
      
      if (cmd === 'remove') {
        delete db[user];
        save(db);
        return sock.sendMessage(msg.key.remoteJid, { text: 'Birthday removed.' }, { quoted: msg });
      }
      
      // List all birthdays
      let text = '*Birthdays:*\n';
      Object.entries(db).forEach(([u, d]) => { text += `- @${u.split('@')[0]}: ${d}\n`; });
      await sock.sendMessage(msg.key.remoteJid, { text, mentions: Object.keys(db) }, { quoted: msg });
    } catch (error) {
      console.error('Birthday command error:', error);
      return sock.sendMessage(msg.key.remoteJid, { text: '❌ Error: Failed to process birthday command.' }, { quoted: msg });
    }
  },
}; 