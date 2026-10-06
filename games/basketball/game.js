const config = {
  type: Phaser.AUTO,
  width: 900,
  height: 500,
  parent: 'game-canvas',
  backgroundColor: '#1e293b',
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 700 }, debug: false }
  },
  scene: { create: create, update: update }
};

let game, ball1, ball2, myBall, enemyBall, hoop, backboard;
let isAiming = false, trajectoryGraphics;
let score1 = 0, score2 = 0, bounces = 0;
let gameMode = 'bot'; // 'bot' или 'online'
let myPlayerNumber = 1;
let socket;

const P1_START_X = 120, P1_START_Y = 380;
const P2_START_X = 300, P2_START_Y = 380;

document.getElementById('btn-bot').addEventListener('click', () => startGame('bot'));
document.getElementById('btn-local').addEventListener('click', () => startGame('online'));
document.getElementById('btn-restart').addEventListener('click', resetGame);

function startGame(mode) {
  gameMode = mode;
  document.getElementById('menu').style.display = 'none';
  document.getElementById('game-info').style.display = 'flex';
  
  if (mode === 'online') {
    setupSocket();
  }

  if (!game) {
    game = new Phaser.Game(config);
  } else {
    resetGame();
  }
}

function setupSocket() {
  socket = io();

  socket.on('init_player', (data) => {
    if (data.number !== 0) {
      myPlayerNumber = data.number;
      alert(`Вы подключились как Игрок ${myPlayerNumber}!`);
    } else {
      alert('Комната заполнена. Вы зашли как зритель.');
    }
  });

  socket.on('enemy_shoot', (data) => {
    if (enemyBall) {
      enemyBall.body.setVelocity(data.vx, data.vy);
    }
  });

  socket.on('enemy_ball_update', (data) => {
    if (enemyBall) {
      enemyBall.setPosition(data.x, data.y);
    }
  });
}

function create() {
  const scene = this;
  trajectoryGraphics = scene.add.graphics();

  // Границы игрового поля
  const floor = scene.add.rectangle(450, 490, 900, 20, 0x475569);
  scene.physics.add.existing(floor, true);

  const topWall = scene.add.rectangle(450, 10, 900, 20, 0x475569);
  scene.physics.add.existing(topWall, true);

  const wall = scene.add.rectangle(890, 250, 20, 500, 0x64748b);
  scene.physics.add.existing(wall, true);

  drawHoopAndBackboard(scene);

  // --- Создание двух мячей ---
  ball1 = createBall(scene, P1_START_X, P1_START_Y, 0x38bdf8); // Синий
  ball2 = createBall(scene, P2_START_X, P2_START_Y, 0xf43f5e); // Красный

  if (gameMode === 'online' && myPlayerNumber === 2) {
    myBall = ball2;
    enemyBall = ball1;
  } else {
    myBall = ball1;
    enemyBall = ball2;
  }

  // Настройка коллизий с трением для обоим мячам
  [ball1, ball2].forEach(b => {
    scene.physics.add.collider(b, floor, () => { bounces++; applyFriction(b); });
    scene.physics.add.collider(b, topWall, () => bounces++);
    scene.physics.add.collider(b, wall, () => bounces++);
    scene.physics.add.collider(b, backboard, () => bounces++);
    scene.physics.add.overlap(b, hoop, () => handleGoal(scene, b));
  });

  // Управление
  scene.input.on('pointerdown', () => {
    isAiming = true;
    scene.physics.world.timeScale = 0.25; // ? Замедление времени (Bullet-time)
  });

  scene.input.on('pointerup', (pointer) => {
    if (!isAiming) return;
    isAiming = false;
    scene.physics.world.timeScale = 1.0; // Возвращаем нормальную скорость
    trajectoryGraphics.clear();
    
    // Бросок от текущего положения моего мяча
    const vx = (myBall.x - pointer.x) * 3.5;
    const vy = (myBall.y - pointer.y) * 3.5;
    
    myBall.body.setVelocity(vx, vy);

    if (gameMode === 'online' && socket) {
      socket.emit('shoot', { vx, vy });
    }
  });
}

