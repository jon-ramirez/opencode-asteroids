'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

const BOOST_DURATION = 5;   // segundos de boost que otorga cada pickup
const BOOST_FACTOR   = 2;   // multiplicador de empuje durante el boost

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

const ENEMY_SPEED  = SPEEDS[1] * 2;   // nave enemiga: el doble de rápida que un asteroide pequeño
const ENEMY_POINTS = POINTS[1] * 3;   // nave enemiga: el triple de puntos que un asteroide pequeño
const ENEMY_TTL    = 5;               // segundos que dura en pantalla

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Skins de la nave ──────────────────────────────────────────────────────────
// Cada skin define su silueta (pts: polígono cerrado con la nariz hacia +x),
// detalles abiertos (lines), color del casco y distancia de la nariz (nose),
// de donde salen las balas. El radio de colisión (12) es común a todas.
const SKINS = [
  {
    name:  'CLÁSICA',
    desc:  'La silueta de toda la vida.',
    color: '#fff',
    nose:  20,
    pts: [[20, 0], [-12, -9], [-7, 0], [-12, 9]],
  },
  {
    name:  'CAZA',
    desc:  'Alas en flecha para un caza puro.',
    color: '#00c8ff',
    nose:  22,
    pts: [
      [ 22,   0], [  6,  -3], [ -2, -13], [ -8, -13],
      [ -4,  -3], [-10,  -3], [-13,   0], [-10,   3],
      [ -4,   3], [ -8,  13], [ -2,  13], [  6,   3],
    ],
    lines: [[[9, 0], [6, -3], [2, -3], [4, 0], [2, 3], [6, 3], [9, 0]]],   // cabina
  },
  {
    name:  'DARDO',
    desc:  'Fina y veloz, hecha para esquivar.',
    color: '#ff4d4d',
    nose:  26,
    pts: [[26, 0], [-9, -5], [-16, -6], [-6, 0], [-16, 6], [-9, 5]],
  },
  {
    name:  'EXPLORADOR',
    desc:  'Casco amplio con cúpula panorámica.',
    color: '#4dff88',
    nose:  16,
    pts: [[16, 0], [9, -9], [-8, -11], [-15, -5], [-15, 5], [-8, 11], [9, 9]],
    lines: [[[3, -7], [1, -12], [-3, -12], [-5, -7]]],   // cúpula
  },
];

let skinIndex = 0;

function loadSkin() {
  try {
    const v = parseInt(localStorage.getItem('asteroids-skin'), 10);
    if (Number.isInteger(v)) skinIndex = Math.min(Math.max(v, 0), SKINS.length - 1);
  } catch { /* localStorage puede no estar disponible */ }
}

function saveSkin() {
  try { localStorage.setItem('asteroids-skin', String(skinIndex)); } catch {}
}

