const games = {};
const { addPoint } = require('./points');
const timers = {};

function render(board) {
  return board.map((v, i) => v || (i + 1)).reduce((a, c, i) => a + c + ((i % 3 === 2) ? '\n' : ' | '), '');
}

function checkWin(board) {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  for (const [a,b,c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return board.includes(null) ? null : 'draw';
}

// Helper function to clear timer and clean up game
function cleanupGame(id) {
  if (timers[id]) {
    clearTimeout(timers[id]);
    delete timers[id];
  }
  delete games[id];
}

module.exports = {
  name: 'tictactoe',
  description: 'Tic Tac Toe: Mainkan XO dengan teman di grup!',
  usage: '.tictactoe start | .tictactoe <posisi 1-9>',
  async execute(sock, msg, args) {
    try {
      const id = msg.key.remoteJid;
      
      if (!games[id] || args[0] === 'start') {
        // Clear any existing game
        cleanupGame(id);
        
        games[id] = { board: Array(9).fill(null), turn: 'X', players: [msg.key.participant], started: false };
        return sock.sendMessage(id, { text: 'Tic Tac Toe dimulai! Pemain 1 join. Pemain 2, ketik .tictactoe start untuk join.' }, { quoted: msg });
      }
      
      if (games[id] && !games[id].started && !games[id].players.includes(msg.key.participant)) {
        games[id].players.push(msg.key.participant);
        games[id].started = true;
        
        // Clear any existing timer
        if (timers[id]) clearTimeout(timers[id]);
        
        timers[id] = setTimeout(() => {
          cleanupGame(id);
          sock.sendMessage(id, { text: '⏰ Waktu habis! Game tictactoe berakhir.' }).catch(err => {
            console.error('Error sending timeout message:', err.message);
          });
        }, 60000);
        
        return sock.sendMessage(id, { text: `Pemain 2 join! Giliran: X (${games[id].players[0]})\n${render(games[id].board)} (60 detik per giliran)` }, { quoted: msg });
      }
      
      if (!games[id] || !games[id].started) {
        return sock.sendMessage(id, { text: 'Mulai game baru dengan .tictactoe start.' }, { quoted: msg });
      }
      
      const pos = parseInt(args[0]) - 1;
      if (isNaN(pos) || pos < 0 || pos > 8) {
        return sock.sendMessage(id, { text: 'Pilih posisi 1-9.' }, { quoted: msg });
      }
      
      const playerIdx = games[id].turn === 'X' ? 0 : 1;
      if (msg.key.participant !== games[id].players[playerIdx]) {
        return sock.sendMessage(id, { text: 'Bukan giliranmu.' }, { quoted: msg });
      }
      
      if (games[id].board[pos]) {
        return sock.sendMessage(id, { text: 'Sudah diisi. Pilih posisi lain.' }, { quoted: msg });
      }
      
      games[id].board[pos] = games[id].turn;
      
      // Clear existing timer and set new one
      if (timers[id]) clearTimeout(timers[id]);
      timers[id] = setTimeout(() => {
        cleanupGame(id);
        sock.sendMessage(id, { text: '⏰ Waktu habis! Game tictactoe berakhir.' }).catch(err => {
          console.error('Error sending timeout message:', err.message);
        });
      }, 60000);
      
      const win = checkWin(games[id].board);
      if (win) {
        let text = win === 'draw' ? 'Seri!' : `Menang: ${games[id].turn} (${games[id].players[playerIdx]}) (+5 poin)`;
        if (win !== 'draw') {
          try {
            addPoint(id, games[id].players[playerIdx], 5);
          } catch (error) {
            console.error('Error adding points:', error.message);
          }
        }
        text += `\n${render(games[id].board)}`;
        
        // Clean up game properly
        cleanupGame(id);
        
        return sock.sendMessage(id, { text }, { quoted: msg });
      } else {
        games[id].turn = games[id].turn === 'X' ? 'O' : 'X';
        return sock.sendMessage(id, { text: `Giliran: ${games[id].turn} (${games[id].players[games[id].turn === 'X' ? 0 : 1]})\n${render(games[id].board)} (60 detik per giliran)` }, { quoted: msg });
      }
    } catch (error) {
      console.error('TicTacToe command error:', error);
      return sock.sendMessage(msg.key.remoteJid, { text: '❌ Error: Failed to process tictactoe command.' }, { quoted: msg });
    }
  },
}; 