function createBall(scene, x, y, color) {
  const b = scene.add.circle(x, y, 14, color);
  scene.physics.add.existing(b);
  b.body.setCollideWorldBounds(true);
  b.body.setBounce(0.7);
  
  // ?? Сопротивление воздуха и трение, чтобы мяч останавливался!
  b.body.setDamping(true);
  b.body.setDrag(0.985); 
  
  return b;
}

function applyFriction(ball) {
  // Дополнительное затухание при подкатывании по полу
  ball.body.setVelocityX(ball.body.velocity.x * 0.85);
}

function drawHoopAndBackboard(scene) {
  const g = scene.add.graphics();
  g.lineStyle(3, 0xffffff, 0.9);
  g.fillStyle(0xffffff, 0.15);
  g.strokeRect(810, 140, 12, 110);
  g.fillRect(810, 140, 12, 110);
  g.strokeRect(810, 200, 12, 35);

  backboard = scene.add.rectangle(816, 195, 12, 110, 0x000000, 0);
  scene.physics.add.existing(backboard, true);

  g.lineStyle(4, 0xe11d48, 1);
  g.strokeRoundedRect(740, 220, 70, 8, 4);

  hoop = scene.add.rectangle(770, 224, 50, 10, 0x000000, 0);
  scene.physics.add.existing(hoop, true);

  g.lineStyle(1.5, 0xf8fafc, 0.85);
  for (let x = 745; x <= 805; x += 10) {
    g.lineBetween(x, 228, x + (x < 775 ? 5 : -5), 270);
    g.lineBetween(x, 228, x + (x < 775 ? -5 : 5), 270);
  }
}

function update() {
  if (isAiming && myBall) {
    trajectoryGraphics.clear();
    const pointer = game.scene.scenes[0].input.activePointer;

    const vx = (myBall.x - pointer.x) * 3.5;
    const vy = (myBall.y - pointer.y) * 3.5;

    // ?? Рисуем траекторию прямо ИЗ текущего положения мяча
    drawTrajectory(myBall.x, myBall.y, vx, vy, config.physics.arcade.gravity.y);
  }

  // Синхронизация сетевых координат
  if (gameMode === 'online' && socket && myBall) {
    socket.emit('update_ball', { x: myBall.x, y: myBall.y });
  }
}

function drawTrajectory(startX, startY, vx, vy, gravity) {
  trajectoryGraphics.fillStyle(0x38bdf8, 0.8);
  const dt = 0.05;
  let x = startX, y = startY, currVy = vy;

  for (let i = 0; i < 25; i++) {
    x += vx * dt;
    y += currVy * dt;
    currVy += gravity * dt;

    trajectoryGraphics.fillCircle(x, y, 3.5 - (i * 0.08));
    if (y > 480 || x > 880) break;
  }
}

function handleGoal(scene, ball) {
  const points = (bounces + 1) * 2;
  if (ball === ball1) {
    score1 += points;
    document.getElementById('p1-score').innerText = `Игрок 1: ${score1}`;
    resetBall(ball1, P1_START_X, P1_START_Y);
  } else {
    score2 += points;
    const name = gameMode === 'bot' ? 'Бот' : 'Игрок 2';
    document.getElementById('p2-score').innerText = `${name}: ${score2}`;
    resetBall(ball2, P2_START_X, P2_START_Y);
  }
}

function resetBall(ball, x, y) {
  ball.body.setVelocity(0, 0);
  ball.setPosition(x, y);
  bounces = 0;
}

function resetGame() {
  score1 = 0; score2 = 0;
  document.getElementById('p1-score').innerText = `Игрок 1: 0`;
  document.getElementById('p2-score').innerText = `Игрок 2 / Бот: 0`;
  resetBall(ball1, P1_START_X, P1_START_Y);
  resetBall(ball2, P2_START_X, P2_START_Y);
}