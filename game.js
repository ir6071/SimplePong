// ==============================================================
// SimplePong 3D  —  Three.js r128
// Camera: behind-player perspective
// Physics: unchanged 2-D game-space
// ==============================================================

const canvas = document.getElementById('pong');
const GW = 800, GH = 500;           // game-space dimensions
const AW = 20,  AH = 12;            // 3-D arena world units
const PADDLE_W_PX = 14;             // paddle width in game pixels

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(GW, GH, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

// --- Scene & fog ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x010510);
scene.fog = new THREE.FogExp2(0x010510, 0.022);

// --- Camera: behind player paddle, angled across the table ---
const camera = new THREE.PerspectiveCamera(65, GW / GH, 0.1, 200);
camera.position.set(-11, 6, 8);
camera.lookAt(2, 0, 0);

// Coord helpers: game-space → 3-D world
const gx = x => (x / GW) * AW - AW / 2;   // 0..GW  → -10..+10
const gz = y => (y / GH) * AH - AH / 2;   // 0..GH  → -6..+6

// ==============================================================
// Lighting
// ==============================================================
scene.add(new THREE.AmbientLight(0x0a1428, 4));
scene.add(new THREE.HemisphereLight(0x112244, 0x000010, 1.2));

const sun = new THREE.DirectionalLight(0x3366cc, 0.6);
sun.position.set(8, 12, -4);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
scene.add(sun);

// Rim light from AI side — creates depth
const rimLight = new THREE.PointLight(0x2244aa, 1.5, 25);
rimLight.position.set(11, 4, 0);
scene.add(rimLight);

// ==============================================================
// Floor
// ==============================================================
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(AW, AH),
  new THREE.MeshStandardMaterial({ color: 0x030b18, metalness: 0.7, roughness: 0.3 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// Neon grid
const grid = new THREE.GridHelper(AW, 20, 0x002244, 0x001122);
grid.position.y = 0.01;
scene.add(grid);

// Arena edge lines (top & bottom)
const blueLine = new THREE.LineBasicMaterial({ color: 0x0055cc });
[-AH / 2, AH / 2].forEach(z => {
  const pts = [new THREE.Vector3(-AW / 2, 0.02, z), new THREE.Vector3(AW / 2, 0.02, z)];
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), blueLine));
});

// Centre dashes
const dashMat = new THREE.MeshStandardMaterial({ color: 0x0066bb, emissive: 0x003388, emissiveIntensity: 1.5 });
for (let i = -5; i <= 5; i++) {
  const d = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.65), dashMat);
  d.position.set(0, 0.02, i * 1.0);
  scene.add(d);
}

// ==============================================================
// Walls (top and bottom)
// ==============================================================
const wallMat = new THREE.MeshStandardMaterial({ color: 0x001a33, emissive: 0x001133, emissiveIntensity: 0.9 });
[-AH / 2, AH / 2].forEach(z => {
  const w = new THREE.Mesh(new THREE.BoxGeometry(AW + 0.4, 0.8, 0.2), wallMat);
  w.position.set(0, 0.4, z);
  scene.add(w);
  const edge = [new THREE.Vector3(-AW / 2, 0.82, z), new THREE.Vector3(AW / 2, 0.82, z)];
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(edge), blueLine));
});

// ==============================================================
// Paddles
// ==============================================================
function createPaddle(color) {
  const mat = new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 1.2,
    metalness: 0.7, roughness: 0.15,
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.7, 1), mat);
  mesh.castShadow = true;
  scene.add(mesh);
  const light = new THREE.PointLight(color, 2.5, 6);
  scene.add(light);
  return { mesh, light };
}
const player3D = createPaddle(0x44aaff);
const ai3D     = createPaddle(0xff6644);

// ==============================================================
// Ball
// ==============================================================
const ballMat = new THREE.MeshStandardMaterial({
  color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.5,
});
const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(0.25, 32, 20), ballMat);
ballMesh.castShadow = true;
scene.add(ballMesh);

const ballLight = new THREE.PointLight(0xffffff, 5, 8);
scene.add(ballLight);

// Soft shadow blob on floor
const blobMesh = new THREE.Mesh(
  new THREE.CircleGeometry(0.35, 20),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45 })
);
blobMesh.rotation.x = -Math.PI / 2;
blobMesh.position.y = 0.015;
scene.add(blobMesh);

// ==============================================================
// Trail
// ==============================================================
const TRAIL_N = 12;
const trailMeshes = Array.from({ length: TRAIL_N }, (_, i) => {
  const r = 0.03 + 0.22 * (i / TRAIL_N);
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(r, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0 })
  );
  scene.add(m);
  return m;
});

