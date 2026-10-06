const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Раздаем статические файлы из папки public
app.use(express.static(path.join(__dirname, 'public')));

// Обработка подключений Socket.io для мультиплеера
io.on('connection', (socket) => {
  console.log(`[+] Игрок подключился: ${socket.id}`);

  socket.on('shoot', (shootData) => {
    socket.broadcast.emit('enemy_shoot', shootData);
  });

  socket.on('disconnect', () => {
    console.log(`[-] Игрок отключился: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`================================================`);
  console.log(` 🎮 Игровой портал запущен!`);
  console.log(` Откройте в браузере: http://localhost:${PORT}`);
  console.log(`================================================`);
});