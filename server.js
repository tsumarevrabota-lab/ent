const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

let waitingPlayer = null;

io.on('connection', (socket) => {
  console.log(`[+] Подключился игрок: ${socket.id}`);

  let roomId;

  // Логика подбора пары (Matchmaking)
  if (waitingPlayer) {
    roomId = `room_${waitingPlayer.id}_${socket.id}`;
    socket.join(roomId);
    waitingPlayer.join(roomId);

    waitingPlayer.emit('init_player', { number: 1, roomId });
    socket.emit('init_player', { number: 2, roomId });

    waitingPlayer = null;
  } else {
    waitingPlayer = socket;
    socket.emit('waiting', 'Ожидание второго игрока...');
  }

  // Синхронизация броска
  socket.on('shoot', (data) => {
    socket.to(data.roomId).emit('enemy_shoot', data);
  });

  // Синхронизация движения мяча
  socket.on('update_ball', (data) => {
    socket.to(data.roomId).emit('enemy_ball_update', data);
  });

  socket.on('disconnect', () => {
    console.log(`[-] Игрок отключился: ${socket.id}`);
    if (waitingPlayer === socket) {
      waitingPlayer = null;
    }
  });
});

server.listen(PORT, () => {
  console.log(`================================================`);
  console.log(` ?? Сервер запущен! http://localhost:${PORT}`);
  console.log(`================================================`);
});