const fs = require('fs');
const path = require('path');
const { isAdmin } = require('./utils');
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
  name: 'deltrigger',
  description: 'Delete auto-reply trigger (admin only)',
  usage: '.deltrigger <trigger>',
  async execute(sock, msg, args) {
    try {
      const id = msg.key.remoteJid;
      const sender = msg.key.participant || msg.participant;
      
      // Check if it's a group
      if (!id.endsWith('@g.us')) {
        return sock.sendMessage(id, { text: '❌ This command can only be used in groups.' }, { quoted: msg });
      }
      
      // Check if user is admin
      if (!(await isAdmin(sock, id, sender))) {
        return sock.sendMessage(id, { text: '❌ Only admins can use this command.' }, { quoted: msg });
      }
      
      const db = load();
      
      if (!args.length) {
        return sock.sendMessage(id, { 
          text: '❌ Usage: .deltrigger <trigger>\n\n💡 Example:\n.deltrigger hello' 
        }, { quoted: msg });
      }
      
      const trigger = args.join(' ').toLowerCase();
      
      if (!db[id] || !db[id][trigger]) {
        return sock.sendMessage(id, { text: `❌ Trigger "${trigger}" not found.` }, { quoted: msg });
      }
      
      delete db[id][trigger];
      
      // Clean up empty group entries
      if (Object.keys(db[id]).length === 0) {
        delete db[id];
      }
      
      save(db);
      
      return sock.sendMessage(id, { 
        text: `✅ Trigger "${trigger}" deleted successfully!` 
      }, { quoted: msg });
    } catch (error) {
      console.error('Deltrigger command error:', error);
      return sock.sendMessage(msg.key.remoteJid, { text: '❌ Error: Failed to delete trigger.' }, { quoted: msg });
    }
  }
}; 