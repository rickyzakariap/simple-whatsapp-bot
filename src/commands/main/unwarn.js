const database = require('../../lib/database');
const { isGroup, getSender, getTargetJid, isGroupAdmin, isOwner, mentionJid } = require('../../lib/permissions');

module.exports = {
  name: 'unwarn',
  description: 'Remove a warning from a member (admin only)',
  usage: '.unwarn @user',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!isGroup(jid)) {
      return sock.sendMessage(jid, { text: 'This command can only be used in groups.' }, { quoted: msg });
    }
    if (!isOwner(sock, msg) && !(await isGroupAdmin(sock, jid, getSender(msg)))) {
      return sock.sendMessage(jid, { text: 'Only admins can use this command.' }, { quoted: msg });
    }

    const target = getTargetJid(msg, args);
    if (!target) {
      return sock.sendMessage(jid, { text: 'Tag or reply to the user you want to unwarn.' }, { quoted: msg });
    }

    const warnings = await database.load('warnings');
    const groupWarnings = warnings[jid] || {};
    const current = groupWarnings[target] || 0;

    if (current <= 0) {
      return sock.sendMessage(jid, {
        text: `${mentionJid(target)} has no warnings.`,
        mentions: [target]
      }, { quoted: msg });
    }

    groupWarnings[target] = current - 1;
    if (groupWarnings[target] === 0) delete groupWarnings[target];
    warnings[jid] = groupWarnings;
    if (Object.keys(groupWarnings).length === 0) delete warnings[jid];
    database.save('warnings', warnings);

    await sock.sendMessage(jid, {
      text: `${mentionJid(target)}'s warning removed (${groupWarnings[target] || 0} remaining).`,
      mentions: [target]
    }, { quoted: msg });
  }
};
