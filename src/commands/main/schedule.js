const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../../../schedules.json');

function load() { 
  try {
    if (!fs.existsSync(dbPath)) return {}; 
    return JSON.parse(fs.readFileSync(dbPath));
  } catch (error) {
    console.error('Error loading schedules database:', error);
    return {};
  }
}

function save(data) { 
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving schedules database:', error);
  }
}

module.exports = {
  name: 'schedule',
  description: 'Schedule messages: .schedule <HH:MM> <message>, .schedule list, .schedule remove <id>',
  usage: '.schedule <HH:MM> <message> | .schedule list | .schedule remove <id>',
  async execute(sock, msg, args) {
    try {
      const id = msg.key.remoteJid;
      const db = load();
      const cmd = args[0]?.toLowerCase();
      
      if (cmd === 'list') {
        const list = db[id] || [];
        if (!list.length) return sock.sendMessage(id, { text: 'No scheduled messages.' }, { quoted: msg });
        let text = '*Scheduled Messages:*\n';
        list.forEach((s, i) => { text += `${i + 1}. ${s.time} - ${s.message}\n`; });
        return sock.sendMessage(id, { text }, { quoted: msg });
      }
      
      if (cmd === 'remove') {
        const idx = parseInt(args[1]) - 1;
        if (isNaN(idx) || idx < 0) return sock.sendMessage(id, { text: 'Usage: .schedule remove <id> (id must be a positive number)' }, { quoted: msg });
        if (!db[id] || idx >= db[id].length) return sock.sendMessage(id, { text: 'Invalid schedule ID.' }, { quoted: msg });
        db[id] = (db[id] || []).filter((_, i) => i !== idx);
        save(db);
        return sock.sendMessage(id, { text: 'Schedule removed.' }, { quoted: msg });
      }
      
      // Add schedule
      const time = args[0];
      const message = args.slice(1).join(' ');
      
      // Input validation
      if (!/^\d{2}:\d{2}$/.test(time) || !message) {
        return sock.sendMessage(id, { text: 'Usage: .schedule <HH:MM> <message>' }, { quoted: msg });
      }
      
      // Validate time format
      const [hours, minutes] = time.split(':').map(Number);
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return sock.sendMessage(id, { text: 'Invalid time format. Use HH:MM (00:00-23:59)' }, { quoted: msg });
      }
      
      // Validate message length
      if (message.length > 1000) {
        return sock.sendMessage(id, { text: 'Message too long. Maximum 1000 characters.' }, { quoted: msg });
      }
      
      db[id] = db[id] || [];
      db[id].push({ time, message });
      save(db);
      return sock.sendMessage(id, { text: `Scheduled message set for ${time}.` }, { quoted: msg });
    } catch (error) {
      console.error('Schedule command error:', error);
      return sock.sendMessage(msg.key.remoteJid, { text: '❌ Error: Failed to process schedule command.' }, { quoted: msg });
    }
  },
}; 