// ==============================================================
// Particle pool
// ==============================================================
const POOL = 200;
const pPool = Array.from({ length: POOL }, () => {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 4, 4),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
  );
  m.visible = false;
  scene.add(m);
  return m;
});
let pIdx = 0;
const activeP = [];

function spawnParticles(x3, z3, color) {
  for (let i = 0; i < 22; i++) {
    const a = Math.random() * Math.PI * 2, s = 0.03 + Math.random() * 0.18;
    const m = pPool[pIdx++ % POOL];
    m.visible = true;
    m.material.color.set(color);
    m.material.opacity = 1;
    m.position.set(x3, 0.35, z3);
    activeP.push({ m, vx: Math.cos(a) * s, vy: 0.04 + Math.random() * 0.12, vz: Math.sin(a) * s, life: 1 });
  }
}

// ==============================================================
// Touch indicator
// ==============================================================
const touchBall = new THREE.Mesh(
  new THREE.SphereGeometry(0.22, 16, 12),
  new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.8,
    transparent: true, opacity: 0,
  })
);
scene.add(touchBall);

// ==============================================================
// Game constants & state
// ==============================================================
const PADDLE_SPEED = 5, AI_SPEED = 4, CURVE = 0.6, MAX_VY_RATIO = 0.85;
let PADDLE_H = 130, BALL_SIZE = 10, SPEED_MULT = 1;

const state = {
  ball:   { x: GW / 2, y: GH / 2, vx: 4, vy: 3 },
  player: { y: GH / 2 - PADDLE_H / 2 },
  ai:     { y: GH / 2 - PADDLE_H / 2 },
  score:  { player: 0, ai: 0 },
  keys:   { up: false, down: false },
  touchY: null,
  trail:  [],
};

function resetBall(towardPlayer) {
  state.ball.x = GW / 2; state.ball.y = GH / 2; state.trail = [];
  const dir = towardPlayer ? -1 : 1;
  state.ball.vx = dir * (3 + Math.random() * 2);
  state.ball.vy = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 2);
}
function clampPaddle(y) { return Math.max(0, Math.min(GH - PADDLE_H, y)); }

// ==============================================================
// Game update  (same 2-D physics as before)
// ==============================================================
function update() {
  const b = state.ball;

  if (state.touchY !== null) {
    state.player.y = clampPaddle(state.touchY - PADDLE_H / 2);
  } else {
    if (state.keys.up)   state.player.y = clampPaddle(state.player.y - PADDLE_SPEED);
    if (state.keys.down) state.player.y = clampPaddle(state.player.y + PADDLE_SPEED);
  }

  const aic = state.ai.y + PADDLE_H / 2;
  if (aic < b.y - 5) state.ai.y = clampPaddle(state.ai.y + AI_SPEED);
  else if (aic > b.y + 5) state.ai.y = clampPaddle(state.ai.y - AI_SPEED);

  state.trail.push({ x: b.x, y: b.y });
  if (state.trail.length > TRAIL_N) state.trail.shift();

  b.x += b.vx * SPEED_MULT;
  b.y += b.vy * SPEED_MULT;

  const r = BALL_SIZE / 2;
  if (b.y - r <= 0)  { b.y = r;       b.vy =  Math.abs(b.vy); }
  if (b.y + r >= GH) { b.y = GH - r;  b.vy = -Math.abs(b.vy); }

  function bounce(paddleY, nxDir, pushX, x3, z3, col) {
    const t   = Math.max(-1, Math.min(1, (b.y - (paddleY + PADDLE_H / 2)) / (PADDLE_H / 2)));
    const mag = Math.sqrt(1 + CURVE * CURVE * t * t);
    const nx  = nxDir / mag, ny = CURVE * t / mag;
    const dot = b.vx * nx + b.vy * ny;
    b.vx = (b.vx - 2 * dot * nx) * 1.05;
    b.vy = (b.vy - 2 * dot * ny) * 1.05;
    b.x  = pushX;
    const mv = Math.abs(b.vx) * MAX_VY_RATIO;
    if (Math.abs(b.vy) > mv) b.vy = Math.sign(b.vy) * mv;
    spawnParticles(x3, z3, col);
  }

  const px = 20 + PADDLE_W_PX;
  if (b.vx < 0 && b.x - r <= px && b.x + r >= 20)
    if (b.y + r >= state.player.y && b.y - r <= state.player.y + PADDLE_H)
      bounce(state.player.y,  1,  px + r,
             gx(20 + PADDLE_W_PX / 2), gz(state.player.y + PADDLE_H / 2), 0x44aaff);

  const ax = GW - 20 - PADDLE_W_PX;
  if (b.vx > 0 && b.x + r >= ax && b.x - r <= GW - 20)
    if (b.y + r >= state.ai.y && b.y - r <= state.ai.y + PADDLE_H)
      bounce(state.ai.y, -1, ax - r,
             gx(GW - 20 - PADDLE_W_PX / 2), gz(state.ai.y + PADDLE_H / 2), 0xff6644);

  const spd = Math.sqrt(b.vx ** 2 + b.vy ** 2);
  if (spd > 12) { b.vx = b.vx / spd * 12; b.vy = b.vy / spd * 12; }

  if (b.x < 0)  { state.score.ai++;     setScore(); resetBall(false); }
  if (b.x > GW) { state.score.player++; setScore(); resetBall(true);  }

  // Update particles
  for (let i = activeP.length - 1; i >= 0; i--) {
    const p = activeP[i]; p.life -= 0.033;
    p.m.position.x += p.vx;
    p.m.position.y += p.vy;
    p.m.position.z += p.vz;
    p.vy -= 0.005;
    p.m.material.opacity = Math.max(0, p.life);
    if (p.life <= 0) { p.m.visible = false; activeP.splice(i, 1); }
  }
}

