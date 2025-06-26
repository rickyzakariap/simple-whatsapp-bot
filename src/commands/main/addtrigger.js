const fs = require('fs');
const path = require('path');
const { isAdmin } = require('./utils');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
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
  name: 'addtrigger',
  description: 'Add auto-reply trigger (admin only)',
  usage: '.addtrigger <trigger>|<response> OR reply to sticker with .addtrigger <trigger>',
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
      
      // Check if this is a reply to any message (sticker, image, text, etc.)
      const quotedMsg = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
      const quotedKey = msg.message.extendedTextMessage?.contextInfo?.stanzaId;
      if (quotedMsg && quotedKey) {
        if (!args.length) {
          return sock.sendMessage(id, { 
            text: '❌ Usage: Reply to any message with .addtrigger <trigger>\n\n💡 Example: Reply to a sticker with .addtrigger hello' 
          }, { quoted: msg });
        }
        const trigger = args.join(' ').toLowerCase();
        if (trigger.length < 1 || trigger.length > 100) {
          return sock.sendMessage(id, { text: '❌ Trigger must be 1-100 characters long.' }, { quoted: msg });
        }
        
        // Check if it's a text message (can be forwarded)
        if (quotedMsg.conversation || quotedMsg.extendedTextMessage?.text) {
          // Forward text messages
          const response = `FORWARD:${JSON.stringify({ stanzaId: quotedKey, message: quotedMsg })}`;
          db[id] = db[id] || {};
          db[id][trigger] = response;
          save(db);
          return sock.sendMessage(id, { 
            text: `✅ Text forward trigger added successfully!\n\n📝 Trigger: "${trigger}"\n🎯 Response: Forward text message` 
          }, { quoted: msg });
        } else {
          // For media messages (sticker, image, video, etc.), download and store as base64
          try {
            const stream = await downloadMediaMessage(
              { key: msg.key, message: quotedMsg },
              sock
            );
            const chunks = [];
            for await (const chunk of stream) {
              chunks.push(chunk);
            }
            const mediaBuffer = Buffer.concat(chunks);
            
            // Determine media type and save accordingly
            let response;
            if (quotedMsg.stickerMessage) {
              response = `STICKER_BASE64:${mediaBuffer.toString('base64')}`;
            } else if (quotedMsg.imageMessage) {
              response = `IMAGE_BASE64:${mediaBuffer.toString('base64')}`;
            } else if (quotedMsg.videoMessage) {
              response = `VIDEO_BASE64:${mediaBuffer.toString('base64')}`;
            } else if (quotedMsg.audioMessage) {
              response = `AUDIO_BASE64:${mediaBuffer.toString('base64')}`;
            } else {
              response = `MEDIA_BASE64:${mediaBuffer.toString('base64')}`;
            }
            
            db[id] = db[id] || {};
            db[id][trigger] = response;
            save(db);
            
            return sock.sendMessage(id, { 
              text: `✅ Media trigger added successfully!\n\n📝 Trigger: "${trigger}"\n🎯 Response: Media message` 
            }, { quoted: msg });
            
          } catch (error) {
            console.error('Error downloading media:', error);
            
            // Provide specific error messages based on error type
            let errorMessage = '❌ Error: Failed to download media.';
            
            if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
              errorMessage = '❌ Network Error: Cannot connect to WhatsApp servers.\n\n💡 Solutions:\n• Check your internet connection\n• Try using a different network\n• Use text triggers instead: .addtrigger hello|Your response here\n• Contact your network administrator';
            } else if (error.message.includes('timeout')) {
              errorMessage = '❌ Timeout Error: Media download timed out. Please try again.';
            } else if (error.message.includes('ECONNREFUSED')) {
              errorMessage = '❌ Connection Error: WhatsApp servers are unreachable. Please try again later.';
            } else {
              errorMessage = `❌ Error: ${error.message}`;
            }
            
            return sock.sendMessage(id, { text: errorMessage }, { quoted: msg });
          }
        }
      } else {
        // Regular text/URL response
        const [trigger, ...respArr] = args.join(' ').split('|');
        if (!trigger || !respArr.length) {
          return sock.sendMessage(id, { 
            text: '❌ Usage: .addtrigger <trigger>|<response>\n\n💡 Examples:\n.addtrigger hello|Hello! How can I help you?\n.addtrigger sticker|STICKER:https://example.com/image.jpg\n\nOR reply to a sticker with: .addtrigger <trigger>' 
          }, { quoted: msg });
        }
        
        // Input validation
        if (trigger.length < 1 || trigger.length > 100) {
          return sock.sendMessage(id, { text: '❌ Trigger must be 1-100 characters long.' }, { quoted: msg });
        }
        
        const response = respArr.join('|').trim();
        if (response.length < 1 || response.length > 1000) {
          return sock.sendMessage(id, { text: '❌ Response must be 1-1000 characters long.' }, { quoted: msg });
        }
        
        db[id] = db[id] || {};
        db[id][trigger.toLowerCase()] = response;
        save(db);
        
        return sock.sendMessage(id, { 
          text: `✅ Trigger added successfully!\n\n📝 Trigger: "${trigger}"\n💬 Response: "${response}"` 
        }, { quoted: msg });
      }
    } catch (error) {
      console.error('Addtrigger command error:', error);
      return sock.sendMessage(msg.key.remoteJid, { text: '❌ Error: Failed to add trigger.' }, { quoted: msg });
    }
  }
}; 