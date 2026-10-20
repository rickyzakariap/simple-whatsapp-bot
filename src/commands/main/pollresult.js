const poll = require('./poll');

module.exports = {
  name: 'pollresult',
  description: 'Show the active poll results',
  usage: '.pollresult',
  async execute(sock, msg) {
    return poll.results(sock, msg);
  }
};
