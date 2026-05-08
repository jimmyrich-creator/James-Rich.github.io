/* FUNKY PUZZLE – Drag & Drop Geometric Puzzle */

const PIECE_COUNT = 8;
const SNAP_DIST = 28;
const SNAP_ANGLE = 0.20;
const SNAP_HOLD_TIME = 1000;
const DRAG_ROTATE_SPEED = 0.03;
const IMAGE_SRC = 'puzzle.jpg';

const SHAPE_DEFS = [
  [[.40, .22], [.68, .25], [.82, .48], [.65, .78]],
  [[.65, .78], [.35, .75], [.18, .48], [.40, .22]],
  [[0, 0], [.40, 0], [.40, .22], [.18, .48], [0, .48]],
  [[.40, 0], [.68, 0], [.68, .25], [.40, .22]],
  [[.68, 0], [1, 0], [1, .48], [.82, .48], [.68, .25]],
  [[.82, .48], [1, .48], [1, 1], [.65, 1], [.65, .78]],
  [[.65, 1], [.35, 1], [.35, .75], [.65, .78]],
  [[.35, .75], [.35, 1], [0, 1], [0, .48], [.18, .48]]
];

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const hud = document.getElementById('hud');
const timerEl = document.getElementById('timer');
const countEl = document.getElementById('piece-count');
const startScr = document.getElementById('start-screen');
const winScr = document.getElementById('win-screen');
const winTime = document.getElementById('win-time');

let pieces = [], img = null, gameState = 'start', scale = 1;
let ghostX, ghostY, imgW, imgH, rawW, rawH;
let elapsed = 0, timerRef = null, placedCount = 0;
let dragPiece = null, dragOffset = { x: 0, y: 0 };
let starField = [], particles = [];
let audioCtx;

function lerp(a, b, t) { return a + (b - a) * t }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }
function rng(lo, hi) { return lo + Math.random() * (hi - lo) }

function getCentroid(poly) {
  let cx = 0, cy = 0;
  for (const p of poly) { cx += p[0]; cy += p[1] }
  return { x: cx / poly.length, y: cy / poly.length };
}
function pointInPolygon(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function polyBounds(poly) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of poly) {
    if (p[0] < x0) x0 = p[0]; if (p[1] < y0) y0 = p[1];
    if (p[0] > x1) x1 = p[0]; if (p[1] > y1) y1 = p[1];
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// Compute target screen position for a piece from its normalized centroid
function getTarget(normCX, normCY) {
  return { x: ghostX + normCX * imgW, y: ghostY + normCY * imgH };
}

// ── Thud Sound (Web Audio API) ──────────────────
function playThud() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;
    // Low-frequency impact
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.18);
    g.gain.setValueAtTime(0.45, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(g); g.connect(audioCtx.destination);
    osc.start(now); osc.stop(now + 0.22);
    // Noise burst for impact texture
    const len = audioCtx.sampleRate * 0.06 | 0;
    const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.15));
    const ns = audioCtx.createBufferSource(); ns.buffer = buf;
    const ng = audioCtx.createGain();
    ng.gain.setValueAtTime(0.18, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    ns.connect(ng); ng.connect(audioCtx.destination);
    ns.start(now);
  } catch (e) { }
}

// ── Start-screen particles ──────────────────────
(function () {
  const c = document.getElementById('bg-particles');
  if (!c) return;
  const bctx = c.getContext('2d');
  c.width = innerWidth; c.height = innerHeight;
  const dots = Array.from({ length: 80 }, () => ({
    x: Math.random() * c.width, y: Math.random() * c.height,
    r: Math.random() * 1.8 + .4, vx: (Math.random() - .5) * .3,
    vy: (Math.random() - .5) * .3, a: Math.random() * .6 + .2
  }));
  (function loop() {
    if (gameState !== 'start') return;
    bctx.clearRect(0, 0, c.width, c.height);
    dots.forEach(d => {
      d.x += d.vx; d.y += d.vy;
      if (d.x < 0) d.x = c.width; if (d.x > c.width) d.x = 0;
      if (d.y < 0) d.y = c.height; if (d.y > c.height) d.y = 0;
      bctx.beginPath(); bctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      bctx.fillStyle = `rgba(255,215,0,${d.a})`; bctx.fill();
    });
    requestAnimationFrame(loop);
  })();
})();

