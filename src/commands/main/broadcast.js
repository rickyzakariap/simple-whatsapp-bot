const { isOwner } = require('../../lib/permissions');

module.exports = {
  name: 'broadcast',
  description: 'Broadcast a message to all groups (owner only)',
  usage: '.broadcast <message>',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!isOwner(sock, msg)) {
      return sock.sendMessage(jid, { text: 'Owner only command.' }, { quoted: msg });
    }
    if (!args.length) {
      return sock.sendMessage(jid, { text: 'Please provide a message to broadcast.' }, { quoted: msg });
    }

    const text = args.join(' ');
    let chats;
    try {
      chats = await sock.groupFetchAllParticipating();
    } catch (error) {
      return sock.sendMessage(jid, { text: `Could not fetch groups: ${error.message}` }, { quoted: msg });
    }

    const groupJids = Object.keys(chats || {});
    let sent = 0;
    for (const groupJid of groupJids) {
      try {
        await sock.sendMessage(groupJid, { text: `[Broadcast]\n${text}` });
        sent++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Broadcast failed for ${groupJid}:`, error.message);
      }
    }

    await sock.sendMessage(jid, { text: `Broadcast sent to ${sent}/${groupJids.length} groups.` }, { quoted: msg });
  }
};
