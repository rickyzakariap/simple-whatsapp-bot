const database = require('../../lib/database');
const { isGroup, getSender, getTargetJid, isGroupAdmin, isOwner, mentionJid } = require('../../lib/permissions');

module.exports = {
  name: 'warn',
  description: 'Warn a member (admin only)',
  usage: '.warn @user [reason]',
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
      return sock.sendMessage(jid, { text: 'Tag or reply to the user you want to warn.' }, { quoted: msg });
    }

    const warnings = await database.load('warnings');
    warnings[jid] = warnings[jid] || {};
    warnings[jid][target] = (warnings[jid][target] || 0) + 1;
    database.save('warnings', warnings);

    const reason = args.filter(arg => !arg.includes('@')).join(' ').trim();
    const suffix = reason ? `\nReason: ${reason}` : '';
    await sock.sendMessage(jid, {
      text: `${mentionJid(target)} has been warned (${warnings[jid][target]}).${suffix}`,
      mentions: [target]
    }, { quoted: msg });
  }
};
