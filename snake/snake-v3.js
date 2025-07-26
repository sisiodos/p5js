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

  // 🏆 スコアボード表示（右上）
  let sortedSnakes = [...aiSnakes].sort((a, b) => b.aliveFrames - a.aliveFrames);
  let scoreboardX = width - 160;
  let scoreboardY = 20;
  textSize(14);
  textAlign(LEFT);
  fill(255);
  text("🏆 Scoreboard", scoreboardX, scoreboardY);
  textSize(12);
  for (let i = 0; i < sortedSnakes.length; i++) {
    let s = sortedSnakes[i];
    let status = s.isAlive ? "🟢" : "☠️";
    let seconds = (s.aliveFrames / 60).toFixed(1);
    text(`${status} ${s.name}  ${seconds}s`, scoreboardX, scoreboardY + 20 + i * 16);
  }
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
    this.ignoredFood = null;  // 直近回避により無視中の餌
    this.ignoreTimer = 0;     // フレームで経過管理
    this.ignoredAttackTarget = null; // 直近攻撃により無視中の敵頭
    this.attackIgnoreTimer = 0; // フレームで経過管理
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
      this.updateTarget(foodList, aiSnakes); // AI用
    }

    // 直近回避中のフードを無視する記憶を解除
    if (this.ignoreTimer > 0) {
      this.ignoreTimer--;
      if (this.ignoreTimer === 0) {
        this.ignoredFood = null;
      }
    }
    // 直近攻撃中の敵頭を無視する記憶を解除
    if (this.attackIgnoreTimer > 0) {
      this.attackIgnoreTimer--;
      if (this.attackIgnoreTimer === 0) {
        this.ignoredAttackTarget = null;
      }
    }
    this.move();
    this.show();
    this.checkEat();
    // this.checkSelfCollision();
  }

  revive() {
    this.body = [createVector(random(width), random(height))];
    this.len = 1;
    this.speed = 2.2;
    this.target = null;
    this.foodEaten = 0;
    this.isAlive = true;
    this.aliveFrames = 0;
    this.lastAction = null; // 最後の行動
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

  updateTarget(foodList, otherSnakes) {
    if (!this.isAlive || frameCount % 15 !== 0) return;

    let avoidanceVector = this.decideAvoidanceVector(otherSnakes);

    // 1. 体の回避が必要なら、そちらを最優先
    if (avoidanceVector) {
      // 直近回避中のフードを無視する
      if (this.lastAction === 'food' && this.target) {
        this.ignoredFood = this.target.copy();
        this.ignoreTimer = 120; // 約2秒（60FPS想定）無視
      }
      // 直近攻撃中の敵頭を無視する
      if (this.lastAction === 'attack' && this.target) {
        this.ignoredAttackTarget = this.target.copy(); // 攻撃対象だった相手を記憶
        this.attackIgnoreTimer = 60;
      }
      this.target = this.head().copy().add(avoidanceVector.mult(80)); // 強めに逸らす
      this.lastAction = 'avoidance';
      return;
    }

    // 2. 攻撃可能な敵の頭が近いなら、そこへ向かう
    let attackTarget = this.decideAttackTarget(otherSnakes);
    if (attackTarget) {
      this.target = attackTarget.copy();
      this.lastAction = 'attack';
      return;
    }

    // 3. 通常の餌ターゲット（安全時）
    let foodTarget = this.decideFoodTarget(foodList);
    if (foodTarget) {
      this.target = foodTarget.copy();
      this.lastAction = 'food';
    }
  }

  decideFoodTarget(foodList) {
    let head = this.head();
    let nearest = null;
    let minDist = Infinity;

    for (let f of foodList) {
      if (this.ignoredFood && dist(f.x, f.y, this.ignoredFood.x, this.ignoredFood.y) < 1) {
        continue;  // 無視中の餌をスキップ
      }

      let d = dist(head.x, head.y, f.x, f.y);
      if (d < minDist) {
        minDist = d;
        nearest = f;
      }
    }

    return nearest;
  }

  decideAvoidanceVector(otherSnakes) {
    let head = this.head();
    let avoidance = createVector(0, 0);

    for (let snake of otherSnakes) {
      if (!snake.isAlive || snake === this) continue;

      for (let i = 0; i < snake.body.length - 1; i++) {
        let b = snake.body[i];
        let d = dist(head.x, head.y, b.x, b.y);
        if (d < 30) {
          let away = p5.Vector.sub(head, b);
          away.normalize().div(d); // 距離が近いほど強く避ける
          avoidance.add(away);
        }
      }
    }

    return avoidance.mag() > 0 ? avoidance : null;
  }

  decideAttackTarget(otherSnakes) {
    let head = this.head();
    let nearest = null;
    let minDist = Infinity;

    for (let snake of otherSnakes) {
      if (!snake.isAlive || snake === this) continue;

      let enemyHead = snake.head();
      if (this.ignoredAttackTarget && p5.Vector.dist(enemyHead, this.ignoredAttackTarget) < 5) continue;

      let d = p5.Vector.dist(head, enemyHead);
      if (d < 80 && d < minDist) {
        minDist = d;
        nearest = enemyHead;
      }
    }

    return nearest;
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
        // break;
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

    // スネークの名前表示（上）
    text(`Len:${this.body.length}`, head.x, head.y - 20);

    // 状態表示（中段）
    text(`State: ${this.lastAction || 'idle'}`, head.x, head.y - 8);

    // 生存時間表示（下）
    let secondsAlive = Math.floor(this.aliveTimer / 60);
    text(`Time:${seconds}s`, head.x, head.y + 12);
  }
}