const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

let players = {};

io.on('connection', (socket) => {
  console.log(`[+] Подключился игрок: ${socket.id}`);

  // Назначаем номер игрока (1 или 2)
  if (Object.keys(players).length < 2) {
    const playerNum = Object.keys(players).length === 0 ? 1 : 2;
    players[socket.id] = { id: socket.id, number: playerNum };
    socket.emit('init_player', { number: playerNum });
  } else {
    socket.emit('init_player', { number: 0 }); // Наблюдатель
  }

  // Передача импульса броска сопернику
  socket.on('shoot', (data) => {
    socket.broadcast.emit('enemy_shoot', data);
  });

  // Синхронизация позиций мячей
  socket.on('update_ball', (data) => {
    socket.broadcast.emit('enemy_ball_update', data);
  });

  socket.on('disconnect', () => {
    console.log(`[-] Игрок отключился: ${socket.id}`);
    delete players[socket.id];
  });
});

server.listen(PORT, () => {
  console.log(`================================================`);
  console.log(` ?? Сервер запущен! Доступ по адресу: http://localhost:${PORT}`);
  console.log(`================================================`);
});