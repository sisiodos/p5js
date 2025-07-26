let player;
let enemies = [];
let gravity = 1;
let jumpPower = -15;
let groundY;
let gameOver = false;

function setup() {
  createCanvas(600, 300);
  groundY = height - 40;

  player = {
    x: 50,
    y: groundY,
    vy: 0,
    size: 30
  };
}

function draw() {
  background(220);

  // 地面
  fill(180);
  rect(0, groundY, width, height - groundY);

  if (gameOver) {
    fill(0);
    textSize(32);
    text("Game Over", width/2 - 90, height/2);
    return;
  }

  // プレイヤー
  fill('dodgerblue');
  player.vy += gravity;
  player.y += player.vy;
  if (player.y > groundY) {
    player.y = groundY;
    player.vy = 0;
  }
  rect(player.x, player.y - player.size, player.size, player.size);

  // 敵の生成
  if (frameCount % 90 === 0) {
    enemies.push({ x: width, y: groundY, size: 30 });
  }

  // 敵の更新・描画・衝突判定
  fill('red');
  for (let i = enemies.length - 1; i >= 0; i--) {
    let e = enemies[i];
    e.x -= 5;
    rect(e.x, e.y - e.size, e.size, e.size);

    // 衝突判定
    if (collides(player, e)) {
      gameOver = true;
    }

    // 画面外の敵を削除
    if (e.x + e.size < 0) enemies.splice(i, 1);
  }
}

function keyPressed() {
  if (key === ' ' || keyCode === UP_ARROW) {
    if (player.y === groundY) {
      player.vy = jumpPower;
    }
  }
}

function collides(a, b) {
  return (
    a.x < b.x + b.size &&
    a.x + a.size > b.x &&
    a.y < b.y + b.size &&
    a.y + a.size > b.y
  );
}