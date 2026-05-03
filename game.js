const canvas = document.getElementById('pong');
const ctx = canvas.getContext('2d');

const W = 800;
const H = 500;
canvas.width = W;
canvas.height = H;

const PADDLE_W = 14;
let PADDLE_H = 130;
let BALL_SIZE = 10;
let SPEED_MULT = 1;
const PADDLE_SPEED = 5;
const AI_SPEED = 4;
const CURVE = 0.6;
const MAX_VY_RATIO = 0.85;

const state = {
  ball: { x: W / 2, y: H / 2, vx: 4, vy: 3 },
  player: { y: H / 2 - PADDLE_H / 2 },
  ai: { y: H / 2 - PADDLE_H / 2 },
  score: { player: 0, ai: 0 },
  keys: { up: false, down: false },
  touchY: null,
  trail: [],
};

function resetBall(towardPlayer) {
  state.ball.x = W / 2;
  state.ball.y = H / 2;
  state.trail = [];
  const dir = towardPlayer ? -1 : 1;
  state.ball.vx = dir * (3 + Math.random() * 2);
  state.ball.vy = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 2);
}

function clampPaddle(y) {
  return Math.max(0, Math.min(H - PADDLE_H, y));
}

function update() {
  const b = state.ball;

  if (state.touchY !== null) {
    state.player.y = clampPaddle(state.touchY - PADDLE_H / 2);
  } else {
    if (state.keys.up) state.player.y = clampPaddle(state.player.y - PADDLE_SPEED);
    if (state.keys.down) state.player.y = clampPaddle(state.player.y + PADDLE_SPEED);
  }

  const aiCenter = state.ai.y + PADDLE_H / 2;
  if (aiCenter < b.y - 5) state.ai.y = clampPaddle(state.ai.y + AI_SPEED);
  else if (aiCenter > b.y + 5) state.ai.y = clampPaddle(state.ai.y - AI_SPEED);

  state.trail.push({ x: b.x, y: b.y });
  if (state.trail.length > 8) state.trail.shift();

  b.x += b.vx * SPEED_MULT;
  b.y += b.vy * SPEED_MULT;

  if (b.y - BALL_SIZE / 2 <= 0) { b.y = BALL_SIZE / 2; b.vy = Math.abs(b.vy); }
  if (b.y + BALL_SIZE / 2 >= H) { b.y = H - BALL_SIZE / 2; b.vy = -Math.abs(b.vy); }

  function curvedBounce(paddleY, normalXDir, pushX) {
    const t = Math.max(-1, Math.min(1, (b.y - (paddleY + PADDLE_H / 2)) / (PADDLE_H / 2)));
    const mag = Math.sqrt(1 + CURVE * CURVE * t * t);
    const nx = normalXDir / mag;
    const ny = (CURVE * t) / mag;
    const dot = b.vx * nx + b.vy * ny;
    b.vx = (b.vx - 2 * dot * nx) * 1.05;
    b.vy = (b.vy - 2 * dot * ny) * 1.05;
    b.x = pushX;
    const maxVy = Math.abs(b.vx) * MAX_VY_RATIO;
    if (Math.abs(b.vy) > maxVy) b.vy = Math.sign(b.vy) * maxVy;
  }

  const px = 20 + PADDLE_W;
  if (b.vx < 0 && b.x - BALL_SIZE / 2 <= px && b.x + BALL_SIZE / 2 >= 20) {
    if (b.y + BALL_SIZE / 2 >= state.player.y && b.y - BALL_SIZE / 2 <= state.player.y + PADDLE_H) {
      curvedBounce(state.player.y, 1, px + BALL_SIZE / 2);
    }
  }

  const ax = W - 20 - PADDLE_W;
  if (b.vx > 0 && b.x + BALL_SIZE / 2 >= ax && b.x - BALL_SIZE / 2 <= W - 20) {
    if (b.y + BALL_SIZE / 2 >= state.ai.y && b.y - BALL_SIZE / 2 <= state.ai.y + PADDLE_H) {
      curvedBounce(state.ai.y, -1, ax - BALL_SIZE / 2);
    }
  }

  const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
  if (speed > 12) { b.vx = (b.vx / speed) * 12; b.vy = (b.vy / speed) * 12; }

  if (b.x < 0) { state.score.ai++; resetBall(false); }
  if (b.x > W) { state.score.player++; resetBall(true); }
}

