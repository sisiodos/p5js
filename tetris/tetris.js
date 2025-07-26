// 定数
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;

let board = []; // グリッド
let current; // 現在のテトリミノ
let nextPiece; // 次のテトリミノ
let score = 0; // スコア
const scoreTable = [0, 100, 300, 500, 800];

// テトリミノ形状（回転あり）
const TETROMINOES = {
  I: [[1,1,1,1]],
  O: [[1,1],[1,1]],
  T: [[0,1,0],[1,1,1]],
  S: [[0,1,1],[1,1,0]],
  Z: [[1,1,0],[0,1,1]],
  J: [[1,0,0],[1,1,1]],
  L: [[0,0,1],[1,1,1]]
};
const COLORS = {
  I: 'cyan',
  O: 'yellow',
  T: 'purple',
  S: 'green',
  Z: 'red',
  J: 'blue',
  L: 'orange'
};

function setup() {
  createCanvas(COLS * BLOCK_SIZE + 100, ROWS * BLOCK_SIZE); // ← 右に余白追加
  frameRate(30);
  for (let y = 0; y < ROWS; y++) board[y] = Array(COLS).fill(0);
  spawn();
}

let moveDelay = 5; // フレーム数ごとの間隔
let lastMoveFrame = 0;

function draw() {
  // 盤面エリアの背景（左10列）
  noStroke();
  fill(240);
  rect(0, 0, COLS * BLOCK_SIZE, ROWS * BLOCK_SIZE);

  // UIエリアの背景（右側 Next 表示領域）
  fill(200); // ← 少し濃いグレー
  rect(COLS * BLOCK_SIZE, 0, width - COLS * BLOCK_SIZE, height);

  // 本体処理
  drawBoard();
  if (frameCount % 30 === 0) move(0, 1);
  handleHeldKeys();
  drawPiece(current.shape, current.x, current.y, current.color);
  drawNextPiece();
  drawScore();
}

function handleHeldKeys() {
  if (frameCount - lastMoveFrame > moveDelay) {
    if (keyIsDown(LEFT_ARROW)) {
      move(-1, 0);
      lastMoveFrame = frameCount;
    } else if (keyIsDown(RIGHT_ARROW)) {
      move(1, 0);
      lastMoveFrame = frameCount;
    } else if (keyIsDown(DOWN_ARROW)) {
      move(0, 1);
      lastMoveFrame = frameCount;
    } else if (keyIsDown(90)) { // Zキー回転
      rotate_();
      lastMoveFrame = frameCount;
    }
  }
}

function drawBoard() {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (board[y][x]) {
        fill(board[y][x]);
        stroke(0);
        rect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
      }
    }
  }
}

function drawPiece(shape, x, y, c) {
  fill(c);
  stroke(0);
  for (let i = 0; i < shape.length; i++) {
    for (let j = 0; j < shape[i].length; j++) {
      if (shape[i][j]) {
        rect((x + j) * BLOCK_SIZE, (y + i) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
      }
    }
  }
}

function drawNextPiece() {
  const offsetX = COLS * BLOCK_SIZE + 20;
  const offsetY = 40;
  const miniSize = 20;

  fill(0);
  textSize(16);
  text("Next", offsetX, offsetY - 10);

  let shape = nextPiece.shape;
  fill(nextPiece.color);
  stroke(0);
  for (let i = 0; i < shape.length; i++) {
    for (let j = 0; j < shape[i].length; j++) {
      if (shape[i][j]) {
        rect(offsetX + j * miniSize, offsetY + i * miniSize, miniSize, miniSize);
      }
    }
  }
}

function drawScore() {
  const offsetX = COLS * BLOCK_SIZE + 20;
  const offsetY = 140;

  fill(0);
  textSize(16);
  text("Score", offsetX, offsetY);
  textSize(20);
  text(score, offsetX, offsetY + 24);
}

function spawn() {
  if (!nextPiece) nextPiece = generatePiece();
  current = nextPiece;
  current.x = 3;
  current.y = 0;
  nextPiece = generatePiece(); // 次のピースを生成
  if (collides(current.shape, current.x, current.y)) noLoop(); // Game Over
}

function generatePiece() {
  let keys = Object.keys(TETROMINOES);
  let key = random(keys);
  return {
    shape: TETROMINOES[key],
    x: 0,
    y: 0,
    color: COLORS[key]
  };
}

function move(dx, dy) {
  if (!collides(current.shape, current.x + dx, current.y + dy)) {
    current.x += dx;
    current.y += dy;
  } else if (dy === 1) {
    merge();
    clearLines();
    spawn();
  }
}

function rotate_() {
  let rotated = current.shape[0].map((_, i) =>
    current.shape.map(row => row[i]).reverse()
  );
  if (!collides(rotated, current.x, current.y)) current.shape = rotated;
}

function collides(shape, x, y) {
  for (let i = 0; i < shape.length; i++) {
    for (let j = 0; j < shape[i].length; j++) {
      if (shape[i][j]) {
        let nx = x + j;
        let ny = y + i;
        if (nx < 0 || nx >= COLS || ny >= ROWS || (ny >= 0 && board[ny][nx])) {
          return true;
        }
      }
    }
  }
  return false;
}

function merge() {
  for (let i = 0; i < current.shape.length; i++) {
    for (let j = 0; j < current.shape[i].length; j++) {
      if (current.shape[i][j]) {
        let ny = current.y + i;
        let nx = current.x + j;
        if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS)
          board[ny][nx] = current.color;
      }
    }
  }
}

function clearLines() {
  let linesCleared = 0;
  for (let y = ROWS - 1; y >= 0; y--) {
    if (board[y].every(cell => cell)) {
      board.splice(y, 1);
      board.unshift(Array(COLS).fill(0));
      y++; // もう一度同じ行を確認
      linesCleared++;
    }
  }

  // スコア加算（消去行数に応じて）
  score += scoreTable[linesCleared] || 0;
}