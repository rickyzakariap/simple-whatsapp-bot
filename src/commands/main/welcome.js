const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../../../welcome.json');

function load() { 
  try {
    if (!fs.existsSync(dbPath)) return {}; 
    return JSON.parse(fs.readFileSync(dbPath));
  } catch (error) {
    console.error('Error loading welcome database:', error);
    return {};
  }
}

function save(data) { 
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving welcome database:', error);
  }
}

module.exports = {
  name: 'welcome',
  description: 'Show or set custom welcome/goodbye messages (admin only)',
  usage: '.setwelcome <msg> | .setgoodbye <msg> | .welcome | .goodbye',
  async execute(sock, msg, args) {
    try {
      const id = msg.key.remoteJid;
      const isAdmin = msg.participant || msg.key.participant;
      const db = load();
      const cmd = args[0]?.toLowerCase();
      
      if (cmd === 'setwelcome') {
        if (!isAdmin) return sock.sendMessage(id, { text: 'Admin only.' }, { quoted: msg });
        const message = args.slice(1).join(' ');
        if (!message) return sock.sendMessage(id, { text: 'Usage: .setwelcome <message>' }, { quoted: msg });
        
        // Input validation
        if (message.length > 1000) {
          return sock.sendMessage(id, { text: 'Welcome message too long. Maximum 1000 characters.' }, { quoted: msg });
        }
        
        db[id] = db[id] || {};
        db[id].welcome = message;
        save(db);
        return sock.sendMessage(id, { text: 'Welcome message set.' }, { quoted: msg });
      }
      
      if (cmd === 'setgoodbye') {
        if (!isAdmin) return sock.sendMessage(id, { text: 'Admin only.' }, { quoted: msg });
        const message = args.slice(1).join(' ');
        if (!message) return sock.sendMessage(id, { text: 'Usage: .setgoodbye <message>' }, { quoted: msg });
        
        // Input validation
        if (message.length > 1000) {
          return sock.sendMessage(id, { text: 'Goodbye message too long. Maximum 1000 characters.' }, { quoted: msg });
        }
        
        db[id] = db[id] || {};
        db[id].goodbye = message;
        save(db);
        return sock.sendMessage(id, { text: 'Goodbye message set.' }, { quoted: msg });
      }
      
      if (cmd === 'goodbye') {
        return sock.sendMessage(id, { text: db[id]?.goodbye || 'No goodbye message set.' }, { quoted: msg });
      }
      
      // Default: show welcome
      return sock.sendMessage(id, { text: db[id]?.welcome || 'No welcome message set.' }, { quoted: msg });
    } catch (error) {
      console.error('Welcome command error:', error);
      return sock.sendMessage(msg.key.remoteJid, { text: '❌ Error: Failed to process welcome command.' }, { quoted: msg });
    }
  },
  getWelcome(id) { 
    try {
      const db = load(); 
      return db[id]?.welcome; 
    } catch (error) {
      console.error('Error getting welcome message:', error);
      return null;
    }
  },
  getGoodbye(id) { 
    try {
      const db = load(); 
      return db[id]?.goodbye; 
    } catch (error) {
      console.error('Error getting goodbye message:', error);
      return null;
    }
  }
}; 