// ── Load image ──────────────────────────────────
img = new Image();
img.onload = () => {
  rawW = img.width; rawH = img.height;
  document.getElementById('play-btn').addEventListener('click', startGame);
  document.getElementById('reset-btn').addEventListener('click', resetPieces);
  document.getElementById('replay-btn').addEventListener('click', () => {
    winScr.classList.add('hidden'); startGame();
  });
};
img.src = IMAGE_SRC;

function resize() {
  canvas.width = innerWidth; canvas.height = innerHeight;
  if (!img || !rawW) return;
  const maxH = canvas.height * 0.52, maxW = canvas.width * 0.55;
  scale = Math.min(maxH / rawH, maxW / rawW);
  imgW = Math.round(rawW * scale); imgH = Math.round(rawH * scale);
  ghostX = Math.round((canvas.width - imgW) / 2);
  ghostY = Math.round(canvas.height * 0.85 - imgH);
  // Update placed pieces to track new ghost position
  if (pieces.length) {
    pieces.forEach(p => {
      if (p.placed) {
        const t = getTarget(p.normCX, p.normCY);
        p.x = t.x; p.y = t.y;
      }
    });
  }
}
window.addEventListener('resize', resize);

function initStars() {
  starField = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width, y: Math.random() * canvas.height,
    r: Math.random() * 1.2 + .3, a: Math.random() * .5 + .1,
    flicker: Math.random() * Math.PI * 2
  }));
}

function buildTexture(normPoly) {
  const dpoly = normPoly.map(p => [p[0] * imgW, p[1] * imgH]);
  const bb = polyBounds(dpoly);
  const pad = 2, cw = Math.ceil(bb.w) + pad * 2, ch = Math.ceil(bb.h) + pad * 2;
  const c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  const o = c.getContext('2d');
  o.beginPath();
  dpoly.forEach((p, i) => {
    if (i === 0) o.moveTo(p[0] - bb.x + pad, p[1] - bb.y + pad);
    else o.lineTo(p[0] - bb.x + pad, p[1] - bb.y + pad);
  });
  o.closePath(); o.clip();
  o.drawImage(img, 0, 0, rawW, rawH, -bb.x + pad, -bb.y + pad, imgW, imgH);
  return { canvas: c, bbX: bb.x, bbY: bb.y, pad };
}

function createPieces() {
  pieces = []; placedCount = 0;
  countEl.textContent = `0 / ${PIECE_COUNT}`;
  SHAPE_DEFS.forEach((normPoly, i) => {
    const dpoly = normPoly.map(p => [p[0] * imgW, p[1] * imgH]);
    const cent = getCentroid(dpoly);
    const localPoly = dpoly.map(p => [p[0] - cent.x, p[1] - cent.y]);
    const tex = buildTexture(normPoly);
    // Store normalised centroid for dynamic target computation
    const normCent = getCentroid(normPoly);
    const bb = polyBounds(dpoly);
    pieces.push({
      normPoly, localPoly,
      texture: tex.canvas,
      texOffX: tex.bbX - cent.x - tex.pad,
      texOffY: tex.bbY - cent.y - tex.pad,
      normCX: normCent.x, normCY: normCent.y,
      x: rng(canvas.width * 0.08 + bb.w / 2, canvas.width * 0.92 - bb.w / 2),
      y: rng(bb.h, ghostY - bb.h * 0.3),
      angle: rng(-0.6, 0.6),
      placed: false, glowAlpha: 0,
      hoverStart: 0, hoverProgress: 0,
      snapGlow: 0, // 1→0 fade after snapping
      index: i
    });
  });
}

