let aiSnakes = []; // スネークたち（2たい）
let foods = [];    // たべもの（100こ）

function setup() {
  createCanvas(600, 600); // キャンバス（えがくばしょ）

  // 2たいのスネークをつくる（なまえといろ）
  aiSnakes.push(new SnakeAI("あか", color(255, 0, 0)));
  aiSnakes.push(new SnakeAI("あお", color(0, 0, 255)));

  // たべものを100こつくる
  for (let i = 0; i < 100; i++) {
    foods.push(createFood());
  }
}

function draw() {
  background(30); // はいけいをくらく

  // スネークたちのこうどう
  for (let snake of aiSnakes) {
    snake.updateTarget(foods);  // いちばんちかいたべものをさがす
    snake.move();               // そこにむかってすすむ
    snake.show();               // からだとスコアをかく
    snake.checkEat();          // たべたかをチェック
    // snake.checkSelfCollision(); // じぶんにぶつかったかチェック
  }

  // たがいにぶつかっていないかチェック
  for (let i = 0; i < aiSnakes.length; i++) {
    for (let j = 0; j < aiSnakes.length; j++) {
      if (i !== j) {
        aiSnakes[i].checkCollisionWith(aiSnakes[j]);
      }
    }
  }

  // たべものをかく
  fill(255, 255, 0); // いろ（きいろ）
  noStroke();
  for (let f of foods) {
    ellipse(f.x, f.y, 10, 10); // まるをえがく
  }
}

// たべものをひとつつくる（ばしょはランダム）
function createFood() {
  return createVector(random(width), random(height));
}

// スネーククラス（AIよう）
class SnakeAI {
  constructor(name, snakeColor) {
    this.name = name; // なまえ
    this.body = [createVector(random(width), random(height))]; // はじめのばしょ
    this.len = 1; // ながさ
    this.speed = 2.2; // はやさ
    this.target = null; // めざすたべもの
    this.color = snakeColor; // いろ
    this.foodEaten = 0; // たべたかず
  }

  // いちばんさきのばしょ（あたま）
  head() {
    return this.body[this.body.length - 1];
  }

  // ちかいたべものをさがす（10フレームごと）
  updateTarget(foodList) {
    if (this.target && frameCount % 10 !== 0) return;

    let head = this.head();
    let nearest = null;
    let minDist = Infinity;

    // ちかくのものだけをさがす（100ピクセルいない）
    let candidates = foodList.filter(f => p5.Vector.dist(head, f) < 100);
    if (candidates.length === 0) candidates = foodList; // なければぜんぶから

    for (let f of candidates) {
      let d = p5.Vector.dist(head, f);
      if (d < minDist) {
        minDist = d;
        nearest = f;
      }
    }

    if (nearest) {
      this.target = nearest.copy(); // もくひょうにする
    }
  }

  // スネークをうごかす（もくひょうにむかって）
  move() {
    if (!this.target) return;

    let head = this.head().copy();
    let dir = p5.Vector.sub(this.target, head); // どっちにいくか
    dir.setMag(this.speed); // はやさをけってい
    head.add(dir); // あたまをすすませる

    // はしをこえたらうらからでる（まわるように）
    head.x = (head.x + width) % width;
    head.y = (head.y + height) % height;

    this.body.push(head); // あたまをからだにくわえる
    if (this.body.length > this.len) {
      this.body.shift(); // ながさをこえたらうしろをけす
    }
  }

  // たべものをたべたかチェック
  checkEat() {
    let head = this.head();
    for (let i = foods.length - 1; i >= 0; i--) {
      if (dist(head.x, head.y, foods[i].x, foods[i].y) < 10) {
        this.len++; // ながくなる
        this.foodEaten++; // スコアアップ
        foods.splice(i, 1); // たべたものをけす
        foods.push(createFood()); // あたらしくつくる
        break;
      }
    }
  }

  // じぶんのからだにぶつかったか
  checkSelfCollision() {
    let head = this.head();
    for (let i = 0; i < this.body.length - 10; i++) {
      if (dist(head.x, head.y, this.body[i].x, this.body[i].y) < 8) {
        noLoop(); // ゲームをとめる
        this.showGameOver(`${this.name} がじぶんのからだにあたりました！`);
      }
    }
  }

  // ほかのスネークにぶつかったか
  checkCollisionWith(otherSnake) {
    let head = this.head();
    for (let i = 0; i < otherSnake.body.length - 1; i++) {
      let b = otherSnake.body[i];
      if (dist(head.x, head.y, b.x, b.y) < 8) {
        noLoop(); // ゲームをとめる
        this.showGameOver(`${this.name} が ${otherSnake.name} のからだにあたりました！`);
      }
    }
  }

  // ゲームオーバーのひょうじ
  showGameOver(msg) {
    fill(255);
    textAlign(CENTER);
    textSize(28);
    text(msg, width / 2, height / 2);
  }

  // スネークとスコアをかく
  show() {
    noStroke();
    fill(this.color);
    for (let v of this.body) {
      ellipse(v.x, v.y, 10, 10); // まるをつなげる
    }

    // スコアひょうじ（あたまのうえ）
    let head = this.head();
    fill(255);
    textSize(12);
    textAlign(CENTER);
    // text(`${this.name}: ${this.len} (${this.foodEaten})`, head.x, head.y - 15);
    text(`${this.name}: ${this.len}`, head.x, head.y - 15);
  }
}