// Traza la silueta de una skin en el contexto actual; quien llama posiciona y hace stroke()
function traceSkin(skin, scale = 1) {
  ctx.beginPath();
  ctx.moveTo(skin.pts[0][0] * scale, skin.pts[0][1] * scale);
  for (let i = 1; i < skin.pts.length; i++)
    ctx.lineTo(skin.pts[i][0] * scale, skin.pts[i][1] * scale);
  ctx.closePath();
  for (const line of skin.lines || []) {
    ctx.moveTo(line[0][0] * scale, line[0][1] * scale);
    for (let i = 1; i < line.length; i++)
      ctx.lineTo(line[i][0] * scale, line[i][1] * scale);
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.dead          = false;
    this.boost         = 0;   // segundos de boost restantes
    this.boostMax      = 0;   // total acumulado (referencia de la barra del HUD)
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.boost > 0) {
      this.boost -= dt;
      if (this.boost <= 0) { this.boost = 0; this.boostMax = 0; }
    }

    const ROT   = 3.5;   // rad/s
    const THRUST = 260 * (this.boost > 0 ? BOOST_FACTOR : 1);  // px/s²
    const DRAG   = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);

    // Estela durante el boost
    if (this.boost > 0) {
      particles.push(new TrailParticle(this));
      if (Math.random() < 0.5) particles.push(new TrailParticle(this));
    }
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = SKINS[skinIndex].nose;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    const skin = SKINS[skinIndex];

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = skin.color;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Silueta de la skin activa
    traceSkin(skin);
    ctx.stroke();

    // Llama del propulsor (cian y más larga con boost)
    if (this.thrusting && Math.random() > 0.35) {
      const boost = this.boost > 0;
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, boost ? 22 : 14), 0);
      ctx.lineTo(-8,  4);
      ctx.strokeStyle = boost ? 'rgba(0, 200, 255, 0.9)' : 'rgba(255, 130, 0, 0.85)';
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y, opts = {}) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = opts.speed ?? rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = opts.life  ?? rand(0.4, 1.1);
    this.rgb  = opts.rgb   ?? '255,255,255';
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(${this.rgb},${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Power-up de velocidad ─────────────────────────────────────────────────────
class PowerUp {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 10;
    this.dead   = false;

    const angle = rand(0, Math.PI * 2);
    const speed = rand(25, 55);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rot      = rand(0, Math.PI * 2);
    this.rotSpeed = rand(-1.5, 1.5);
    this.ttl = 10;   // desaparece a los 10 s
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Parpadeo cuando queda poco tiempo de vida
    if (this.ttl < 3 && Math.floor(this.ttl * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Doble chevron «»
    ctx.beginPath();
    ctx.moveTo(-10, -7);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-10, 7);
    ctx.moveTo(1, -7);
    ctx.lineTo(8, 0);
    ctx.lineTo(1, 7);
    ctx.stroke();
    ctx.restore();
  }
}

// ── Nave enemiga ──────────────────────────────────────────────────────────────
class EnemyShip {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 14;
    this.dead   = false;
    this.ttl    = ENEMY_TTL;
    this.angle     = rand(0, Math.PI * 2);
    this.turnTimer = rand(0.3, 0.7);   // zigzag: nueva dirección al agotarse
  }

  update(dt) {
    this.turnTimer -= dt;
    if (this.turnTimer <= 0) {
      this.angle     = rand(0, Math.PI * 2);
      this.turnTimer = rand(0.3, 0.7);
    }
    this.x = wrap(this.x + Math.cos(this.angle) * ENEMY_SPEED * dt, W);
    this.y = wrap(this.y + Math.sin(this.angle) * ENEMY_SPEED * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;   // se desvanece sin explotar
  }

  draw() {
    // Parpadeo cuando está a punto de desaparecer
    if (this.ttl < 1 && Math.floor(this.ttl * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Platillo clásico: casco achatado con cúpula
    ctx.beginPath();
    ctx.moveTo(-16,  0);
    ctx.lineTo( -8, -6);
    ctx.lineTo(  8, -6);
    ctx.lineTo( 16,  0);
    ctx.lineTo(  8,  6);
    ctx.lineTo( -8,  6);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-4, -6);
    ctx.lineTo(-3, -11);
    ctx.lineTo( 3, -11);
    ctx.lineTo( 4, -6);
    ctx.stroke();
    ctx.restore();
  }
}

// ── Estela del boost ──────────────────────────────────────────────────────────
class TrailParticle {
  constructor(ship) {
    const TAIL = 14;
    this.x = ship.x - Math.cos(ship.angle) * TAIL;
    this.y = ship.y - Math.sin(ship.angle) * TAIL;
    this.vx = -ship.vx * 0.15 + rand(-12, 12);
    this.vy = -ship.vy * 0.15 + rand(-12, 12);
    this.life = rand(0.2, 0.45);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(0,200,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.04, this.y - this.vy * 0.04);
    ctx.stroke();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerups, enemies;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;
let enemyTimer;   // cuenta atrás para la próxima nave enemiga

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function spawnEnemy() {
  const SAFE_DIST = 150;
  let x, y;
  do {
    x = rand(0, W);
    y = rand(0, H);
  } while (Math.hypot(x - ship.x, y - ship.y) < SAFE_DIST);
  enemies.push(new EnemyShip(x, y));
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerups  = [];
  enemies   = [];
  enemyTimer = rand(8, 15);
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  spawnAsteroids(4);
}

// Menú de selección de nave: el campo recién inicializado sirve de fondo animado
function enterSelect() {
  initGame();
  state = 'select';
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

// Explosión vistosa de la nave enemiga: mezcla de colores y más partículas
function bigExplosion(x, y) {
  const COLORS = ['255,255,255', '0,200,255', '255,130,0'];
  for (let i = 0; i < 36; i++) {
    particles.push(new Particle(x, y, {
      speed: rand(50, 260),
      life:  rand(0.5, 1.4),
      rgb:   COLORS[i % COLORS.length],
    }));
  }
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  ship.boost    = 0;   // el boost se pierde al morir
  ship.boostMax = 0;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  // Menú de selección de nave
  if (state === 'select') {
    if (pressed('ArrowLeft'))  { skinIndex = wrap(skinIndex - 1, SKINS.length); saveSkin(); }
    if (pressed('ArrowRight')) { skinIndex = wrap(skinIndex + 1, SKINS.length); saveSkin(); }
    if (pressed('Space') || pressed('Enter')) { state = 'playing'; return; }

    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    return;
  }

  if (state === 'gameover') {
    if (pressed('Space')) enterSelect();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    enemies.forEach(e => e.update(dt));
    enemies = enemies.filter(e => !e.dead);
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  // Aparición periódica de la nave enemiga
  enemyTimer -= dt;
  if (enemyTimer <= 0) {
    spawnEnemy();
    enemyTimer = rand(8, 15);
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  powerups.forEach(pu => pu.update(dt));
  enemies.forEach(e => e.update(dt));
  particles.forEach(p => p.update(dt));

  bullets    = bullets.filter(b => !b.dead);
  particles  = particles.filter(p => !p.dead);
  powerups   = powerups.filter(pu => !pu.dead);
  enemies    = enemies.filter(e => !e.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += POINTS[a.size];
        explode(a.x, a.y, a.size * 5);
        if (Math.random() < 0.15) powerups.push(new PowerUp(a.x, a.y));
        newAsteroids.push(...a.split());
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Bala vs nave enemiga
  for (const b of bullets) {
    for (const e of enemies) {
      if (!e.dead && !b.dead && dist(b, e) < e.radius) {
        b.dead = true;
        e.dead = true;
        score += ENEMY_POINTS;
        bigExplosion(e.x, e.y);
      }
    }
  }
  bullets = bullets.filter(b => !b.dead);
  enemies = enemies.filter(e => !e.dead);

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        killShip();
        break;
      }
    }
  }

  // Nave vs nave enemiga
  if (!ship.dead && ship.invincible <= 0) {
    for (const e of enemies) {
      if (dist(ship, e) < ship.radius + e.radius * 0.82) {
        e.dead = true;
        bigExplosion(e.x, e.y);
        killShip();
        break;
      }
    }
    enemies = enemies.filter(e => !e.dead);
  }

  // Nave vs power-up (el tiempo se acumula)
  if (!ship.dead) {
    for (const pu of powerups) {
      if (dist(ship, pu) < ship.radius + pu.radius) {
        pu.dead = true;
        ship.boost += BOOST_DURATION;
        ship.boostMax = ship.boost;   // la barra nace llena
        explode(pu.x, pu.y, 6);
      }
    }
    powerups = powerups.filter(pu => !pu.dead);
  }

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  const skin = SKINS[skinIndex];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = skin.color;
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  traceSkin(skin, 0.45);
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  // Indicador de boost activo: texto + barra de tiempo restante
  if (ship.boost > 0) {
    ctx.fillStyle = 'rgb(0, 200, 255)';
    ctx.font = '15px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`VELOCIDAD ${ship.boost.toFixed(1)}s`, 14, 48);

    const BW = 120, BH = 6;
    const frac = ship.boost / ship.boostMax;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(14, 54, BW, BH);
    ctx.fillRect(15, 55, (BW - 2) * frac, BH - 2);
  }
}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function drawSelect() {
  const GAP = W / (SKINS.length + 1);   // espaciado uniforme entre vistas
  const CY  = H / 2 - 20;

  ctx.textAlign = 'center';

  ctx.fillStyle = '#fff';
  ctx.font      = 'bold 32px monospace';
  ctx.fillText('SELECCIÓN DE NAVE', W / 2, 110);

  SKINS.forEach((skin, i) => {
    const x   = GAP * (i + 1);
    const sel = i === skinIndex;

    // Marco alrededor de la selección
    if (sel) {
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth   = 1.5;
      ctx.strokeRect(x - 48, CY - 52, 96, 104);
    }

    ctx.save();
    ctx.translate(x, CY);
    ctx.rotate(-Math.PI / 2);
    ctx.globalAlpha = sel ? 1 : 0.35;
    ctx.strokeStyle = skin.color;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    traceSkin(skin, sel ? 1.6 : 1.2);
    ctx.stroke();

    // Llama animada en la nave seleccionada
    if (sel && Math.random() > 0.3) {
      ctx.beginPath();
      ctx.moveTo(-12, -5);
      ctx.lineTo(-12 - rand(8, 22), 0);
      ctx.lineTo(-12, 5);
      ctx.strokeStyle = 'rgba(255, 130, 0, 0.85)';
      ctx.stroke();
    }
    ctx.restore();

    ctx.fillStyle = skin.color;
    ctx.font      = 'bold 15px monospace';
    ctx.fillText(skin.name, x, CY + 78);
  });

  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font      = '15px monospace';
  ctx.fillText(SKINS[skinIndex].desc, W / 2, CY + 118);

  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font      = '15px monospace';
  ctx.fillText('← →  CAMBIAR NAVE        ESPACIO / ENTER  JUGAR', W / 2, H - 44);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());

  if (state === 'select') {
    drawSelect();
    return;
  }

  powerups.forEach(pu => pu.draw());
  enemies.forEach(e => e.draw());
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO: CAMBIAR DE NAVE`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

loadSkin();
enterSelect();
requestAnimationFrame(loop);