// ── Input ───────────────────────────────────────
let pointerDown = false, pointerPos = { x: 0, y: 0 };
function getPointerPos(e) {
  const t = e.touches ? e.touches[0] : e;
  return { x: t.clientX, y: t.clientY };
}
function findPieceAt(px, py) {
  for (let i = pieces.length - 1; i >= 0; i--) {
    const p = pieces[i];
    if (p.placed) continue;
    const dx = px - p.x, dy = py - p.y;
    const c = Math.cos(-p.angle), s = Math.sin(-p.angle);
    if (pointInPolygon(dx * c - dy * s, dx * s + dy * c, p.localPoly)) return p;
  }
  return null;
}
function onPointerDown(e) {
  e.preventDefault(); pointerDown = true;
  pointerPos = getPointerPos(e);
  const found = findPieceAt(pointerPos.x, pointerPos.y);
  if (found) {
    dragPiece = found;
    dragOffset = { x: found.x - pointerPos.x, y: found.y - pointerPos.y };
    const idx = pieces.indexOf(found);
    pieces.splice(idx, 1); pieces.push(found);
  }
}
function onPointerMove(e) {
  e.preventDefault();
  if (!pointerDown) return;
  pointerPos = getPointerPos(e);
  if (dragPiece) {
    dragPiece.x = pointerPos.x + dragOffset.x;
    dragPiece.y = pointerPos.y + dragOffset.y;
  }
}
function onPointerUp(e) {
  e.preventDefault(); pointerDown = false; dragPiece = null;
}
function bindInput() {
  canvas.addEventListener('mousedown', onPointerDown);
  canvas.addEventListener('mousemove', onPointerMove);
  canvas.addEventListener('mouseup', onPointerUp);
  canvas.addEventListener('touchstart', onPointerDown, { passive: false });
  canvas.addEventListener('touchmove', onPointerMove, { passive: false });
  canvas.addEventListener('touchend', onPointerUp, { passive: false });
}

function rotateDraggedPiece() {
  if (!dragPiece) return;
  let a = dragPiece.angle % (Math.PI * 2);
  if (a > Math.PI) a -= Math.PI * 2;
  if (a < -Math.PI) a += Math.PI * 2;
  dragPiece.angle = lerp(a, 0, DRAG_ROTATE_SPEED);
}

// ── Snap ────────────────────────────────────────
function checkSnap() {
  const now = performance.now();
  let n = 0;
  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i];
    if (p.placed) { n++; continue; }
    // Compute target dynamically from current ghost position
    const tgt = getTarget(p.normCX, p.normCY);
    const dx = Math.abs(p.x - tgt.x), dy = Math.abs(p.y - tgt.y);
    const da = Math.abs(p.angle % (Math.PI * 2));
    const ad = Math.min(da, Math.PI * 2 - da);
    if (dx < SNAP_DIST && dy < SNAP_DIST && ad < SNAP_ANGLE) {
      if (p.hoverStart === 0) p.hoverStart = now;
      const held = now - p.hoverStart;
      p.hoverProgress = clamp(held / SNAP_HOLD_TIME, 0, 1);
      if (held >= SNAP_HOLD_TIME) {
        p.placed = true; p.hoverProgress = 0; p.hoverStart = 0;
        p.x = tgt.x; p.y = tgt.y; p.angle = 0;
        p.snapGlow = 1.0; // start glow animation
        n++;
        playThud();
        spawnSnapParticles(tgt.x, tgt.y);
      }
    } else {
      p.hoverStart = 0; p.hoverProgress = 0;
    }
    const dist = Math.sqrt(dx * dx + dy * dy);
    p.glowAlpha = clamp(1 - dist / 150, 0, 0.6);
  }
  if (n !== placedCount) {
    placedCount = n;
    countEl.textContent = `${placedCount} / ${PIECE_COUNT}`;
  }
  if (placedCount === PIECE_COUNT && gameState === 'playing') winGame();
}

