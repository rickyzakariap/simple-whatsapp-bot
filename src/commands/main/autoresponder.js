const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../../../autoresponder.json');

function load() { 
  try {
    if (!fs.existsSync(dbPath)) return {}; 
    return JSON.parse(fs.readFileSync(dbPath));
  } catch (error) {
    console.error('Error loading autoresponder database:', error);
    return {};
  }
}

function save(data) { 
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving autoresponder database:', error);
  }
}

module.exports = {
  name: 'autoresponder',
  description: 'Set custom auto-reply triggers (admin only)',
  usage: '.addtrigger <trigger>|<response> | .deltrigger <trigger> | .listtriggers',
  async execute(sock, msg, args) {
    try {
      const id = msg.key.remoteJid;
      const isAdmin = msg.participant || msg.key.participant;
      const db = load();
      const cmd = args[0]?.toLowerCase();
      
      if (cmd === 'addtrigger') {
        if (!isAdmin) return sock.sendMessage(id, { text: 'Admin only.' }, { quoted: msg });
        const [trigger, ...respArr] = args.slice(1).join(' ').split('|');
        if (!trigger || !respArr.length) return sock.sendMessage(id, { text: 'Usage: .addtrigger <trigger>|<response>' }, { quoted: msg });
        
        // Input validation
        if (trigger.length < 1 || trigger.length > 100) {
          return sock.sendMessage(id, { text: 'Trigger must be 1-100 characters long.' }, { quoted: msg });
        }
        
        const response = respArr.join('|').trim();
        if (response.length < 1 || response.length > 1000) {
          return sock.sendMessage(id, { text: 'Response must be 1-1000 characters long.' }, { quoted: msg });
        }
        
        db[id] = db[id] || {};
        db[id][trigger.toLowerCase()] = response;
        save(db);
        return sock.sendMessage(id, { text: 'Trigger added.' }, { quoted: msg });
      }
      
      if (cmd === 'deltrigger') {
        if (!isAdmin) return sock.sendMessage(id, { text: 'Admin only.' }, { quoted: msg });
        const trigger = args.slice(1).join(' ').toLowerCase();
        if (!trigger) return sock.sendMessage(id, { text: 'Usage: .deltrigger <trigger>' }, { quoted: msg });
        if (!db[id] || !db[id][trigger]) return sock.sendMessage(id, { text: 'Trigger not found.' }, { quoted: msg });
        delete db[id][trigger];
        save(db);
        return sock.sendMessage(id, { text: 'Trigger deleted.' }, { quoted: msg });
      }
      
      if (cmd === 'listtriggers') {
        if (!db[id] || !Object.keys(db[id]).length) return sock.sendMessage(id, { text: 'No triggers set.' }, { quoted: msg });
        let text = '*Auto-Responder Triggers:*\n';
        Object.entries(db[id]).forEach(([k, v], i) => { text += `${i + 1}. "${k}" → "${v}"\n`; });
        return sock.sendMessage(id, { text }, { quoted: msg });
      }
      
      return sock.sendMessage(id, { text: 'Usage: .addtrigger <trigger>|<response> | .deltrigger <trigger> | .listtriggers' }, { quoted: msg });
    } catch (error) {
      console.error('Autoresponder command error:', error);
      return sock.sendMessage(msg.key.remoteJid, { text: '❌ Error: Failed to process autoresponder command.' }, { quoted: msg });
    }
  },
  getTriggers(id) { 
    try {
      const db = load(); 
      return db[id] || {}; 
    } catch (error) {
      console.error('Error getting triggers:', error);
      return {};
    }
  }
}; 