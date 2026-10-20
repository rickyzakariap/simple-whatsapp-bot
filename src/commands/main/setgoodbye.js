const welcome = require('./welcome');

module.exports = {
  name: 'setgoodbye',
  description: 'Set the group goodbye message (admin only)',
  usage: '.setgoodbye <message>',
  async execute(sock, msg, args) {
    return welcome.execute(sock, msg, ['setgoodbye', ...args]);
  }
};
