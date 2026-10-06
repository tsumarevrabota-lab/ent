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
let isAiming = false, aimGraphics;
let score1 = 0, score2 = 0, bounces = 0;
let currentTurn = 'player', gameMode = 'bot';

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
  aimGraphics = scene.add.graphics();

  const floor = scene.add.rectangle(450, 490, 900, 20, 0x475569);
  scene.physics.add.existing(floor, true);

  const topWall = scene.add.rectangle(450, 10, 900, 20, 0x475569);
  scene.physics.add.existing(topWall, true);

  wall = scene.add.rectangle(890, 250, 20, 500, 0x64748b);
  scene.physics.add.existing(wall, true);

  backboard = scene.add.rectangle(800, 200, 10, 90, 0xef4444);
  scene.physics.add.existing(backboard, true);

  hoop = scene.add.rectangle(760, 230, 60, 10, 0xf97316);
  scene.physics.add.existing(hoop, true);

  ball = scene.add.circle(150, 350, 14, 0xf97316);
  scene.physics.add.existing(ball);
  ball.body.setCollideWorldBounds(true);
  ball.body.setBounce(0.75);

  scene.physics.add.collider(ball, floor, () => bounces++);
  scene.physics.add.collider(ball, topWall, () => bounces++);
  scene.physics.add.collider(ball, wall, () => bounces++);
  scene.physics.add.collider(ball, backboard, () => bounces++);
  scene.physics.add.overlap(ball, hoop, () => handleGoal(scene));

  scene.input.on('pointerdown', () => {
    if (currentTurn === 'bot') return;
    isAiming = true;
  });

  scene.input.on('pointerup', (pointer) => {
    if (!isAiming || currentTurn === 'bot') return;
    isAiming = false;
    aimGraphics.clear();
    const vx = (150 - pointer.x) * 3.5;
    const vy = (350 - pointer.y) * 3.5;
    shootBall(vx, vy);
  });
}

function shootBall(vx, vy) {
  bounces = 0;
  ball.body.setVelocity(vx, vy);
}

function update() {
  if (isAiming) {
    aimGraphics.clear();
    aimGraphics.lineStyle(3, 0xfacc15, 0.8);
    const pointer = game.scene.scenes[0].input.activePointer;
    aimGraphics.strokeLineShape(new Phaser.Geom.Line(150, 350, pointer.x, pointer.y));
    document.getElementById('multiplier').innerText = `Множитель: x${bounces + 1}`;
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
  ball.setPosition(150, 350);
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