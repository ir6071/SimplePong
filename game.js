const canvas = document.getElementById('pong');
const ctx = canvas.getContext('2d');

const W = 800;
const H = 500;
canvas.width = W;
canvas.height = H;

const PADDLE_W = 12;
const PADDLE_H = 80;
const BALL_SIZE = 10;
const PADDLE_SPEED = 5;
const AI_SPEED = 4;

const state = {
  ball: { x: W / 2, y: H / 2, vx: 4, vy: 3 },
  player: { y: H / 2 - PADDLE_H / 2 },
  ai: { y: H / 2 - PADDLE_H / 2 },
  score: { player: 0, ai: 0 },
  keys: { up: false, down: false },
  touchY: null,
};

function resetBall(towardPlayer) {
  state.ball.x = W / 2;
  state.ball.y = H / 2;
  const dir = towardPlayer ? -1 : 1;
  state.ball.vx = dir * (3 + Math.random() * 2);
  state.ball.vy = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 2);
}

function clampPaddle(y) {
  return Math.max(0, Math.min(H - PADDLE_H, y));
}

function update() {
  const b = state.ball;

  // Move player paddle
  if (state.touchY !== null) {
    state.player.y = clampPaddle(state.touchY - PADDLE_H / 2);
  } else {
    if (state.keys.up) state.player.y = clampPaddle(state.player.y - PADDLE_SPEED);
    if (state.keys.down) state.player.y = clampPaddle(state.player.y + PADDLE_SPEED);
  }

  // Move AI paddle toward ball
  const aiCenter = state.ai.y + PADDLE_H / 2;
  if (aiCenter < b.y - 5) state.ai.y = clampPaddle(state.ai.y + AI_SPEED);
  else if (aiCenter > b.y + 5) state.ai.y = clampPaddle(state.ai.y - AI_SPEED);

  // Move ball
  b.x += b.vx;
  b.y += b.vy;

  // Top/bottom wall bounce
  if (b.y - BALL_SIZE / 2 <= 0) { b.y = BALL_SIZE / 2; b.vy = Math.abs(b.vy); }
  if (b.y + BALL_SIZE / 2 >= H) { b.y = H - BALL_SIZE / 2; b.vy = -Math.abs(b.vy); }

  // Player paddle collision (left side, x=20)
  const px = 20 + PADDLE_W;
  if (b.vx < 0 && b.x - BALL_SIZE / 2 <= px && b.x + BALL_SIZE / 2 >= 20) {
    if (b.y + BALL_SIZE / 2 >= state.player.y && b.y - BALL_SIZE / 2 <= state.player.y + PADDLE_H) {
      b.x = px + BALL_SIZE / 2;
      b.vx = Math.abs(b.vx) * 1.05;
      const offset = (b.y - (state.player.y + PADDLE_H / 2)) / (PADDLE_H / 2);
      b.vy = offset * 5;
    }
  }

  // AI paddle collision (right side, x = W-20-PADDLE_W)
  const ax = W - 20 - PADDLE_W;
  if (b.vx > 0 && b.x + BALL_SIZE / 2 >= ax && b.x - BALL_SIZE / 2 <= W - 20) {
    if (b.y + BALL_SIZE / 2 >= state.ai.y && b.y - BALL_SIZE / 2 <= state.ai.y + PADDLE_H) {
      b.x = ax - BALL_SIZE / 2;
      b.vx = -Math.abs(b.vx) * 1.05;
      const offset = (b.y - (state.ai.y + PADDLE_H / 2)) / (PADDLE_H / 2);
      b.vy = offset * 5;
    }
  }

  // Cap speed
  const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
  if (speed > 12) { b.vx = (b.vx / speed) * 12; b.vy = (b.vy / speed) * 12; }

  // Score
  if (b.x < 0) { state.score.ai++; resetBall(false); }
  if (b.x > W) { state.score.player++; resetBall(true); }
}

function draw() {
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, W, H);

  // Center line
  ctx.setLineDash([10, 10]);
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2, 0);
  ctx.lineTo(W / 2, H);
  ctx.stroke();
  ctx.setLineDash([]);

  // Scores
  ctx.fillStyle = '#eee';
  ctx.font = '48px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(state.score.player, W / 4, 60);
  ctx.fillText(state.score.ai, (3 * W) / 4, 60);

  // Player paddle
  ctx.fillStyle = '#4af';
  ctx.fillRect(20, state.player.y, PADDLE_W, PADDLE_H);

  // AI paddle
  ctx.fillStyle = '#f64';
  ctx.fillRect(W - 20 - PADDLE_W, state.ai.y, PADDLE_W, PADDLE_H);

  // Ball
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(state.ball.x, state.ball.y, BALL_SIZE / 2, 0, Math.PI * 2);
  ctx.fill();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

// Keyboard
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') state.keys.up = true;
  if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') state.keys.down = true;
});
document.addEventListener('keyup', e => {
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') state.keys.up = false;
  if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') state.keys.down = false;
});

// Touch — map finger Y on canvas to paddle position
canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const scaleY = H / rect.height;
  state.touchY = (e.touches[0].clientY - rect.top) * scaleY;
}, { passive: false });

canvas.addEventListener('touchend', () => { state.touchY = null; });

loop();
