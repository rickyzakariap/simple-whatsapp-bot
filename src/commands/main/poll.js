const database = require('../../lib/database');
const { getSender, normalizeJid } = require('../../lib/permissions');

async function vote(sock, msg, args) {
  const chatId = msg.key.remoteJid;
  const db = await database.load('polls');
  const poll = db[chatId];
  if (!poll) {
    return sock.sendMessage(chatId, { text: 'No active poll.' }, { quoted: msg });
  }

  const input = args.join(' ').trim();
  if (!input) {
    return sock.sendMessage(chatId, { text: 'Specify your vote, e.g. .vote 1' }, { quoted: msg });
  }

  let option = null;
  const numeric = Number(input);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= poll.options.length) {
    option = poll.options[numeric - 1];
  } else {
    option = poll.options.find(item => item.toLowerCase() === input.toLowerCase()) || null;
  }

  if (!option) {
    return sock.sendMessage(chatId, {
      text: `Invalid option. Choose: ${poll.options.map((item, index) => `${index + 1}. ${item}`).join(' | ')}`
    }, { quoted: msg });
  }

  poll.votes = poll.votes || {};
  const voter = normalizeJid(getSender(msg) || chatId);
  poll.votes[voter] = option;
  db[chatId] = poll;
  database.save('polls', db);

  return sock.sendMessage(chatId, { text: `Vote recorded: ${option}` }, { quoted: msg });
}

async function results(sock, msg) {
  const chatId = msg.key.remoteJid;
  const db = await database.load('polls');
  const poll = db[chatId];
  if (!poll) {
    return sock.sendMessage(chatId, { text: 'No active poll.' }, { quoted: msg });
  }

  const tally = Object.fromEntries(poll.options.map(option => [option, 0]));
  Object.values(poll.votes || {}).forEach(option => {
    if (tally[option] !== undefined) tally[option]++;
  });

  let text = `*Poll Results: ${poll.question}*\n`;
  poll.options.forEach((option, index) => {
    text += `${index + 1}. ${option}: ${tally[option]}\n`;
  });
  text += `\nTotal votes: ${Object.keys(poll.votes || {}).length}`;

  return sock.sendMessage(chatId, { text }, { quoted: msg });
}

module.exports = {
  name: 'poll',
  description: 'Start a poll: .poll <question>|<option1>|<option2>|...',
  usage: '.poll <question>|<option1>|<option2>|... | .vote <option> | .pollresult',
  vote,
  results,
  async execute(sock, msg, args) {
    const chatId = msg.key.remoteJid;
    const cmd = args[0]?.toLowerCase();

    if (cmd === 'vote') return vote(sock, msg, args.slice(1));
    if (cmd === 'pollresult' || cmd === 'results' || cmd === 'result') return results(sock, msg);

    if (cmd === 'close') {
      const db = await database.load('polls');
      if (!db[chatId]) {
        return sock.sendMessage(chatId, { text: 'No active poll.' }, { quoted: msg });
      }
      delete db[chatId];
      database.save('polls', db);
      return sock.sendMessage(chatId, { text: 'Poll closed.' }, { quoted: msg });
    }

    const parts = args.join(' ').split('|').map(part => part.trim()).filter(Boolean);
    if (parts.length < 3) {
      return sock.sendMessage(chatId, {
        text: 'Usage: .poll <question>|<option1>|<option2>|...\nExample: .poll Makan apa?|Nasi|Mie|Sate'
      }, { quoted: msg });
    }

    const db = await database.load('polls');
    db[chatId] = {
      question: parts[0],
      options: parts.slice(1),
      votes: {},
      createdAt: new Date().toISOString()
    };
    database.save('polls', db);

    let text = `*Poll Started: ${parts[0]}*\n`;
    parts.slice(1).forEach((option, index) => {
      text += `${index + 1}. ${option}\n`;
    });
    text += '\nVote with .vote <number or option>';
    await sock.sendMessage(chatId, { text }, { quoted: msg });
  }
};
