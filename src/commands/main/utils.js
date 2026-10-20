const {
  normalizeJid,
  getSender,
  isGroup,
  isGroupAdmin,
  isBotAdmin,
  isOwner,
  isOwnerOrGroupAdmin,
  getTargetJid
} = require('../../lib/permissions');

module.exports = {
  // Kept for backwards compatibility with older commands.
  async isAdmin(sock, jid, user) {
    return isGroupAdmin(sock, jid, user);
  },
  normalizeJid,
  getSender,
  isGroup,
  isGroupAdmin,
  isBotAdmin,
  isOwner,
  isOwnerOrGroupAdmin,
  getTargetJid
};
