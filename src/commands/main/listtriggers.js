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

module.exports = {
  name: 'listtriggers',
  description: 'List all auto-reply triggers (admin only)',
  usage: '.listtriggers',
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
      
      if (!db[id] || Object.keys(db[id]).length === 0) {
        return sock.sendMessage(id, { 
          text: '📝 No triggers found for this group.\n\n💡 Use .addtrigger to add new triggers.' 
        }, { quoted: msg });
      }
      
      const triggers = Object.keys(db[id]);
      const response = triggers.map((trigger, index) => {
        const responseText = db[id][trigger];
        let displayResponse;
        if (responseText.startsWith('STICKER:')) {
          displayResponse = 'STICKER (from URL)';
        } else if (responseText.startsWith('STICKER_BASE64:')) {
          displayResponse = 'STICKER (from reply)';
        } else if (responseText.startsWith('IMAGE_BASE64:')) {
          displayResponse = 'IMAGE (from reply)';
        } else if (responseText.startsWith('VIDEO_BASE64:')) {
          displayResponse = 'VIDEO (from reply)';
        } else if (responseText.startsWith('AUDIO_BASE64:')) {
          displayResponse = 'AUDIO (from reply)';
        } else if (responseText.startsWith('FORWARD:')) {
          displayResponse = 'FORWARD (reply)';
        } else {
          displayResponse = responseText;
        }
        return `${index + 1}. "${trigger}" → "${displayResponse}"`;
      }).join('\n');
      
      return sock.sendMessage(id, { 
        text: `📝 Auto-reply triggers for this group:\n\n${response}\n\n💡 Total: ${triggers.length} trigger(s)` 
      }, { quoted: msg });
    } catch (error) {
      console.error('Listtriggers command error:', error);
      return sock.sendMessage(msg.key.remoteJid, { text: '❌ Error: Failed to list triggers.' }, { quoted: msg });
    }
  }
}; 