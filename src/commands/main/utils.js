module.exports = {
  async isAdmin(sock, jid, user) {
    try {
      const metadata = await sock.groupMetadata(jid);
      const participant = metadata.participants.find(p => p.id === user);
      return participant && (participant.admin === 'admin' || participant.admin === 'superadmin');
    } catch {
      return false;
    }
  }
}; 