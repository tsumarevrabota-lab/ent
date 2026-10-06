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

let game, ball, hoop, backboard, wall;
let isAiming = false, trajectoryGraphics;
let score1 = 0, score2 = 0, bounces = 0;
let currentTurn = 'player', gameMode = 'bot';

// Фиксированная точка старта мяча (снизу слева)
const BALL_START_X = 120;
const BALL_START_Y = 380;

document.getElementById('btn-bot').addEventListener('click', () => startGame('bot'));
document.getElementById('btn-local').addEventListener('click', () => startGame('local'));
document.getElementById('btn-restart').addEventListener('click', resetGame);

function startGame(mode) {
  gameMode = mode;
  document.getElementById('menu').style.display = 'none';
  document.getElementById('game-info').style.display = 'flex';
  if (!game) {
    game = new Phaser.Game(config);
  } else {
    resetGame();
  }
}

function create() {
  const scene = this;
  trajectoryGraphics = scene.add.graphics();

  // Границы игрового поля
  const floor = scene.add.rectangle(450, 490, 900, 20, 0x475569);
  scene.physics.add.existing(floor, true);

  const topWall = scene.add.rectangle(450, 10, 900, 20, 0x475569);
  scene.physics.add.existing(topWall, true);

  wall = scene.add.rectangle(890, 250, 20, 500, 0x64748b);
  scene.physics.add.existing(wall, true);

  // --- Отрисовка реалистичного щита, кольца и сетки ---
  drawHoopAndBackboard(scene);

  // Мяч в фиксированной стартовой позиции
  ball = scene.add.circle(BALL_START_X, BALL_START_Y, 14, 0xf97316);
  scene.physics.add.existing(ball);
  ball.body.setCollideWorldBounds(true);
  ball.body.setBounce(0.75);

  // Физика столкновений
  scene.physics.add.collider(ball, floor, () => bounces++);
  scene.physics.add.collider(ball, topWall, () => bounces++);
  scene.physics.add.collider(ball, wall, () => bounces++);
  scene.physics.add.collider(ball, backboard, () => bounces++);
  scene.physics.add.overlap(ball, hoop, () => handleGoal(scene));

  // Управление мышыю / касанием
  scene.input.on('pointerdown', () => {
    if (currentTurn === 'bot') return;
    isAiming = true;
  });

  scene.input.on('pointerup', (pointer) => {
    if (!isAiming || currentTurn === 'bot') return;
    isAiming = false;
    trajectoryGraphics.clear();
    
    const vx = (BALL_START_X - pointer.x) * 3.5;
    const vy = (BALL_START_Y - pointer.y) * 3.5;
    shootBall(vx, vy);
  });
}

function drawHoopAndBackboard(scene) {
  const g = scene.add.graphics();

  // 1. Прозрачный стеклянный щит с белой рамкой
  g.lineStyle(3, 0xffffff, 0.9);
  g.fillStyle(0xffffff, 0.15);
  g.strokeRect(810, 140, 12, 110);
  g.fillRect(810, 140, 12, 110);
  
  // Внутренний квадрат на щите
  g.strokeRect(810, 200, 12, 35);

  // Физический щит для отскока
  backboard = scene.add.rectangle(816, 195, 12, 110, 0x000000, 0);
  scene.physics.add.existing(backboard, true);

  // 2. Металлическое кольцо (дужка)
  g.lineStyle(4, 0xe11d48, 1);
  g.strokeRoundedRect(740, 220, 70, 8, 4);

  // Зона попадания в кольцо
  hoop = scene.add.rectangle(770, 224, 50, 10, 0x000000, 0);
  scene.physics.add.existing(hoop, true);

  // 3. Белая сетка (сетчатый рисунок)
  g.lineStyle(1.5, 0xf8fafc, 0.85);
  const netStartX = 745;
  const netEndX = 805;
  const netTopY = 228;
  const netBottomY = 270;

  // Вертикальные и диагональные нити сетки
  for (let x = netStartX; x <= netEndX; x += 10) {
    g.lineBetween(x, netTopY, x + (x < 775 ? 5 : -5), netBottomY);
    g.lineBetween(x, netTopY, x + (x < 775 ? -5 : 5), netBottomY);
  }
}

function shootBall(vx, vy) {
  bounces = 0;
  ball.body.setVelocity(vx, vy);
}

function update() {
  if (isAiming) {
    trajectoryGraphics.clear();
    const pointer = game.scene.scenes[0].input.activePointer;

    // Расчет начальной скорости относительно фиксированной точки
    const vx = (BALL_START_X - pointer.x) * 3.5;
    const vy = (BALL_START_Y - pointer.y) * 3.5;

    // Отрисовка пунктирной траектории полета
    drawTrajectory(BALL_START_X, BALL_START_Y, vx, vy, config.physics.arcade.gravity.y);

    document.getElementById('multiplier').innerText = `Множитель: x${bounces + 1}`;
  }
}

function drawTrajectory(startX, startY, vx, vy, gravity) {
  trajectoryGraphics.fillStyle(0x38bdf8, 0.8);

  const dt = 0.05; // Шаг времени
  let x = startX;
  let y = startY;
  let currVx = vx;
  let currVy = vy;

  for (let i = 0; i < 25; i++) {
    x += currVx * dt;
    y += currVy * dt;
    currVy += gravity * dt; // Учитываем гравитацию

    // Рисуем пунктирные точки параболы
    trajectoryGraphics.fillCircle(x, y, 3.5 - (i * 0.08));

    // Прекращаем рисовать, если траектория ушла за пределы пола или стены
    if (y > 480 || x > 880) break;
  }
}

function handleGoal(scene) {
  const points = (bounces + 1) * 2;
  if (currentTurn === 'player') {
    score1 += points;
    document.getElementById('p1-score').innerText = `Игрок 1: ${score1}`;
  } else {
    score2 += points;
    const name = gameMode === 'bot' ? 'Бот' : 'Игрок 2';
    document.getElementById('p2-score').innerText = `${name}: ${score2}`;
  }

  resetBall();
  switchTurn(scene);
}

function resetBall() {
  ball.body.setVelocity(0, 0);
  ball.setPosition(BALL_START_X, BALL_START_Y);
  bounces = 0;
  document.getElementById('multiplier').innerText = `Множитель: x1`;
}

function switchTurn(scene) {
  if (gameMode === 'bot') {
    currentTurn = currentTurn === 'player' ? 'bot' : 'player';
    if (currentTurn === 'bot') {
      setTimeout(() => botShoot(), 1000);
    }
  } else {
    currentTurn = currentTurn === 'player' ? 'player2' : 'player';
  }
}

function botShoot() {
  const isBounceShot = Math.random() > 0.4;
  let vx = isBounceShot ? 550 + Math.random() * 100 : 420 + Math.random() * 30;
  let vy = isBounceShot ? -450 - Math.random() * 100 : -520 - Math.random() * 30;

  shootBall(vx, vy);
  setTimeout(() => {
    if (currentTurn === 'bot') {
      resetBall();
      currentTurn = 'player';
    }
  }, 4000);
}

function resetGame() {
  score1 = 0; score2 = 0;
  document.getElementById('p1-score').innerText = `Игрок 1: 0`;
  const name = gameMode === 'bot' ? 'Бот' : 'Игрок 2';
  document.getElementById('p2-score').innerText = `${name}: 0`;
  resetBall();
  currentTurn = 'player';
}