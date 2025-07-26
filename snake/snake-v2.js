let aiSnakes = [];
let foods = [];
let foodRespawnQueue = []; // 食べたフードの補充キュー

function setup() {
  createCanvas(600, 600);

  // AIスネーク2体を作成
  aiSnakes.push(new SnakeAI("Player", color(255, 255, 255), true)); // プレイヤー用スネーク
  aiSnakes.push(new SnakeAI("Red", color(255, 0, 0)));
  aiSnakes.push(new SnakeAI("Cyan", color(0, 255, 255)));
  aiSnakes.push(new SnakeAI("Puple", color(255, 0, 255)));
  aiSnakes.push(new SnakeAI("Blue", color(0, 0, 255)));
  aiSnakes.push(new SnakeAI("Green", color(0, 255, 0)));

  // 初期フード100個
  for (let i = 0; i < 100; i++) {
    foods.push(createFood());
  }
}

function draw() {
  background(30);

  // 各スネークの行動更新
  for (let snake of aiSnakes) {
    snake.update(foods);
  }

  // 衝突判定（生きているスネーク同士）
  for (let i = 0; i < aiSnakes.length; i++) {
    for (let j = 0; j < aiSnakes.length; j++) {
      if (i !== j && aiSnakes[i].isAlive && aiSnakes[j].isAlive) {
        aiSnakes[i].checkCollisionWith(aiSnakes[j]);
      }
    }
  }

  // フードの描画
  fill(255, 255, 0);
  noStroke();
  for (let f of foods) {
    ellipse(f.x, f.y, 10, 10);
  }

  // 🍎 フード補充処理（15フレームごとに1個）
  if (frameCount % 15 === 0 && foodRespawnQueue.length > 0) {
    foods.push(foodRespawnQueue.shift());
  }

  // 🧭 モニター表示
  fill(255);
  textSize(14);
  textAlign(LEFT);
  text(`🍎 Food: ${foods.length}`, 10, 20);
  text(`🔥 Potential: ${foodRespawnQueue.length}`, 10, 40);
}

function createFood() {
  return createVector(random(width), random(height));
}

class SnakeAI {
  constructor(name, snakeColor, isPlayer = false) {
    this.name = name;
    this.color = snakeColor;
    this.revive();
    this.aliveFrames = 0; // 生存時間（フレーム）
    this.isAlive = true;
    this.isPlayer = isPlayer; // プレイヤーかどうか
    this.deathTimer = 0;
  }

  head() {
    return this.body[this.body.length - 1];
  }

  update(foodList) {
    if (!this.isAlive) {
      this.deathTimer--;
      if (this.deathTimer <= 0) {
        this.revive();
      }
      return;
    }

    // 生きている間はカウントアップ
    this.aliveFrames++;
    if (!this.isPlayer) {
      this.updateTarget(foodList); // AI用
    }
    this.move();
    this.show();
    this.checkEat();
    this.checkSelfCollision();
  }

  revive() {
    this.body = [createVector(random(width), random(height))];
    this.len = 1;
    this.speed = 2.2;
    this.target = null;
    this.foodEaten = 0;
    this.isAlive = true;
    this.aliveFrames = 0;
  }

  die() {
    this.isAlive = false;
    this.deathTimer = 300;

    // 💀 死んだときに体の数だけフードを周囲にばらまく
    for (let v of this.body) {
      let offset = p5.Vector.random2D().mult(random(2));
      foods.push(v.copy().add(offset));
    }

    this.body = [];
  }

  updateTarget(foodList) {
    if (this.target && frameCount % 10 !== 0) return;

    let head = this.head();
    let nearest = null;
    let minDist = Infinity;

    let candidates = foodList.filter(f => p5.Vector.dist(head, f) < 200);
    if (candidates.length === 0) candidates = foodList;

    for (let f of candidates) {
      let d = p5.Vector.dist(head, f);
      if (d < minDist) {
        minDist = d;
        nearest = f;
      }
    }

    if (nearest) {
      this.target = nearest.copy();
    }
  }

  move() {
    let head = this.head().copy();
    let dir;

    if (this.isPlayer) {
      // 🕹️ プレイヤー：マウスの位置に向かって移動
      dir = p5.Vector.sub(createVector(mouseX, mouseY), head);
    } else {
      if (!this.target) return;
      dir = p5.Vector.sub(this.target, head);
    }

    dir.setMag(this.speed);
    head.add(dir);

    // wrap around
    head.x = (head.x + width) % width;
    head.y = (head.y + height) % height;

    this.body.push(head);
    if (this.body.length > this.len) {
      this.body.shift();
    }
  }
  
  checkEat() {
    let head = this.head();
    for (let i = foods.length - 1; i >= 0; i--) {
      if (dist(head.x, head.y, foods[i].x, foods[i].y) < 10) {
        this.len++;
        this.foodEaten++;
        foods.splice(i, 1);
        foodRespawnQueue.push(createFood()); // 🍎 即スポーンしない
        break;
      }
    }
  }

  checkSelfCollision() {
    let head = this.head();
    for (let i = 0; i < this.body.length - 10; i++) {
      if (dist(head.x, head.y, this.body[i].x, this.body[i].y) < 8) {
        this.die();
        return;
      }
    }
  }

  checkCollisionWith(otherSnake) {
    let head = this.head();
    for (let i = 0; i < otherSnake.body.length - 1; i++) {
      let b = otherSnake.body[i];
      if (dist(head.x, head.y, b.x, b.y) < 8) {
        this.die();
        return;
      }
    }
  }

  show() {
    if (!this.isAlive) return;

    noStroke();
    fill(this.color);
    for (let v of this.body) {
      ellipse(v.x, v.y, 10, 10);
    }

    let head = this.head();
    let seconds = (this.aliveFrames / 60).toFixed(1);
    fill(255);
    textSize(12);
    textAlign(CENTER);
    text(`${this.name}: ${seconds}s`, head.x, head.y - 15);
  }
}