const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const rooms = new Map();

function createRoom() {
  return {
    board: Array(9).fill(null),
    turn: 'X',
    players: {},
    winner: null,
    score: { X: 0, O: 0 }
  };
}

function getWinner(board) {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  for (const [a,b,c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { symbol: board[a], line: [a,b,c] };
    }
  }
  if (board.every(Boolean)) return { symbol: 'DRAW', line: [] };
  return null;
}

io.on('connection', (socket) => {
  socket.on('joinRoom', ({ roomId, nickname }) => {
    roomId = (roomId || 'arena').toLowerCase().slice(0, 20);
    nickname = (nickname || 'Player').slice(0, 20);

    if (!rooms.has(roomId)) rooms.set(roomId, createRoom());
    const room = rooms.get(roomId);

    const count = Object.keys(room.players).length;
    if (count >= 2) return socket.emit('roomFull');

    const symbol = room.players.X ? 'O' : 'X';
    room.players[symbol] = { id: socket.id, nickname };

    socket.data.roomId = roomId;
    socket.data.symbol = symbol;
    socket.join(roomId);

    io.to(roomId).emit('state', {
      board: room.board,
      turn: room.turn,
      winner: room.winner,
      score: room.score,
      players: room.players
    });

    socket.emit('youAre', { symbol, roomId });
  });

  socket.on('makeMove', (index) => {
    const { roomId, symbol } = socket.data;
    if (!roomId || symbol == null) return;
    const room = rooms.get(roomId);
    if (!room || room.winner) return;
    if (room.turn !== symbol || room.board[index]) return;

    room.board[index] = symbol;
    const result = getWinner(room.board);

    if (result) {
      room.winner = result;
      if (result.symbol === 'X' || result.symbol === 'O') room.score[result.symbol] += 1;
    } else {
      room.turn = room.turn === 'X' ? 'O' : 'X';
    }

    io.to(roomId).emit('state', {
      board: room.board,
      turn: room.turn,
      winner: room.winner,
      score: room.score,
      players: room.players
    });
  });

  socket.on('nextRound', () => {
    const room = rooms.get(socket.data.roomId);
    if (!room) return;
    room.board = Array(9).fill(null);
    room.turn = 'X';
    room.winner = null;
    io.to(socket.data.roomId).emit('state', {
      board: room.board,
      turn: room.turn,
      winner: room.winner,
      score: room.score,
      players: room.players
    });
  });

  socket.on('disconnect', () => {
    const { roomId, symbol } = socket.data;
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    if (symbol && room.players[symbol]?.id === socket.id) delete room.players[symbol];

    if (Object.keys(room.players).length === 0) return rooms.delete(roomId);

    room.board = Array(9).fill(null);
    room.turn = 'X';
    room.winner = null;

    io.to(roomId).emit('state', {
      board: room.board,
      turn: room.turn,
      winner: room.winner,
      score: room.score,
      players: room.players
    });
  });
});

const PORT = process.env.PORT || 3099;
server.listen(PORT, () => console.log(`tictac listening on http://localhost:${PORT}`));
