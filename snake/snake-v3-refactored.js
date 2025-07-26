// === GameState ===
class GameState {
  constructor() {
    this.snakes = [];
    this.foods = [];
    this.respawnQueue = [];
    this.decisionInterval = 20;
  }

  spawnFood(n = 1) {
    for (let i = 0; i < n; i++) this.foods.push(createVector(random(width), random(height)));
  }

  update() {
    this.snakes.forEach(s => s.update(this));
    this.checkCollisions();
    if (frameCount % this.decisionInterval === 0 && this.respawnQueue.length > 0) {
      this.foods.push(this.respawnQueue.shift());
    }
  }

  checkCollisions() {
    for (let i = 0; i < this.snakes.length; i++) {
      for (let j = 0; j < this.snakes.length; j++) {
        if (i !== j && this.snakes[i].isAlive && this.snakes[j].isAlive) {
          this.snakes[i].checkCollisionWith(this.snakes[j]);
        }
      }
    }
  }
}

// === SnakeStrategy ===
class SnakeStrategy {
  constructor(snake) {
    this.snake = snake;
    this.lastAvoidTarget = null;
    this.lastAttackTarget = null;
  }

  selectTarget(game) {
    // 1. Avoid
    let avoid = this.snake.findNearestBody(game.snakes);
    if (avoid && this.lastAvoidTarget !== avoid) {
      this.lastAvoidTarget = avoid;
      return { target: avoid, mode: 'avoid' };
    }

    // 2. Attack
    let attack = this.snake.findEnemyHead(game.snakes);
    if (attack && this.lastAttackTarget !== attack) {
      this.lastAttackTarget = attack;
      return { target: attack, mode: 'attack' };
    }

    // 3. Food
    let food = this.snake.findNearestFood(game.foods);
    return { target: food, mode: 'food' };
  }
}

// === SnakeState ===
class SnakeState {
  constructor() {
    this.isAlive = true;
    this.framesAlive = 0;
  }

  tick() {
    if (this.isAlive) this.framesAlive++;
  }

  reset() {
    this.framesAlive = 0;
    this.isAlive = true;
  }
}

// === SnakeRenderer ===
class SnakeRenderer {
  constructor(snake) {
    this.snake = snake;
  }

  draw() {
    stroke(this.snake.color);
    strokeWeight(10);
    noFill();
    beginShape();
    for (let p of this.snake.body) vertex(p.x, p.y);
    endShape();

    // Head info
    noStroke();
    fill(this.snake.color);
    textSize(12);
    textAlign(CENTER);
    text(`${this.snake.name}\n${this.snake.body.length} / ${(this.snake.foodCount || 0)} / ${floor(this.snake.state.framesAlive / 60)}s`, this.snake.head.x, this.snake.head.y - 12);
  }
}

// === SnakeAI ===
class SnakeAI {
  constructor(name, col) {
    this.name = name;
    this.color = col;
    this.head = createVector(random(width), random(height));
    this.body = [this.head.copy()];
    this.velocity = p5.Vector.random2D().mult(2);
    this.foodCount = 0;
    this.strategy = new SnakeStrategy(this);
    this.state = new SnakeState();
    this.renderer = new SnakeRenderer(this);
    this.target = null;
  }

  get isAlive() {
    return this.state.isAlive;
  }

  update(game) {
    if (!this.isAlive) return;

    let decision = this.strategy.selectTarget(game);
    if (decision.target) {
      let desired = p5.Vector.sub(decision.target, this.head).setMag(2);
      this.velocity = desired;
    }

    this.head.add(this.velocity);
    this.body.unshift(this.head.copy());
    if (this.body.length > this.foodCount + 10) this.body.pop();

    for (let i = game.foods.length - 1; i >= 0; i--) {
      if (p5.Vector.dist(this.head, game.foods[i]) < 10) {
        game.respawnQueue.push(game.foods.splice(i, 1)[0]);
        this.foodCount++;
      }
    }

    this.state.tick();
    this.renderer.draw();
  }

  findNearestFood(foods) {
    let closest = null;
    let dmin = Infinity;
    for (let f of foods) {
      let d = p5.Vector.dist(this.head, f);
      if (d < dmin) [closest, dmin] = [f, d];
    }
    return closest;
  }

  findNearestBody(snakes) {
    let minD = 60;
    let result = null;
    for (let other of snakes) {
      if (other === this || !other.isAlive) continue;
      for (let i = 3; i < other.body.length; i++) {
        let d = p5.Vector.dist(this.head, other.body[i]);
        if (d < minD) {
          minD = d;
          result = p5.Vector.add(other.body[i], p5.Vector.random2D().mult(30));
        }
      }
    }
    return result;
  }

  findEnemyHead(snakes) {
    let closest = null;
    let dmin = 60;
    for (let other of snakes) {
      if (other === this || !other.isAlive) continue;
      let d = p5.Vector.dist(this.head, other.head);
      if (d < dmin) [closest, dmin] = [other.head, d];
    }
    return closest;
  }

  checkCollisionWith(other) {
    for (let i = 3; i < other.body.length; i++) {
      if (p5.Vector.dist(this.head, other.body[i]) < 8) {
        this.state.isAlive = false;
        this.spawnFoodFromBody();
        break;
      }
    }
  }

  spawnFoodFromBody() {
    for (let i = 0; i < this.body.length; i++) {
      game.respawnQueue.push(this.body[i]);
    }
    this.body = [];
  }
}

// === Setup & Draw ===
let game;
function setup() {
  createCanvas(600, 600);
  game = new GameState();

  const colors = [
    { name: "Red", color: color(255, 0, 0) },
    { name: "Blue", color: color(0, 100, 255) },
    { name: "Green", color: color(0, 255, 100) },
  ];
  for (let cfg of colors) game.snakes.push(new SnakeAI(cfg.name, cfg.color));
  game.spawnFood(100);
}

function draw() {
  background(30);
  game.update();
  drawFoods();
  drawStatus();
  drawScoreboard();
}

function drawFoods() {
  fill(255, 255, 0);
  noStroke();
  for (let f of game.foods) ellipse(f.x, f.y, 10, 10);
}

function drawStatus() {
  fill(255);
  textSize(14);
  textAlign(LEFT);
  text(`🍎 Food: ${game.foods.length}`, 10, 20);
  text(`🔥 Potential: ${game.respawnQueue.length}`, 10, 40);
}

function drawScoreboard() {
  let sorted = [...game.snakes].sort((a, b) => b.state.framesAlive - a.state.framesAlive);
  let x = width - 160, y = 20;

  fill(255);
  textSize(14);
  textAlign(LEFT);
  text("🏆 Scoreboard", x, y);
  textSize(12);

  sorted.forEach((s, i) => {
    let status = s.isAlive ? "🟢" : "☠️";
    let seconds = (s.state.framesAlive / 60).toFixed(1);
    text(`${status} ${s.name}  ${seconds}s`, x, y + 20 + i * 16);
  });
}