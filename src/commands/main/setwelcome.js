const welcome = require('./welcome');

module.exports = {
  name: 'setwelcome',
  description: 'Set the group welcome message (admin only)',
  usage: '.setwelcome <message>',
  async execute(sock, msg, args) {
    return welcome.execute(sock, msg, ['setwelcome', ...args]);
  }
};