function draw() {
  const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.7);
  bg.addColorStop(0, '#0d1b2a');
  bg.addColorStop(1, '#060d14');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.setLineDash([10, 10]);
  ctx.strokeStyle = 'rgba(0, 220, 255, 0.25)';
  ctx.lineWidth = 2;
  ctx.shadowBlur = 8;
  ctx.shadowColor = '#0df';
  ctx.beginPath();
  ctx.moveTo(W / 2, 0);
  ctx.lineTo(W / 2, H);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.font = '48px monospace';
  ctx.textAlign = 'center';
  ctx.shadowBlur = 20;
  ctx.shadowColor = '#4af';
  ctx.fillStyle = '#9df';
  ctx.fillText(state.score.player, W / 4, 60);
  ctx.shadowColor = '#f64';
  ctx.fillStyle = '#fca';
  ctx.fillText(state.score.ai, (3 * W) / 4, 60);
  ctx.restore();

  function drawPaddle(x, y, color, faceRight) {
    const bulge = PADDLE_W * 1.2;
    const mx = faceRight ? x + PADDLE_W : x;
    const cpx = faceRight ? mx + bulge : mx - bulge;

    function paddlePath() {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + PADDLE_W, y);
      ctx.quadraticCurveTo(cpx, y + PADDLE_H / 2, faceRight ? x + PADDLE_W : x, y + PADDLE_H);
      if (faceRight) ctx.lineTo(x, y + PADDLE_H);
      else ctx.lineTo(x + PADDLE_W, y + PADDLE_H);
      ctx.closePath();
    }

    ctx.save();
    ctx.shadowBlur = 22;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    paddlePath();
    ctx.fill();
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#fff';
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(faceRight ? x + PADDLE_W : x, y);
    ctx.quadraticCurveTo(cpx, y + PADDLE_H / 2, faceRight ? x + PADDLE_W : x, y + PADDLE_H);
    ctx.stroke();
    ctx.restore();
  }

  drawPaddle(20, state.player.y, '#4af', true);
  drawPaddle(W - 20 - PADDLE_W, state.ai.y, '#f64', false);

  const tlen = state.trail.length;
  state.trail.forEach((p, i) => {
    const alpha = (i / tlen) * 0.35;
    const r = (BALL_SIZE / 2) * (0.3 + 0.5 * (i / tlen));
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200,230,255,${alpha})`;
    ctx.fill();
  });

  ctx.save();
  ctx.shadowBlur = 24;
  ctx.shadowColor = '#fff';
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(state.ball.x, state.ball.y, BALL_SIZE / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const handleX = W / 2;
  const handleY = state.touchY !== null ? state.touchY : H / 2;
  ctx.strokeStyle = state.touchY !== null ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(handleX, handleY - 40);
  ctx.lineTo(handleX, handleY + 40);
  ctx.stroke();
  ctx.fillStyle = state.touchY !== null ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.arc(handleX, handleY, 13, 0, Math.PI * 2);
  ctx.fill();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') state.keys.up = true;
  if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') state.keys.down = true;
});
document.addEventListener('keyup', e => {
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') state.keys.up = false;
  if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') state.keys.down = false;
});

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const scaleY = H / rect.height;
  state.touchY = (e.touches[0].clientY - rect.top) * scaleY;
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const scaleY = H / rect.height;
  state.touchY = (e.touches[0].clientY - rect.top) * scaleY;
}, { passive: false });

canvas.addEventListener('touchend', () => { state.touchY = null; });

function wire(id, valId, onChange) {
  const el = document.getElementById(id);
  const label = document.getElementById(valId);
  el.addEventListener('input', () => { label.textContent = el.value; onChange(Number(el.value)); });
}
wire('speedSlider', 'speedVal', v => { SPEED_MULT = v / 5; });
wire('ballSlider',  'ballVal',  v => { BALL_SIZE = v; });
wire('paddleSlider','paddleVal',v => {
  PADDLE_H = v;
  state.player.y = clampPaddle(state.player.y);
  state.ai.y = clampPaddle(state.ai.y);
});

loop();
