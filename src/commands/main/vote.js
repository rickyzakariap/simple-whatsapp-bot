const poll = require('./poll');

module.exports = {
  name: 'vote',
  description: 'Vote in the active poll',
  usage: '.vote <number or option>',
  async execute(sock, msg, args) {
    return poll.vote(sock, msg, args);
  }
};
