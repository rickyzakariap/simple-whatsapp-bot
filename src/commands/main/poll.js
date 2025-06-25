const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../../polls.json');
function load() { if (!fs.existsSync(dbPath)) return {}; return JSON.parse(fs.readFileSync(dbPath)); }
function save(data) { fs.writeFileSync(dbPath, JSON.stringify(data, null, 2)); }

module.exports = {
  name: 'poll',
  description: 'Start a poll: .poll <question>|<option1>|<option2>|... | .vote <option> | .pollresult',
  usage: '.poll <question>|<option1>|<option2>|... | .vote <option> | .pollresult',
  async execute(sock, msg, args) {
    const id = msg.key.remoteJid;
    const db = load();
    if (args[0] === 'vote') {
      if (!db[id]) return sock.sendMessage(id, { text: 'No active poll.' }, { quoted: msg });
      const option = args.slice(1).join(' ').trim();
      if (!option) return sock.sendMessage(id, { text: 'Specify your vote.' }, { quoted: msg });
      db[id].votes = db[id].votes || {};
      db[id].votes[msg.key.participant || msg.key.remoteJid] = option;
      save(db);
      return sock.sendMessage(id, { text: 'Vote recorded.' }, { quoted: msg });
    }
    if (args[0] === 'pollresult') {
      if (!db[id]) return sock.sendMessage(id, { text: 'No active poll.' }, { quoted: msg });
      const poll = db[id];
      const tally = {};
      Object.values(poll.votes || {}).forEach(v => { tally[v] = (tally[v] || 0) + 1; });
      let text = `*Poll Results: ${poll.question}*\n`;
      poll.options.forEach(opt => { text += `- ${opt}: ${tally[opt] || 0}\n`; });
      return sock.sendMessage(id, { text }, { quoted: msg });
    }
    // Start a new poll
    const parts = args.join(' ').split('|').map(s => s.trim()).filter(Boolean);
    if (parts.length < 3) return sock.sendMessage(id, { text: 'Usage: .poll <question>|<option1>|<option2>|...', quoted: msg });
    db[id] = { question: parts[0], options: parts.slice(1), votes: {} };
    save(db);
    let text = `*Poll Started: ${parts[0]}*\n`;
    parts.slice(1).forEach((opt, i) => { text += `${i + 1}. ${opt}\n`; });
    text += '\nVote with .vote <option>';
    await sock.sendMessage(id, { text }, { quoted: msg });
  },
}; 