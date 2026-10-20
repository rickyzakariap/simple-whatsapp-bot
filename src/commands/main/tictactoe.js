const config = require('../../../config');
const { addPoint } = require('./points');
const { getSender, normalizeJid, isGroup } = require('../../lib/permissions');

const games = {};
const timers = {};

function render(board) {
  return board.map((value, index) => value || (index + 1))
    .reduce((acc, value, index) => acc + value + (index % 3 === 2 ? '\n' : ' | '), '');
}

function checkWin(board) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return board.includes(null) ? null : 'draw';
}

function cleanupGame(id) {
  if (timers[id]) {
    clearTimeout(timers[id]);
    delete timers[id];
  }
  delete games[id];
}

function startTurnTimer(sock, id) {
  if (timers[id]) clearTimeout(timers[id]);
  timers[id] = setTimeout(() => {
    cleanupGame(id);
    sock.sendMessage(id, { text: '⏰ Waktu habis! Game tictactoe berakhir.' }).catch(() => {});
  }, config.games.tictactoe.turnTimeout);
}

module.exports = {
  name: 'tictactoe',
  description: 'Tic Tac Toe: play XO with a friend in a group',
  usage: '.tictactoe start | .tictactoe join | .tictactoe <position 1-9>',
  async execute(sock, msg, args) {
    const id = msg.key.remoteJid;
    const sender = normalizeJid(getSender(msg));
    const cmd = args[0]?.toLowerCase();

    try {
      if (!isGroup(id)) {
        return sock.sendMessage(id, { text: 'Tic Tac Toe is only available in groups.' }, { quoted: msg });
      }

      if (cmd === 'start' || !games[id]) {
        cleanupGame(id);
        games[id] = {
          board: Array(9).fill(null),
          turn: 'X',
          players: [sender],
          started: false,
          createdAt: Date.now()
        };
        return sock.sendMessage(id, {
          text: `Tic Tac Toe dimulai!\nPemain 1: @${sender.split('@')[0]}\nPemain 2, ketik *.tictactoe join* untuk bergabung.`
        }, { quoted: msg });
      }

      if (cmd === 'join') {
        if (games[id].started) {
          return sock.sendMessage(id, { text: 'Game sudah berjalan. Selesaikan dulu atau mulai ulang dengan .tictactoe start.' }, { quoted: msg });
        }
        if (games[id].players.includes(sender)) {
          return sock.sendMessage(id, { text: 'Kamu sudah menjadi pemain di game ini.' }, { quoted: msg });
        }

        games[id].players.push(sender);
        games[id].started = true;
        startTurnTimer(sock, id);

        return sock.sendMessage(id, {
          text: `Pemain 2 join! Giliran: X (@${games[id].players[0].split('@')[0]})\n${render(games[id].board)}`
        }, { quoted: msg });
      }

      if (!games[id].started) {
        return sock.sendMessage(id, { text: 'Tunggu pemain kedua. Ketik .tictactoe join untuk bergabung.' }, { quoted: msg });
      }

      const position = Number(args[0]) - 1;
      if (!Number.isInteger(position) || position < 0 || position > 8) {
        return sock.sendMessage(id, { text: 'Pilih posisi 1-9.' }, { quoted: msg });
      }

      const playerIndex = games[id].turn === 'X' ? 0 : 1;
      if (sender !== games[id].players[playerIndex]) {
        return sock.sendMessage(id, { text: 'Bukan giliranmu.' }, { quoted: msg });
      }
      if (games[id].board[position]) {
        return sock.sendMessage(id, { text: 'Posisi itu sudah diisi.' }, { quoted: msg });
      }

      games[id].board[position] = games[id].turn;
      const win = checkWin(games[id].board);

      if (win) {
        let text = win === 'draw'
          ? 'Seri!'
          : `Menang: ${games[id].turn} (@${games[id].players[playerIndex].split('@')[0]}) (+${config.games.tictactoe.pointsForWin} poin)`;
        if (win !== 'draw') {
          await addPoint(id, games[id].players[playerIndex], config.games.tictactoe.pointsForWin);
        }
        text += `\n${render(games[id].board)}`;
        cleanupGame(id);
        return sock.sendMessage(id, { text }, { quoted: msg });
      }

      games[id].turn = games[id].turn === 'X' ? 'O' : 'X';
      startTurnTimer(sock, id);
      return sock.sendMessage(id, {
        text: `Giliran: ${games[id].turn} (@${games[id].players[games[id].turn === 'X' ? 0 : 1].split('@')[0]})\n${render(games[id].board)}`
      }, { quoted: msg });
    } catch (error) {
      console.error('TicTacToe command error:', error);
      return sock.sendMessage(id, { text: '❌ Failed to process tictactoe command.' }, { quoted: msg });
    }
  }
};