function setScore() {
  document.getElementById('score-player').textContent = state.score.player;
  document.getElementById('score-ai').textContent     = state.score.ai;
}

// ==============================================================
// Sync 3-D positions each frame
// ==============================================================
let t3d = 0;
function sync() {
  t3d += 0.016;
  const bx3 = gx(state.ball.x), bz3 = gz(state.ball.y);

  // Ball
  ballMesh.position.set(bx3, 0.25, bz3);
  ballLight.position.copy(ballMesh.position);
  blobMesh.position.x = bx3; blobMesh.position.z = bz3;
  ballMat.emissiveIntensity = 1.4 + 0.4 * Math.sin(t3d * 9);

  // Paddles
  const pd  = (PADDLE_H / GH) * AH;
  const pcz = gz(state.player.y + PADDLE_H / 2);
  const acz = gz(state.ai.y     + PADDLE_H / 2);

  player3D.mesh.position.set(gx(20 + PADDLE_W_PX / 2), 0.35, pcz);
  player3D.mesh.scale.z = pd;
  player3D.light.position.copy(player3D.mesh.position);

  ai3D.mesh.position.set(gx(GW - 20 - PADDLE_W_PX / 2), 0.35, acz);
  ai3D.mesh.scale.z = pd;
  ai3D.light.position.copy(ai3D.mesh.position);

  // Trail
  const tl = state.trail.length;
  trailMeshes.forEach((m, i) => {
    if (i < tl) {
      const p = state.trail[i];
      m.position.set(gx(p.x), 0.25, gz(p.y));
      m.material.opacity = (i / tl) * 0.5;
    } else {
      m.material.opacity = 0;
    }
  });

  // Touch indicator (glowing orb near player paddle)
  if (state.touchY !== null) {
    touchBall.material.opacity = 0.7;
    touchBall.position.set(gx(55), 0.6, gz(state.touchY));
  } else {
    touchBall.material.opacity = 0;
  }

  // Camera gently drifts with ball Z for drama
  const targetZ = 8 + gz(state.ball.y) * 0.12;
  camera.position.z += (targetZ - camera.position.z) * 0.025;
  camera.lookAt(2, 0, 0);
}

// ==============================================================
// Input
// ==============================================================
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowUp'   || e.key === 'w' || e.key === 'W') state.keys.up   = true;
  if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') state.keys.down = true;
});
document.addEventListener('keyup', e => {
  if (e.key === 'ArrowUp'   || e.key === 'w' || e.key === 'W') state.keys.up   = false;
  if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') state.keys.down = false;
});

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  state.touchY = (e.touches[0].clientY - rect.top) * (GH / rect.height);
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  state.touchY = (e.touches[0].clientY - rect.top) * (GH / rect.height);
}, { passive: false });

canvas.addEventListener('touchend', () => { state.touchY = null; });

// ==============================================================
// Sliders
// ==============================================================
function wire(id, vid, fn) {
  const el = document.getElementById(id), lbl = document.getElementById(vid);
  el.addEventListener('input', () => { lbl.textContent = el.value; fn(Number(el.value)); });
}
wire('speedSlider',  'speedVal',  v => { SPEED_MULT = v / 5; });
wire('ballSlider',   'ballVal',   v => { BALL_SIZE = v; ballMesh.scale.setScalar(v / 10); });
wire('paddleSlider', 'paddleVal', v => {
  PADDLE_H = v;
  state.player.y = clampPaddle(state.player.y);
  state.ai.y     = clampPaddle(state.ai.y);
});

// ==============================================================
// Main loop
// ==============================================================
(function loop() {
  requestAnimationFrame(loop);
  update();
  sync();
  renderer.render(scene, camera);
})();