// ── Particles ───────────────────────────────────
function spawnSnapParticles(x, y) {
  for (let i = 0; i < 24; i++) {
    const a = Math.random() * Math.PI * 2, sp = rng(1.5, 5);
    particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 1, decay: rng(0.012, 0.03), r: rng(2, 6),
      color: `hsl(${rng(38, 52)},100%,${rng(50, 70)}%)`
    });
  }
}
function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.08;
    p.vx *= 0.98; p.life -= p.decay;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

// ── Timer ───────────────────────────────────────
function startTimer() {
  elapsed = 0; timerEl.textContent = '00:00';
  timerRef = setInterval(() => {
    elapsed++;
    timerEl.textContent =
      String(Math.floor(elapsed / 60)).padStart(2, '0') + ':' +
      String(elapsed % 60).padStart(2, '0');
  }, 1000);
}
function stopTimer() { clearInterval(timerRef) }

// ── Game Flow ───────────────────────────────────
function startGame() {
  gameState = 'playing';
  startScr.classList.add('hidden');
  winScr.classList.add('hidden');
  hud.classList.remove('hidden');
  resize(); initStars(); createPieces(); bindInput();
  startTimer(); requestAnimationFrame(gameLoop);
  // Warm up audio context on first user interaction
  if (!audioCtx) try { audioCtx = new (window.AudioContext || window.webkitAudioContext)() } catch (e) { }
}
function resetPieces() {
  if (gameState !== 'playing') return;
  pieces.forEach(p => {
    const bb = polyBounds(p.normPoly.map(v => [v[0] * imgW, v[1] * imgH]));
    p.placed = false; p.hoverStart = 0; p.hoverProgress = 0; p.snapGlow = 0;
    p.x = rng(canvas.width * 0.08 + bb.w / 2, canvas.width * 0.92 - bb.w / 2);
    p.y = rng(bb.h, ghostY - bb.h * 0.3);
    p.angle = rng(-0.6, 0.6);
  });
  placedCount = 0; countEl.textContent = `0 / ${PIECE_COUNT}`;
}
function winGame() {
  gameState = 'won'; stopTimer();
  for (let i = 0; i < 80; i++) {
    particles.push({
      x: canvas.width / 2 + rng(-imgW / 2, imgW / 2),
      y: ghostY + imgH / 2 + rng(-imgH / 2, imgH / 2),
      vx: rng(-6, 6), vy: rng(-8, 2), life: 1, decay: rng(.005, .02),
      r: rng(3, 8), color: `hsl(${rng(35, 55)},100%,${rng(50, 75)}%)`
    });
  }
  setTimeout(() => {
    winTime.textContent = `Completed in ${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
    winScr.classList.remove('hidden');
  }, 1800);
}

// ── Render ──────────────────────────────────────
function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, '#0a0a1a'); g.addColorStop(.5, '#0d0d22'); g.addColorStop(1, '#08081a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const t = Date.now() * .001;
  starField.forEach(s => {
    const a = s.a + Math.sin(t + s.flicker) * .15;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200,210,255,${clamp(a, 0, 1)})`; ctx.fill();
  });
}

function drawGhostOutline() {
  ctx.save(); ctx.globalAlpha = 0.12;
  ctx.drawImage(img, ghostX, ghostY, imgW, imgH); ctx.restore();
  ctx.save(); ctx.strokeStyle = 'rgba(255,215,0,0.25)'; ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(ghostX - 2, ghostY - 2, imgW + 4, imgH + 4);
  ctx.setLineDash([]); ctx.restore();
  ctx.save(); ctx.strokeStyle = 'rgba(255,215,0,0.10)'; ctx.lineWidth = 1;
  SHAPE_DEFS.forEach(poly => {
    ctx.beginPath();
    poly.forEach((p, i) => {
      const x = ghostX + p[0] * imgW, y = ghostY + p[1] * imgH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath(); ctx.stroke();
  });
  ctx.restore();
}

function makePolyPath(lp) {
  ctx.beginPath();
  lp.forEach((p, i) => { if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]) });
  ctx.closePath();
}

