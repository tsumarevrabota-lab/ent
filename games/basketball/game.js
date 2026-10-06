const config = {
  type: Phaser.AUTO,
  width: 900,
  height: 500,
  parent: 'game-canvas',
  backgroundColor: '#1e293b',
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 650 }, debug: false }
  },
  scene: { create: create, update: update }
};

let game, ball, hoopGroup, backboard, hoopZone;
let obstacle;
let isAiming = false, trajectoryGraphics;
let score = 0, currentRound = 1;
const MAX_ROUNDS = 20;
let shotTaken = false;
let currentPointer = { x: 0, y: 0 };

document.getElementById('btn-bot').addEventListener('click', () => startGame('single'));
document.getElementById('btn-local').addEventListener('click', () => startGame('single'));
document.getElementById('btn-restart').addEventListener('click', resetGame);

function startGame(mode) {
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

  const leftWall = scene.add.rectangle(10, 250, 20, 500, 0x64748b);
  scene.physics.add.existing(leftWall, true);

  const rightWall = scene.add.rectangle(890, 250, 20, 500, 0x64748b);
  scene.physics.add.existing(rightWall, true);

  // Мяч
  ball = scene.add.circle(100, 300, 14, 0xf97316);
  scene.physics.add.existing(ball);
  ball.body.setCollideWorldBounds(true);
  ball.body.setBounce(0.7);
  ball.body.setDrag(0.998);

  // Группа для графики кольца
  hoopGroup = scene.add.graphics();

  // Физическое кольцо и щит
  backboard = scene.add.rectangle(0, 0, 12, 100, 0x000000, 0);
  scene.physics.add.existing(backboard, true);

  hoopZone = scene.add.rectangle(0, 0, 45, 10, 0x000000, 0);
  scene.physics.add.existing(hoopZone, true);

  // Препятствие
  obstacle = scene.add.rectangle(0, 0, 20, 100, 0x94a3b8);
  scene.physics.add.existing(obstacle, true);

  // Коллизии
  scene.physics.add.collider(ball, floor);
  scene.physics.add.collider(ball, topWall);
  scene.physics.add.collider(ball, leftWall);
  scene.physics.add.collider(ball, rightWall);
  scene.physics.add.collider(ball, backboard);
  scene.physics.add.collider(ball, obstacle);
  scene.physics.add.overlap(ball, hoopZone, () => handleGoal(scene));

  // Управление
  scene.input.on('pointerdown', (pointer) => {
    if (shotTaken || currentRound > MAX_ROUNDS) return;
    if (ball.body.speed > 10) return;

    isAiming = true;
    currentPointer.x = pointer.x;
    currentPointer.y = pointer.y;
    scene.physics.world.timeScale = 0.3; // Замедление при прицеливании
  });

  scene.input.on('pointermove', (pointer) => {
    if (isAiming) {
      currentPointer.x = pointer.x;
      currentPointer.y = pointer.y;
    }
  });

  scene.input.on('pointerup', () => {
    if (!isAiming) return;
    isAiming = false;
    shotTaken = true;
    scene.physics.world.timeScale = 1.0;
    trajectoryGraphics.clear();

    const vx = (ball.x - currentPointer.x) * 3.8;
    const vy = (ball.y - currentPointer.y) * 3.8;

    ball.body.setVelocity(vx, vy);

    // Если мяч остановился или промахнулся — через 3.5 сек новый раунд
    scene.time.delayedCall(3500, () => {
      nextRound(scene);
    });
  });

  setupNewRound(scene);
}

function setupNewRound(scene) {
  if (currentRound > MAX_ROUNDS) {
    alert(`Игра окончена! Ваш итоговый счет: ${score} из ${MAX_ROUNDS}`);
    return;
  }

  shotTaken = false;
  ball.body.setVelocity(0, 0);

  // 1. Случайная позиция мяча (в левой/средней части экрана)
  const ballX = Phaser.Math.Between(80, 400);
  const ballY = Phaser.Math.Between(150, 420);
  ball.setPosition(ballX, ballY);

  // 2. Случайная позиция кольца (в правой части экрана)
  const hoopX = Phaser.Math.Between(600, 820);
  const hoopY = Phaser.Math.Between(120, 320);

  backboard.setPosition(hoopX + 30, hoopY - 10);
  hoopZone.setPosition(hoopX, hoopY);

  // Перерисовка кольца и сетки в новых координатах
  drawHoop(hoopX, hoopY);

  // 3. Случайное препятствие (50% шанс появления)
  if (Math.random() > 0.5) {
    obstacle.setActive(true).setVisible(true);
    const obsX = Phaser.Math.Between(450, 580);
    const obsY = Phaser.Math.Between(150, 380);
    obstacle.setPosition(obsX, obsY);
  } else {
    obstacle.setActive(false).setVisible(false);
    obstacle.setPosition(-100, -100);
  }

  updateUI();
}

function drawHoop(x, y) {
  hoopGroup.clear();

  // Щит
  hoopGroup.lineStyle(3, 0xffffff, 0.9);
  hoopGroup.fillStyle(0xffffff, 0.15);
  hoopGroup.strokeRect(x + 24, y - 50, 10, 90);
  hoopGroup.fillRect(x + 24, y - 50, 10, 90);

  // Дужка кольца
  hoopGroup.lineStyle(4, 0xe11d48, 1);
  hoopGroup.strokeRoundedRect(x - 25, y - 4, 50, 8, 3);

  // Сетка
  hoopGroup.lineStyle(1.5, 0xf8fafc, 0.85);
  for (let i = -20; i <= 20; i += 8) {
    hoopGroup.lineBetween(x + i, y + 4, x + i * 0.5, y + 40);
  }
}

function update() {
  if (isAiming) {
    trajectoryGraphics.clear();
    const vx = (ball.x - currentPointer.x) * 3.8;
    const vy = (ball.y - currentPointer.y) * 3.8;

    drawTrajectory(ball.x, ball.y, vx, vy, config.physics.arcade.gravity.y);
  }
}

function drawTrajectory(startX, startY, vx, vy, gravity) {
  trajectoryGraphics.fillStyle(0x38bdf8, 0.85);
  const dt = 0.05;
  let x = startX, y = startY, currVy = vy;

  for (let i = 0; i < 28; i++) {
    x += vx * dt;
    y += currVy * dt;
    currVy += gravity * dt;

    trajectoryGraphics.fillCircle(x, y, Math.max(1, 3.5 - (i * 0.1)));
    if (y > 480 || x > 880 || x < 10) break;
  }
}

function handleGoal(scene) {
  if (!shotTaken) return;
  score++;
  updateUI();
  
  // При попадании сразу переходим к следующему раунду
  shotTaken = false;
  scene.time.delayedCall(800, () => {
    nextRound(scene);
  });
}

function nextRound(scene) {
  currentRound++;
  setupNewRound(scene);
}

function updateUI() {
  document.getElementById('p1-score').innerText = `Очки: ${score}`;
  document.getElementById('p2-score').innerText = `Раунд: ${Math.min(currentRound, MAX_ROUNDS)} / ${MAX_ROUNDS}`;
}

function resetGame() {
  score = 0;
  currentRound = 1;
  shotTaken = false;
  if (game && game.scene.scenes[0]) {
    setupNewRound(game.scene.scenes[0]);
  }
}