function drawPieces() {
  pieces.forEach(p => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);

    // Proximity glow
    if (p.glowAlpha > 0 && !p.placed) {
      ctx.shadowColor = 'rgba(255,215,0,0.8)';
      ctx.shadowBlur = 25 * p.glowAlpha;
    }
    // Shadow
    if (!p.placed) {
      ctx.save(); ctx.translate(4, 4);
      makePolyPath(p.localPoly);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
      ctx.restore();
    }
    // Texture
    ctx.save(); makePolyPath(p.localPoly); ctx.clip();
    ctx.drawImage(p.texture, p.texOffX, p.texOffY);
    ctx.restore();

    // Border
    makePolyPath(p.localPoly);
    ctx.strokeStyle = p.placed ? 'rgba(255,215,0,0.5)' : 'rgba(255,255,255,0.25)';
    ctx.lineWidth = p.placed ? 2 : 1;
    ctx.stroke();

    // ── Snap glow animation ──
    if (p.snapGlow > 0) {
      makePolyPath(p.localPoly);
      ctx.shadowColor = `rgba(255,215,0,${p.snapGlow})`;
      ctx.shadowBlur = 35 * p.snapGlow;
      ctx.strokeStyle = `rgba(255,215,0,${p.snapGlow * 0.9})`;
      ctx.lineWidth = 3 + p.snapGlow * 3;
      ctx.stroke();
      ctx.shadowBlur = 0;
      // Inner fill flash
      makePolyPath(p.localPoly);
      ctx.fillStyle = `rgba(255,215,0,${p.snapGlow * 0.15})`;
      ctx.fill();
    }

    // Progress indicator
    if (p.hoverProgress > 0 && !p.placed) {
      makePolyPath(p.localPoly);
      ctx.strokeStyle = `rgba(255,215,0,${.3 + p.hoverProgress * .7})`;
      ctx.lineWidth = 2 + p.hoverProgress * 2;
      ctx.shadowColor = 'rgba(255,215,0,0.9)';
      ctx.shadowBlur = 10 + p.hoverProgress * 20;
      ctx.stroke(); ctx.shadowBlur = 0;
      const r = 18;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill();
      const sa = -Math.PI / 2, ea = sa + Math.PI * 2 * p.hoverProgress;
      ctx.beginPath(); ctx.arc(0, 0, r, sa, ea);
      ctx.lineTo(0, 0); ctx.closePath();
      ctx.fillStyle = `rgba(255,215,0,${.6 + p.hoverProgress * .4})`; ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px Inter,sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`${Math.round(p.hoverProgress * 100)}%`, 0, 1);
    }
    ctx.restore();
  });
}

function drawParticles() {
  particles.forEach(p => {
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
    ctx.fillStyle = p.color; ctx.globalAlpha = p.life;
    ctx.fill(); ctx.globalAlpha = 1;
  });
}

function drawShelf() {
  const sy = ghostY + imgH + 2, sw = imgW + 20, sx = ghostX + imgW / 2 - sw / 2;
  const g = ctx.createLinearGradient(sx, sy - 4, sx, sy + 6);
  g.addColorStop(0, 'rgba(100,180,255,0.3)'); g.addColorStop(1, 'rgba(100,180,255,0)');
  ctx.fillStyle = g; ctx.fillRect(sx, sy - 3, sw, 10);
  ctx.fillStyle = 'rgba(100,180,255,0.5)'; ctx.fillRect(sx, sy - 1, sw, 3);
}

function gameLoop() {
  if (gameState === 'start') return;
  drawBackground(); drawGhostOutline(); drawShelf();
  drawPieces(); drawParticles(); updateParticles();
  rotateDraggedPiece(); checkSnap();
  // Decay snap glow
  for (let i = 0; i < pieces.length; i++) {
    if (pieces[i].snapGlow > 0) pieces[i].snapGlow = Math.max(0, pieces[i].snapGlow - 0.018);
  }
  requestAnimationFrame(gameLoop);
}
