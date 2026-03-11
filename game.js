'use strict';
// ══════════════════════════════════════════════════════════════
//  BEACH BUGGY BLITZ — game.js
//  Full canvas racing game with AI opponents, physics, drifting
// ══════════════════════════════════════════════════════════════

const $ = id => document.getElementById(id);
const TAU = Math.PI * 2;
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const lerp = (a,b,t) => a + (b-a)*t;
const rand = (a,b) => Math.random()*(b-a)+a;
const dist = (ax,ay,bx,by) => Math.hypot(ax-bx, ay-by);

// ══════════════════════════════════════════════════════════════
//  SAVE / SETTINGS
// ══════════════════════════════════════════════════════════════
let records = {};
let selectedCarIdx = 0;

function loadData() {
  try {
    const r = localStorage.getItem('bbblitz_records');
    if (r) records = JSON.parse(r);
    const c = localStorage.getItem('bbblitz_car');
    if (c) selectedCarIdx = parseInt(c);
  } catch(e) {}
}
function saveData() {
  try {
    localStorage.setItem('bbblitz_records', JSON.stringify(records));
    localStorage.setItem('bbblitz_car', selectedCarIdx.toString());
  } catch(e) {}
}
loadData();

// ══════════════════════════════════════════════════════════════
//  CAR DEFINITIONS
// ══════════════════════════════════════════════════════════════
const CARS = [
  {
    name: 'Sandy Drifter',
    emoji: '🟠',
    body: '#ff8c42',
    roof: '#cc5500',
    wheel: '#333',
    speed: 7, handling: 8, nitro: 6, weight: 5,
    maxSpeed: 220,
    accel: 320,
    drag: 0.975,
    turnSpeed: 3.2,
    driftFactor: 0.85,
    nitroMax: 100,
    nitroRefill: 8,
  },
  {
    name: 'Wave Crusher',
    emoji: '🔵',
    body: '#1a9ed4',
    roof: '#0a5a8a',
    wheel: '#222',
    speed: 9, handling: 6, nitro: 7, weight: 6,
    maxSpeed: 260,
    accel: 380,
    drag: 0.972,
    turnSpeed: 2.8,
    driftFactor: 0.78,
    nitroMax: 120,
    nitroRefill: 10,
  },
  {
    name: 'Palm Rocket',
    emoji: '🟢',
    body: '#2d8a2d',
    roof: '#1a5a1a',
    wheel: '#111',
    speed: 8, handling: 9, nitro: 5, weight: 4,
    maxSpeed: 240,
    accel: 350,
    drag: 0.978,
    turnSpeed: 3.5,
    driftFactor: 0.9,
    nitroMax: 90,
    nitroRefill: 7,
  },
  {
    name: 'Sun Blaster',
    emoji: '🟡',
    body: '#f5c842',
    roof: '#c09010',
    wheel: '#444',
    speed: 10, handling: 5, nitro: 9, weight: 7,
    maxSpeed: 290,
    accel: 420,
    drag: 0.968,
    turnSpeed: 2.5,
    driftFactor: 0.72,
    nitroMax: 150,
    nitroRefill: 12,
  },
];

// ══════════════════════════════════════════════════════════════
//  TRACK DEFINITIONS
// ══════════════════════════════════════════════════════════════
// Each track is defined by a series of waypoints (relative to 1000x750 grid)
// and visual theme

const TRACKS = [
  {
    id: 'coconut_cove',
    name: 'Coconut Cove',
    difficulty: 1,
    theme: 'beach',
    laps: 3,
    aiSpeed: 0.82,
    // Waypoints [x, y] normalized 0-1 of world
    waypoints: [
      [0.5, 0.15], [0.78, 0.18], [0.88, 0.32], [0.85, 0.52],
      [0.72, 0.68], [0.55, 0.75], [0.38, 0.72], [0.22, 0.62],
      [0.15, 0.45], [0.18, 0.28], [0.32, 0.15]
    ],
    trackWidth: 80,
    colors: {
      sky: ['#87ceeb','#c8eeff'],
      ground: '#d4b483',
      track: '#c8a060',
      sand: '#e8c878',
      water: '#1a9ed4',
      grass: '#5aab5a',
    }
  },
  {
    id: 'sunset_strip',
    name: 'Sunset Strip',
    difficulty: 2,
    theme: 'sunset',
    laps: 3,
    aiSpeed: 0.88,
    waypoints: [
      [0.5, 0.12], [0.72, 0.1], [0.88, 0.22], [0.92, 0.42],
      [0.82, 0.62], [0.68, 0.78], [0.5, 0.82], [0.32, 0.78],
      [0.18, 0.62], [0.1, 0.42], [0.18, 0.22], [0.32, 0.1]
    ],
    trackWidth: 72,
    colors: {
      sky: ['#ff8c42','#ff4400'],
      ground: '#c09060',
      track: '#b08050',
      sand: '#e8a060',
      water: '#ff6644',
      grass: '#4a8a4a',
    }
  },
  {
    id: 'coral_chaos',
    name: 'Coral Chaos',
    difficulty: 3,
    theme: 'coral',
    laps: 3,
    aiSpeed: 0.94,
    waypoints: [
      [0.5, 0.1], [0.65, 0.08], [0.82, 0.15], [0.92, 0.3],
      [0.9, 0.48], [0.78, 0.65], [0.62, 0.75], [0.48, 0.8],
      [0.32, 0.75], [0.18, 0.62], [0.12, 0.45], [0.15, 0.28],
      [0.28, 0.15], [0.4, 0.08]
    ],
    trackWidth: 65,
    colors: {
      sky: ['#4fc3f7','#0288d1'],
      ground: '#b8ded8',
      track: '#a0c8c0',
      sand: '#d8eee8',
      water: '#26c6da',
      grass: '#4caf8a',
    }
  },
  {
    id: 'tropical_turbo',
    name: 'Tropical Turbo',
    difficulty: 4,
    theme: 'jungle',
    laps: 3,
    aiSpeed: 1.0,
    waypoints: [
      [0.5, 0.08], [0.62, 0.06], [0.78, 0.1], [0.9, 0.2],
      [0.95, 0.38], [0.9, 0.56], [0.8, 0.7], [0.65, 0.8],
      [0.5, 0.84], [0.35, 0.8], [0.22, 0.7], [0.12, 0.56],
      [0.08, 0.38], [0.12, 0.2], [0.25, 0.1], [0.38, 0.06]
    ],
    trackWidth: 58,
    colors: {
      sky: ['#2d8a2d','#1a5a1a'],
      ground: '#4a6e3a',
      track: '#5a5a30',
      sand: '#8a8a50',
      water: '#2a9e5a',
      grass: '#3a7a3a',
    }
  }
];

// ══════════════════════════════════════════════════════════════
//  WORLD & PHYSICS CONSTANTS
// ══════════════════════════════════════════════════════════════
const WORLD_W = 1400;
const WORLD_H = 1050;

// ══════════════════════════════════════════════════════════════
//  GAME STATE
// ══════════════════════════════════════════════════════════════
let canvas, ctx, minimapCanvas, minimapCtx;
let W, H;
let gameRunning = false, gamePaused = false;
let currentTrack = null;
let gs = {}; // game state
let animFrame = null, lastTime = 0;
const keys = {};
const touch = { left:false, right:false, gas:false, brake:false, nitro:false };

// ══════════════════════════════════════════════════════════════
//  TRACK PATH GENERATION
// ══════════════════════════════════════════════════════════════
function buildTrackPath(track) {
  // Convert normalized waypoints to world coords
  const pts = track.waypoints.map(([x,y]) => ({
    x: x * WORLD_W,
    y: y * WORLD_H
  }));

  // Generate smooth Catmull-Rom spline
  const spline = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    for (let t = 0; t < 1; t += 0.04) {
      const t2 = t * t, t3 = t2 * t;
      const x = 0.5 * ((2*p1.x) + (-p0.x+p2.x)*t + (2*p0.x-5*p1.x+4*p2.x-p3.x)*t2 + (-p0.x+3*p1.x-3*p2.x+p3.x)*t3);
      const y = 0.5 * ((2*p1.y) + (-p0.y+p2.y)*t + (2*p0.y-5*p1.y+4*p2.y-p3.y)*t2 + (-p0.y+3*p1.y-3*p2.y+p3.y)*t3);
      spline.push({x, y});
    }
  }
  return spline;
}

function buildTrackEdges(spline, width) {
  const left = [], right = [];
  const n = spline.length;
  for (let i = 0; i < n; i++) {
    const next = spline[(i+1) % n];
    const prev = spline[(i-1+n) % n];
    const dx = next.x - prev.x, dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    left.push({ x: spline[i].x + nx * width/2, y: spline[i].y + ny * width/2 });
    right.push({ x: spline[i].x - nx * width/2, y: spline[i].y - ny * width/2 });
  }
  return { left, right };
}

function getTrackAngle(spline, idx) {
  const n = spline.length;
  const next = spline[(idx+1)%n];
  const prev = spline[(idx-1+n)%n];
  return Math.atan2(next.y - prev.y, next.x - prev.x);
}

function closestSplinePoint(spline, x, y) {
  let minD = Infinity, minI = 0;
  for (let i = 0; i < spline.length; i++) {
    const d = dist(x, y, spline[i].x, spline[i].y);
    if (d < minD) { minD = d; minI = i; }
  }
  return { idx: minI, dist: minD };
}

// ══════════════════════════════════════════════════════════════
//  CAR CLASS
// ══════════════════════════════════════════════════════════════
class Car {
  constructor(def, spline, startOffset, isPlayer, name, color) {
    this.def = def;
    this.name = name || def.name;
    this.color = color || def.body;
    this.roofColor = def.roof;
    this.wheelColor = def.wheel;
    this.isPlayer = isPlayer;

    // Start position on spline
    const si = Math.floor(startOffset * spline.length) % spline.length;
    this.x = spline[si].x;
    this.y = spline[si].y;
    this.angle = getTrackAngle(spline, si);
    this.vx = 0; this.vy = 0;
    this.speed = 0;
    this.steerAngle = 0;

    // Race state
    this.lap = 1;
    this.splineIdx = si;
    this.nextWPIdx = 0;
    this.lapStartTime = 0;
    this.bestLap = Infinity;
    this.lapTimes = [];
    this.totalDist = 0;
    this.finished = false;
    this.position = 1;

    // Nitro
    this.nitro = def.nitroMax;
    this.nitroActive = false;
    this.topSpeed = 0;

    // AI state
    this.aiLookAhead = 60 + Math.random() * 30;
    this.aiAggression = 0.7 + Math.random() * 0.3;
    this.aiSteerError = (Math.random() - 0.5) * 0.3;

    // Visual
    this.driftSmoke = [];
    this.isDrifting = false;
    this.driftTimer = 0;
    this.wheelRot = 0;
    this.bodyRoll = 0;
    this.shadowAlpha = 0.4;
  }

  update(dt, spline, trackEdges, trackWidth, inputOverride) {
    const def = this.def;

    // Input
    let steer = 0, gas = 0, brake = false, nitroUse = false;
    if (this.isPlayer) {
      const L = keys['a'] || keys['ArrowLeft']  || touch.left;
      const R = keys['d'] || keys['ArrowRight'] || touch.right;
      const G = keys['w'] || keys['ArrowUp']    || touch.gas;
      const B = keys['s'] || keys['ArrowDown']  || touch.brake;
      const N = keys[' ']                       || touch.nitro;
      if (L) steer = -1;
      if (R) steer = 1;
      gas = G ? 1 : 0;
      brake = B;
      nitroUse = N;
    } else {
      // AI driving
      const ai = this.aiDrive(spline, trackWidth);
      steer = ai.steer; gas = ai.gas; brake = ai.brake;
    }

    // Nitro
    this.nitroActive = nitroUse && this.nitro > 0;
    if (this.nitroActive) {
      this.nitro = Math.max(0, this.nitro - 35 * dt);
    } else {
      this.nitro = Math.min(def.nitroMax, this.nitro + def.nitroRefill * dt);
    }

    // Speed boost
    const nitroBoost = this.nitroActive ? 1.6 : 1.0;
    const targetSpeed = gas * def.maxSpeed * nitroBoost;

    // Acceleration / deceleration
    if (brake) {
      this.speed = lerp(this.speed, -def.maxSpeed * 0.3, 6 * dt);
    } else {
      this.speed = lerp(this.speed, targetSpeed, def.accel / def.maxSpeed * dt);
    }

    this.speed *= def.drag;

    // Steering
    if (Math.abs(this.speed) > 10) {
      const turnRate = def.turnSpeed * steer * (Math.abs(this.speed) / def.maxSpeed);
      this.angle += turnRate * dt * 60;
    }

    // Body roll
    this.bodyRoll = lerp(this.bodyRoll, steer * 0.25, 8 * dt);

    // Drift detection
    const prevVAngle = Math.atan2(this.vy, this.vx);
    const angleDiff = Math.abs(this.angle - prevVAngle);
    this.isDrifting = Math.abs(this.speed) > 80 && (Math.abs(steer) > 0.5 || angleDiff > 0.3);

    // Apply velocity
    const spd = this.speed;
    this.vx = lerp(this.vx, Math.cos(this.angle) * spd, this.isDrifting ? 0.08 : 0.25);
    this.vy = lerp(this.vy, Math.sin(this.angle) * spd, this.isDrifting ? 0.08 : 0.25);

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Wheel rotation
    this.wheelRot += this.speed * dt * 0.05;

    // Track bounds check
    this.checkTrackBounds(spline, trackEdges, trackWidth);

    // Drift smoke
    if (this.isDrifting && Math.abs(this.speed) > 60) {
      if (Math.random() < 0.6) {
        this.driftSmoke.push({
          x: this.x - Math.cos(this.angle) * 18,
          y: this.y - Math.sin(this.angle) * 18,
          vx: (Math.random()-0.5)*30, vy: (Math.random()-0.5)*30,
          life: 1.2, maxLife: 1.2, size: rand(8, 18),
          alpha: 0.5
        });
      }
    }
    this.driftSmoke = this.driftSmoke.filter(s => {
      s.life -= dt; s.x += s.vx*dt; s.y += s.vy*dt;
      s.vx *= 0.95; s.vy *= 0.95;
      return s.life > 0;
    });

    // Update spline tracking for lap counting
    this.updateSplineProgress(spline);
    this.topSpeed = Math.max(this.topSpeed, Math.abs(this.speed));
  }

  checkTrackBounds(spline, trackEdges, trackWidth) {
    const cp = closestSplinePoint(spline, this.x, this.y);
    if (cp.dist > trackWidth * 0.6) {
      // Push back onto track
      const sp = spline[cp.idx];
      const pushX = sp.x - this.x, pushY = sp.y - this.y;
      const pushLen = Math.hypot(pushX, pushY) || 1;
      const overrun = cp.dist - trackWidth * 0.55;
      this.x += (pushX/pushLen) * overrun * 0.5;
      this.y += (pushY/pushLen) * overrun * 0.5;
      this.speed *= 0.7;
      this.vx *= 0.7; this.vy *= 0.7;
    }
  }

  updateSplineProgress(spline) {
    const cp = closestSplinePoint(spline, this.x, this.y);
    const oldIdx = this.splineIdx;
    this.splineIdx = cp.idx;

    // Detect lap completion (crossing start/finish around idx 0)
    const n = spline.length;
    const crossedFinish = (oldIdx > n * 0.9 && this.splineIdx < n * 0.1) ||
                          (oldIdx < n * 0.1 && this.splineIdx > n * 0.9 && this.speed < 0);
    if (crossedFinish && this.speed > 20) {
      const lapTime = (performance.now() - this.lapStartTime) / 1000;
      if (this.lap > 1 && lapTime > 2) {
        this.lapTimes.push(lapTime);
        if (lapTime < this.bestLap) this.bestLap = lapTime;
      }
      this.lap++;
      this.lapStartTime = performance.now();
    }
    this.totalDist = this.lap * n + this.splineIdx;
  }

  aiDrive(spline, trackWidth) {
    const n = spline.length;
    const lookAhead = Math.floor(this.aiLookAhead + Math.abs(this.speed) * 0.1);
    const targetIdx = (this.splineIdx + lookAhead) % n;
    const target = spline[targetIdx];

    // Angle to target
    const desiredAngle = Math.atan2(target.y - this.y, target.x - this.x);
    let angleDiff = desiredAngle - this.angle;
    while (angleDiff > Math.PI) angleDiff -= TAU;
    while (angleDiff < -Math.PI) angleDiff += TAU;

    const steer = clamp(angleDiff * 2.5 + this.aiSteerError, -1, 1);
    const cpDist = dist(this.x, this.y, target.x, target.y);
    const gas = 0.7 + this.aiAggression * 0.3;
    const brake = Math.abs(angleDiff) > 0.8 && Math.abs(this.speed) > 100;

    return { steer, gas, brake };
  }

  draw(ctx, camX, camY) {
    const sx = this.x - camX, sy = this.y - camY;

    // Draw smoke
    this.driftSmoke.forEach(s => {
      const a = (s.life / s.maxLife) * s.alpha;
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(s.x - camX, s.y - camY, s.size * (1 - s.life/s.maxLife + 0.3), 0, TAU);
      ctx.fillStyle = '#cccccc';
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(this.angle + Math.PI/2);

    // Shadow
    ctx.save();
    ctx.translate(3, 4);
    ctx.globalAlpha = this.shadowAlpha;
    this.drawBody(ctx, '#000000', '#000000');
    ctx.globalAlpha = 1;
    ctx.restore();

    // Body with roll
    ctx.rotate(this.bodyRoll);
    this.drawBody(ctx, this.color, this.roofColor);

    ctx.restore();
  }

  drawBody(ctx, bodyColor, roofColor) {
    const W2 = 14, H2 = 22;
    // Main body
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.roundRect(-W2, -H2, W2*2, H2*2, 5);
    ctx.fill();
    // Roof
    ctx.fillStyle = roofColor;
    ctx.beginPath();
    ctx.roundRect(-W2+3, -H2+6, (W2-3)*2, H2*2-12, 4);
    ctx.fill();
    // Windshield
    ctx.fillStyle = 'rgba(150,220,255,0.65)';
    ctx.beginPath();
    ctx.roundRect(-W2+4, -H2+7, (W2-4)*2, 8, 2);
    ctx.fill();
    // Wheels
    this.drawWheels(ctx, W2, H2);
  }

  drawWheels(ctx, W2, H2) {
    const wheelPositions = [
      [-W2-3, -H2+5],
      [W2+3, -H2+5],
      [-W2-3, H2-7],
      [W2+3, H2-7],
    ];
    ctx.fillStyle = this.wheelColor;
    wheelPositions.forEach(([wx,wy]) => {
      ctx.save();
      ctx.translate(wx, wy);
      ctx.rotate(this.wheelRot);
      ctx.beginPath();
      ctx.roundRect(-4, -6, 8, 12, 2);
      ctx.fill();
      ctx.fillStyle = '#888';
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, TAU);
      ctx.fill();
      ctx.restore();
    });
  }
}

// ══════════════════════════════════════════════════════════════
//  PICKUP ITEMS (Nitro cans on track)
// ══════════════════════════════════════════════════════════════
class Pickup {
  constructor(x, y, type) {
    this.x = x; this.y = y;
    this.type = type; // 'nitro' | 'speed'
    this.radius = 14;
    this.collected = false;
    this.respawnTimer = 0;
    this.bobPhase = Math.random() * TAU;
  }

  update(dt) {
    this.bobPhase += dt * 2.5;
    if (this.collected) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) this.collected = false;
    }
  }

  draw(ctx, camX, camY) {
    if (this.collected) return;
    const sx = this.x - camX;
    const sy = this.y - camY + Math.sin(this.bobPhase) * 3;

    // Glow
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 20);
    g.addColorStop(0, this.type === 'nitro' ? 'rgba(255,140,0,0.4)' : 'rgba(100,200,255,0.4)');
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(sx, sy, 20, 0, TAU); ctx.fill();

    // Icon
    ctx.font = '18px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.type === 'nitro' ? '⚡' : '💨', sx, sy);
  }
}

// ══════════════════════════════════════════════════════════════
//  SCENERY (palms, waves, rocks)
// ══════════════════════════════════════════════════════════════
function generateScenery(track, spline) {
  const items = [];
  // Place items away from track
  for (let i = 0; i < 40; i++) {
    let x, y, attempts = 0;
    do {
      x = rand(50, WORLD_W - 50);
      y = rand(50, WORLD_H - 50);
      attempts++;
    } while (closestSplinePoint(spline, x, y).dist < track.trackWidth * 1.5 && attempts < 20);

    if (attempts < 20) {
      const type = ['palm','palm','rock','crab','starfish'][Math.floor(Math.random()*5)];
      items.push({ x, y, type, scale: rand(0.8,1.3), rot: rand(0,TAU) });
    }
  }
  return items;
}

function drawSceneryItem(ctx, item, camX, camY) {
  const sx = item.x - camX, sy = item.y - camY;
  if (sx < -60 || sx > W+60 || sy < -60 || sy > H+60) return;

  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(item.scale, item.scale);
  ctx.rotate(item.rot);

  ctx.font = item.type === 'palm' ? '32px serif' : '22px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const icons = { palm:'🌴', rock:'🪨', crab:'🦀', starfish:'⭐' };
  ctx.fillText(icons[item.type] || '🌴', 0, 0);

  ctx.restore();
}

// ══════════════════════════════════════════════════════════════
//  TRACK RENDERER
// ══════════════════════════════════════════════════════════════
function drawTrack(ctx, track, spline, trackEdges, camX, camY) {
  const colors = track.colors;
  const n = spline.length;
  const tw = track.trackWidth;

  // Draw road surface
  ctx.beginPath();
  trackEdges.left.forEach((p, i) => {
    const sx = p.x - camX, sy = p.y - camY;
    i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
  });
  const rEdge = [...trackEdges.right].reverse();
  rEdge.forEach(p => ctx.lineTo(p.x - camX, p.y - camY));
  ctx.closePath();
  ctx.fillStyle = colors.track;
  ctx.fill();

  // Draw center line (dashed)
  ctx.beginPath();
  let dashOn = true, dashCount = 0;
  spline.forEach((p, i) => {
    const sx = p.x - camX, sy = p.y - camY;
    dashCount++;
    if (dashCount % 4 === 0) { dashOn = !dashOn; }
    if (dashOn) {
      if (dashCount === 1) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    } else {
      ctx.moveTo(sx, sy);
    }
  });
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 12]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Road edge lines
  [trackEdges.left, trackEdges.right].forEach(edge => {
    ctx.beginPath();
    edge.forEach((p, i) => {
      const sx = p.x - camX, sy = p.y - camY;
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    });
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 3;
    ctx.stroke();
  });

  // Start/finish line
  const startPt = spline[0];
  const angle = getTrackAngle(spline, 0);
  const sx = startPt.x - camX, sy = startPt.y - camY;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(angle);
  // Checkered pattern
  for (let i = -tw/2; i < tw/2; i += 8) {
    for (let j = -4; j < 4; j += 4) {
      ctx.fillStyle = ((Math.floor(i/8) + Math.floor(j/4)) % 2 === 0) ? '#fff' : '#000';
      ctx.fillRect(j, i, 4, 8);
    }
  }
  ctx.restore();
}

// ══════════════════════════════════════════════════════════════
//  BACKGROUND RENDERER
// ══════════════════════════════════════════════════════════════
function drawBackground(ctx, track, camX, camY) {
  const colors = track.colors;

  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0, colors.sky[0]);
  skyGrad.addColorStop(1, colors.sky[1]);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  // Ground (parallax at 30%)
  const gx = camX * 0.3, gy = camY * 0.3;
  ctx.fillStyle = colors.ground;
  ctx.fillRect(0, H * 0.45 - gy * 0.2, W, H);

  // Water patches
  for (let i = 0; i < 3; i++) {
    const wx = (i * 450 - camX * 0.15) % WORLD_W;
    const wy = (i * 300 - camY * 0.1) % WORLD_H;
    const waterGrad = ctx.createRadialGradient(wx % W, wy % H, 0, wx % W, wy % H, 120);
    waterGrad.addColorStop(0, colors.water + 'cc');
    waterGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = waterGrad;
    ctx.beginPath();
    ctx.ellipse(wx % W, wy % H, 120, 70, 0, 0, TAU);
    ctx.fill();
  }
}

// ══════════════════════════════════════════════════════════════
//  MINIMAP
// ══════════════════════════════════════════════════════════════
function drawMinimap(spline, cars, playerCar) {
  const mc = minimapCtx;
  const mw = minimapCanvas.width, mh = minimapCanvas.height;
  mc.clearRect(0, 0, mw, mh);

  // Background
  mc.fillStyle = 'rgba(0,0,0,0.5)';
  mc.fillRect(0, 0, mw, mh);

  // Scale
  const sx = mw / WORLD_W, sy = mh / WORLD_H;

  // Track path
  mc.beginPath();
  spline.forEach((p, i) => {
    const x = p.x * sx, y = p.y * sy;
    i === 0 ? mc.moveTo(x,y) : mc.lineTo(x,y);
  });
  mc.closePath();
  mc.strokeStyle = 'rgba(255,255,255,0.4)';
  mc.lineWidth = 3;
  mc.stroke();

  // Cars
  cars.forEach(car => {
    const cx = car.x * sx, cy = car.y * sy;
    mc.beginPath();
    mc.arc(cx, cy, car.isPlayer ? 4 : 3, 0, TAU);
    mc.fillStyle = car.isPlayer ? '#ffdd00' : '#ff6b6b';
    mc.fill();
  });
}

// ══════════════════════════════════════════════════════════════
//  PICKUP SPAWNING
// ══════════════════════════════════════════════════════════════
function spawnPickups(spline, count) {
  const pickups = [];
  const step = Math.floor(spline.length / count);
  for (let i = 0; i < count; i++) {
    const idx = (i * step + Math.floor(step/2)) % spline.length;
    const offset = (Math.random() - 0.5) * 35;
    const angle = getTrackAngle(spline, idx);
    pickups.push(new Pickup(
      spline[idx].x + Math.cos(angle + Math.PI/2) * offset,
      spline[idx].y + Math.sin(angle + Math.PI/2) * offset,
      Math.random() < 0.7 ? 'nitro' : 'speed'
    ));
  }
  return pickups;
}

// ══════════════════════════════════════════════════════════════
//  TIMER FORMATTING
// ══════════════════════════════════════════════════════════════
function fmtTime(seconds) {
  if (!isFinite(seconds) || seconds === Infinity) return '--:--.---';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${m}:${s.toString().padStart(2,'0')}.${ms.toString().padStart(3,'0')}`;
}

// ══════════════════════════════════════════════════════════════
//  RACE INIT
// ══════════════════════════════════════════════════════════════
function initRace(track) {
  currentTrack = track;
  canvas = $('game-canvas');
  ctx = canvas.getContext('2d');
  minimapCanvas = $('minimap-canvas');
  minimapCtx = minimapCanvas.getContext('2d');
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;

  const spline = buildTrackPath(track);
  const trackEdges = buildTrackEdges(spline, track.trackWidth);
  const scenery = generateScenery(track, spline);
  const pickups = spawnPickups(spline, 8);

  // Create player car
  const carDef = CARS[selectedCarIdx];
  const playerCar = new Car(carDef, spline, 0, true, 'YOU', carDef.body);
  playerCar.lapStartTime = performance.now() + 3000; // countdown

  // Create AI cars
  const aiColors = [CARS[1].body, CARS[2].body, CARS[3].body];
  const aiNames = ['TIKI', 'SURF', 'COCO'];
  const aiCars = [0.04, 0.08, 0.12].map((offset, i) => {
    const aiDef = { ...CARS[(i+1)%CARS.length], maxSpeed: CARS[(i+1)%CARS.length].maxSpeed * track.aiSpeed };
    const car = new Car(aiDef, spline, offset, false, aiNames[i], aiColors[i]);
    car.lapStartTime = performance.now() + 3000;
    car.aiSteerError = (Math.random()-0.5)*0.4;
    return car;
  });

  const allCars = [playerCar, ...aiCars];

  gs = {
    track, spline, trackEdges, scenery, pickups, allCars,
    playerCar, aiCars,
    startTime: performance.now() + 3000,
    raceTime: 0,
    bestLap: Infinity,
    totalTime: 0,
    finished: false,
    finishOrder: [],
    camera: { x: playerCar.x - W/2, y: playerCar.y - H/2 },
    countdownPhase: 3,
    countdownTimer: 1,
    raceStarted: false,
    msgTimer: 0,
    msgText: '',
    lapTimes: [],
  };

  gameRunning = true;
  gamePaused = false;
  lastTime = performance.now();
  if (animFrame) cancelAnimationFrame(animFrame);
  animFrame = requestAnimationFrame(gameLoop);

  // Show countdown
  showCountdown(3);
}

function showCountdown(n) {
  const el = $('hud-countdown');
  el.classList.remove('hidden');
  el.textContent = n > 0 ? n.toString() : 'GO!';
  if (n > 0) el.classList.remove('go');
  else el.classList.add('go');

  if (n > 0) {
    setTimeout(() => showCountdown(n - 1), 1000);
  } else {
    gs.raceStarted = true;
    gs.startTime = performance.now();
    gs.allCars.forEach(c => c.lapStartTime = performance.now());
    setTimeout(() => el.classList.add('hidden'), 800);
  }
}

// ══════════════════════════════════════════════════════════════
//  GAME LOOP
// ══════════════════════════════════════════════════════════════
function gameLoop(ts) {
  if (!gameRunning) return;
  animFrame = requestAnimationFrame(gameLoop);
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  if (gamePaused) return;

  updateRace(dt);
  renderRace();
}

function updateRace(dt) {
  if (!gs.raceStarted) return;

  gs.raceTime = (performance.now() - gs.startTime) / 1000;

  const { spline, trackEdges, allCars, playerCar, pickups } = gs;

  // Update cars
  allCars.forEach(car => {
    if (car.finished) return;
    car.update(dt, spline, trackEdges, currentTrack.trackWidth);

    // Check lap count
    if (car.lap > currentTrack.laps && !car.finished) {
      car.finished = true;
      car.finishTime = gs.raceTime;
      gs.finishOrder.push(car);
      if (car.isPlayer) {
        setTimeout(() => showFinishScreen(), 1200);
      }
    }
  });

  // Pickup collision
  pickups.forEach(p => {
    p.update(dt);
    if (p.collected) return;
    allCars.forEach(car => {
      if (dist(car.x, car.y, p.x, p.y) < p.radius + 15) {
        p.collected = true;
        p.respawnTimer = 8;
        if (car.isPlayer) {
          if (p.type === 'nitro') {
            car.nitro = Math.min(car.def.nitroMax, car.nitro + 40);
            showMsg('⚡ NITRO!', '#ffdd00');
          } else {
            car.speed *= 1.3;
            showMsg('💨 SPEED!', '#4fc3f7');
          }
        }
      }
    });
  });

  // Positions
  const sorted = [...allCars].sort((a,b) => b.totalDist - a.totalDist);
  sorted.forEach((car, i) => car.position = i + 1);

  // Camera — smooth follow
  const targetCamX = playerCar.x - W/2;
  const targetCamY = playerCar.y - H/2;
  gs.camera.x = lerp(gs.camera.x, targetCamX, 6 * dt);
  gs.camera.y = lerp(gs.camera.y, targetCamY, 6 * dt);

  // Message timer
  if (gs.msgTimer > 0) gs.msgTimer -= dt;

  // Update HUD
  updateHUD();
}

function updateHUD() {
  const car = gs.playerCar;
  $('hud-speed').textContent = Math.abs(Math.round(car.speed));
  $('hud-lap').textContent = `LAP ${Math.min(car.lap, currentTrack.laps)}/${currentTrack.laps}`;
  $('hud-timer').textContent = fmtTime(gs.raceTime);
  $('nitro-fill').style.width = `${(car.nitro / car.def.nitroMax) * 100}%`;
  const posLabels = ['1ST','2ND','3RD','4TH'];
  $('hud-pos').textContent = posLabels[car.position-1] || `${car.position}TH`;
}

function showMsg(text, color) {
  const el = $('hud-msg');
  el.textContent = text;
  el.style.color = color || 'white';
  el.classList.remove('hidden');
  gs.msgTimer = 1.5;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.add('hidden'), 1500);
}

// ══════════════════════════════════════════════════════════════
//  RENDER
// ══════════════════════════════════════════════════════════════
function renderRace() {
  const { camera, spline, trackEdges, scenery, pickups, allCars, playerCar } = gs;
  const camX = camera.x, camY = camera.y;

  ctx.clearRect(0, 0, W, H);

  // Background
  drawBackground(ctx, currentTrack, camX, camY);

  // Scenery behind track
  scenery.forEach(item => drawSceneryItem(ctx, item, camX, camY));

  // Track
  drawTrack(ctx, currentTrack, spline, trackEdges, camX, camY);

  // Pickups
  pickups.forEach(p => p.draw(ctx, camX, camY));

  // Cars (sorted by y for painter's algorithm)
  const sortedCars = [...allCars].sort((a,b) => a.y - b.y);
  sortedCars.forEach(car => car.draw(ctx, camX, camY));

  // Lap completion flash
  if (gs.lapFlash > 0) {
    ctx.fillStyle = `rgba(255,255,100,${gs.lapFlash * 0.3})`;
    ctx.fillRect(0, 0, W, H);
    gs.lapFlash -= 0.05;
  }

  // Minimap
  drawMinimap(spline, allCars, playerCar);
}

// ══════════════════════════════════════════════════════════════
//  FINISH
// ══════════════════════════════════════════════════════════════
function showFinishScreen() {
  gameRunning = false;
  const car = gs.playerCar;
  const pos = car.position;
  const posLabels = ['1ST 🥇','2ND 🥈','3RD 🥉','4TH'];
  const posIcons = ['🏆','🥈','🥉','😤'];

  $('finish-icon').textContent = posIcons[Math.min(pos-1,3)];
  $('finish-title').textContent = pos === 1 ? '🎉 WINNER!' : 'RACE OVER!';
  $('finish-pos').textContent = posLabels[Math.min(pos-1,3)] + ' PLACE';
  $('fin-time').textContent = fmtTime(gs.raceTime);
  $('fin-bestlap').textContent = fmtTime(car.bestLap);
  $('fin-speed').textContent = `${Math.round(car.topSpeed)} km/h`;

  // Check record
  const tid = currentTrack.id;
  const prev = records[tid];
  let recordText = 'No previous record';
  if (!prev || gs.raceTime < prev.time) {
    records[tid] = { time: gs.raceTime, bestLap: car.bestLap, pos };
    saveData();
    recordText = '✨ NEW RECORD!';
    $('fin-record').style.color = '#ffdd00';
  } else {
    recordText = fmtTime(prev.time);
    $('fin-record').style.color = 'white';
  }
  $('fin-record').textContent = recordText;

  showScreen('finish-screen');
  $('game-screen').classList.remove('hidden');
}

// ══════════════════════════════════════════════════════════════
//  MENU BACKGROUND ANIMATION
// ══════════════════════════════════════════════════════════════
let menuCanvas2, menuCtx2, menuAnimFrame, menuT = 0;
const menuWaves = [];
const menuCars = [];

function startMenuBG() {
  menuCanvas2 = $('menu-canvas');
  if (!menuCanvas2) return;
  menuCanvas2.width = window.innerWidth;
  menuCanvas2.height = window.innerHeight;
  menuCtx2 = menuCanvas2.getContext('2d');

  for (let i = 0; i < 5; i++) {
    menuWaves.push({ phase: Math.random() * TAU, speed: rand(0.3,0.8), amp: rand(20,50), y: rand(0.55,0.85) });
  }
  for (let i = 0; i < 3; i++) {
    menuCars.push({ x: rand(0, window.innerWidth), y: rand(window.innerHeight*0.55, window.innerHeight*0.75), speed: rand(80,160), colorIdx: i % CARS.length });
  }

  if (menuAnimFrame) cancelAnimationFrame(menuAnimFrame);
  menuAnimFrame = requestAnimationFrame(animMenuBG);
}

function animMenuBG(ts) {
  if ($('main-menu').classList.contains('hidden')) { cancelAnimationFrame(menuAnimFrame); return; }
  menuAnimFrame = requestAnimationFrame(animMenuBG);
  menuT += 0.016;
  const mw = menuCanvas2.width, mh = menuCanvas2.height;
  menuCtx2.clearRect(0, 0, mw, mh);

  // Sky
  const sky = menuCtx2.createLinearGradient(0, 0, 0, mh);
  sky.addColorStop(0, '#4fc3f7');
  sky.addColorStop(0.5, '#87ceeb');
  sky.addColorStop(1, '#f5c842');
  menuCtx2.fillStyle = sky;
  menuCtx2.fillRect(0, 0, mw, mh);

  // Sun
  const sunX = mw * 0.8, sunY = mh * 0.15;
  const sunG = menuCtx2.createRadialGradient(sunX, sunY, 5, sunX, sunY, 80);
  sunG.addColorStop(0, '#fffde7');
  sunG.addColorStop(0.4, '#ffdd00');
  sunG.addColorStop(1, 'transparent');
  menuCtx2.fillStyle = sunG;
  menuCtx2.beginPath(); menuCtx2.arc(sunX, sunY, 80, 0, TAU); menuCtx2.fill();

  // Clouds
  [[0.15,0.15],[0.5,0.1],[0.75,0.2]].forEach(([cx,cy],i) => {
    const ox = ((menuT*20 + i*300) % (mw + 200)) - 200;
    menuCtx2.fillStyle = 'rgba(255,255,255,0.7)';
    [[0,0,40],[30,5,30],[-30,5,30],[15,-10,25],[-15,-10,25]].forEach(([dx,dy,r]) => {
      menuCtx2.beginPath(); menuCtx2.arc(cx*mw+ox+dx, cy*mh+dy, r, 0, TAU); menuCtx2.fill();
    });
  });

  // Water
  menuCtx2.fillStyle = '#1a9ed4';
  menuCtx2.fillRect(0, mh*0.65, mw, mh*0.35);

  // Waves
  menuWaves.forEach((wave, i) => {
    menuCtx2.beginPath();
    for (let x = 0; x <= mw; x += 4) {
      const y = wave.y * mh + Math.sin(x * 0.02 + menuT * wave.speed + wave.phase) * wave.amp;
      x === 0 ? menuCtx2.moveTo(x, y) : menuCtx2.lineTo(x, y);
    }
    menuCtx2.lineTo(mw, mh); menuCtx2.lineTo(0, mh); menuCtx2.closePath();
    menuCtx2.fillStyle = `rgba(26,158,212,${0.3 + i*0.1})`;
    menuCtx2.fill();
  });

  // Beach
  const beachGrad = menuCtx2.createLinearGradient(0, mh*0.55, 0, mh*0.7);
  beachGrad.addColorStop(0, '#f5c842');
  beachGrad.addColorStop(1, '#e8a020');
  menuCtx2.fillStyle = beachGrad;
  menuCtx2.beginPath();
  menuCtx2.moveTo(0, mh*0.55);
  for (let x = 0; x <= mw; x += 8) {
    menuCtx2.lineTo(x, mh*0.55 + Math.sin(x*0.03 + menuT)*3);
  }
  menuCtx2.lineTo(mw, mh*0.75); menuCtx2.lineTo(0, mh*0.75); menuCtx2.closePath();
  menuCtx2.fill();

  // Mini cars driving across
  menuCars.forEach(car => {
    car.x += car.speed * 0.016;
    if (car.x > mw + 50) car.x = -50;
    menuCtx2.save();
    menuCtx2.translate(car.x, car.y);
    const c = CARS[car.colorIdx];
    menuCtx2.fillStyle = c.body;
    menuCtx2.beginPath(); menuCtx2.roundRect(-18,-10,36,20,4); menuCtx2.fill();
    menuCtx2.fillStyle = c.roof;
    menuCtx2.beginPath(); menuCtx2.roundRect(-12,-14,24,14,3); menuCtx2.fill();
    menuCtx2.fillStyle = '#333';
    [[-14,-6],[-14,6],[14,-6],[14,6]].forEach(([wx,wy]) => {
      menuCtx2.beginPath(); menuCtx2.ellipse(wx,wy,5,4,0,0,TAU); menuCtx2.fill();
    });
    menuCtx2.restore();
  });

  // Palm trees
  [[0.05,0.6],[0.88,0.58],[0.45,0.62]].forEach(([cx,cy]) => {
    const px = cx*mw, py = cy*mh;
    menuCtx2.strokeStyle = '#5a3010';
    menuCtx2.lineWidth = 6;
    menuCtx2.beginPath(); menuCtx2.moveTo(px, py); menuCtx2.lineTo(px-10+Math.sin(menuT)*5, py-70); menuCtx2.stroke();
    menuCtx2.font = '40px serif';
    menuCtx2.textAlign = 'center';
    menuCtx2.fillText('🌴', px-5, py-75);
  });
}

// ══════════════════════════════════════════════════════════════
//  TRACK PREVIEW (miniature on track select)
// ══════════════════════════════════════════════════════════════
function drawTrackPreview(canvas, track) {
  const c = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  c.clearRect(0, 0, w, h);

  const colors = track.colors;
  const skyG = c.createLinearGradient(0, 0, 0, h);
  skyG.addColorStop(0, colors.sky[0]); skyG.addColorStop(1, colors.sky[1]);
  c.fillStyle = skyG; c.fillRect(0, 0, w, h);

  const pts = track.waypoints.map(([x,y]) => ({ x: x*w, y: y*h }));
  c.beginPath();
  pts.forEach((p, i) => i===0 ? c.moveTo(p.x,p.y) : c.lineTo(p.x,p.y));
  c.closePath();
  c.strokeStyle = 'rgba(255,255,255,0.8)';
  c.lineWidth = 6;
  c.stroke();
  c.strokeStyle = colors.track;
  c.lineWidth = 4;
  c.stroke();

  // Start marker
  c.fillStyle = '#ffdd00';
  c.beginPath(); c.arc(pts[0].x, pts[0].y, 5, 0, TAU); c.fill();
}

// ══════════════════════════════════════════════════════════════
//  UI SCREENS
// ══════════════════════════════════════════════════════════════
const ALL_SCREENS = ['main-menu','track-select','game-screen','pause-screen','finish-screen','garage-screen','records-screen','howto-screen'];

function showScreen(id) {
  ALL_SCREENS.forEach(s => $(s).classList.toggle('hidden', s !== id));
}

function goToMenu() {
  gameRunning = false; gamePaused = false;
  if (animFrame) cancelAnimationFrame(animFrame);
  showScreen('main-menu');
  startMenuBG();
  updateMenuStats();
}

function updateMenuStats() {
  const bestTimes = Object.entries(records);
  if (bestTimes.length > 0) {
    const best = bestTimes.sort((a,b) => a[1].time - b[1].time)[0];
    const trackName = TRACKS.find(t => t.id === best[0])?.name || best[0];
    $('menu-besttime').textContent = `🏆 Best: ${trackName} — ${fmtTime(best[1].time)}`;
  } else {
    $('menu-besttime').textContent = '🏁 No records yet — start racing!';
  }
}

// ══════════════════════════════════════════════════════════════
//  TRACK SELECT
// ══════════════════════════════════════════════════════════════
function showTrackSelect() {
  showScreen('track-select');
  const grid = $('track-grid');
  grid.innerHTML = '';
  TRACKS.forEach((track, i) => {
    const card = document.createElement('div');
    card.className = 'track-card';
    const stars = '⭐'.repeat(track.difficulty) + '☆'.repeat(4-track.difficulty);
    const rec = records[track.id];
    const recText = rec ? `🏆 ${fmtTime(rec.time)}` : 'No record yet';
    card.innerHTML = `
      <div class="track-preview">
        <canvas width="240" height="140" id="tp-${track.id}"></canvas>
        ${i > 0 && !records[TRACKS[i-1].id] ? '<div class="track-badge">🔒 LOCKED</div>' : ''}
      </div>
      <div class="track-label">
        <div class="track-name">${track.name}</div>
        <div class="track-diff">${stars} · Difficulty ${track.difficulty}/4</div>
        <div class="track-time">${recText}</div>
      </div>
    `;
    const isLocked = i > 0 && !records[TRACKS[i-1].id];
    if (!isLocked) {
      card.addEventListener('click', () => {
        showScreen('game-screen');
        initRace(track);
      });
    } else {
      card.classList.add('locked');
    }
    grid.appendChild(card);
    setTimeout(() => {
      const previewCanvas = $(`tp-${track.id}`);
      if (previewCanvas) drawTrackPreview(previewCanvas, track);
    }, 100);
  });
}

// ══════════════════════════════════════════════════════════════
//  GARAGE
// ══════════════════════════════════════════════════════════════
let garageIdx = 0;
let garageCanvas;

function showGarage() {
  showScreen('garage-screen');
  garageIdx = selectedCarIdx;
  garageCanvas = document.createElement('canvas');
  garageCanvas.width = 380; garageCanvas.height = 200;
  $('car-showcase').innerHTML = '';
  $('car-showcase').appendChild(garageCanvas);
  updateGarageView();
  animateGarage();
}

function updateGarageView() {
  const car = CARS[garageIdx];
  $('car-name').textContent = car.name;
  const stats = $('car-stats');
  stats.innerHTML = '';
  [
    {label:'SPEED', val: car.speed, color:'#ff6b6b'},
    {label:'HANDLE', val: car.handling, color:'#4fc3f7'},
    {label:'NITRO', val: car.nitro, color:'#ffdd00'},
    {label:'WEIGHT', val: car.weight, color:'#aaa'},
  ].forEach(s => {
    stats.innerHTML += `<div class="stat-chip">${s.label}: ${'▪'.repeat(s.val)}${'▫'.repeat(10-s.val)}</div>`;
  });
  const btn = $('btn-select-car');
  if (garageIdx === selectedCarIdx) {
    btn.textContent = '✓ SELECTED';
    btn.classList.add('selected');
  } else {
    btn.textContent = '✓ SELECT THIS CAR';
    btn.classList.remove('selected');
  }
}

let garageAnimFrame;
function animateGarage() {
  if ($('garage-screen').classList.contains('hidden')) { cancelAnimationFrame(garageAnimFrame); return; }
  garageAnimFrame = requestAnimationFrame(animateGarage);
  const c = garageCanvas.getContext('2d');
  c.clearRect(0, 0, 380, 200);
  const car = CARS[garageIdx];

  // Garage floor
  const floorGrad = c.createLinearGradient(0, 100, 0, 200);
  floorGrad.addColorStop(0, 'rgba(0,50,100,0.5)');
  floorGrad.addColorStop(1, 'rgba(0,30,60,0.8)');
  c.fillStyle = floorGrad;
  c.fillRect(0, 100, 380, 100);

  // Reflection
  const reflGrad = c.createRadialGradient(190, 150, 0, 190, 150, 80);
  reflGrad.addColorStop(0, 'rgba(255,255,255,0.15)');
  reflGrad.addColorStop(1, 'transparent');
  c.fillStyle = reflGrad;
  c.fillRect(0, 0, 380, 200);

  const t = Date.now() / 1000;
  const spin = t * 0.5;

  c.save(); c.translate(190, 100);
  c.rotate(spin);

  // Shadow
  c.save(); c.translate(4, 5); c.globalAlpha = 0.3;
  drawCarShape(c, car, '#000', '#000');
  c.globalAlpha = 1; c.restore();

  drawCarShape(c, car, car.body, car.roof);
  c.restore();

  // Car name glow
  c.font = 'bold 18px Boogaloo, cursive';
  c.textAlign = 'center';
  c.fillStyle = car.body;
  c.shadowColor = car.body;
  c.shadowBlur = 15;
  c.fillText(car.name, 190, 180);
  c.shadowBlur = 0;
}

function drawCarShape(c, car, bodyColor, roofColor) {
  c.fillStyle = bodyColor;
  c.beginPath(); c.roundRect(-18,-28,36,56,6); c.fill();
  c.fillStyle = roofColor;
  c.beginPath(); c.roundRect(-14,-20,28,30,4); c.fill();
  c.fillStyle = 'rgba(150,220,255,0.7)';
  c.beginPath(); c.roundRect(-12,-18,24,12,2); c.fill();
  c.fillStyle = car.wheel;
  [[-22,-18],[-22,12],[22,-18],[22,12]].forEach(([wx,wy]) => {
    c.beginPath(); c.roundRect(wx-5,-8,10,16,2); c.fill();
  });
}

// ══════════════════════════════════════════════════════════════
//  RECORDS SCREEN
// ══════════════════════════════════════════════════════════════
function showRecords() {
  showScreen('records-screen');
  const list = $('records-list');
  if (Object.keys(records).length === 0) {
    list.innerHTML = '<div class="no-records">🏁 No records yet!<br>Get out there and race!</div>';
    return;
  }
  list.innerHTML = TRACKS.map(track => {
    const rec = records[track.id];
    if (!rec) return '';
    const medals = ['🥇','🥈','🥉','4th'];
    return `<div class="record-section">
      <div class="record-track-name">${track.name}</div>
      <div class="record-row"><span>${medals[Math.min(rec.pos-1,3)]} Finish Position</span><span>${medals[Math.min(rec.pos-1,3)]} ${rec.pos}${['st','nd','rd','th'][Math.min(rec.pos-1,3)]}</span></div>
      <div class="record-row"><span>⏱ Best Race Time</span><span>${fmtTime(rec.time)}</span></div>
      <div class="record-row"><span>🔥 Best Lap</span><span>${fmtTime(rec.bestLap)}</span></div>
    </div>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════════
//  INPUT
// ══════════════════════════════════════════════════════════════
function initInput() {
  document.addEventListener('keydown', e => {
    keys[e.key] = true;
    if (e.key === ' ') e.preventDefault();
    if ((e.key === 'p' || e.key === 'P' || e.key === 'Escape') && gameRunning && !gamePaused) pauseRace();
    else if (e.key === 'Escape' && gamePaused) resumeRace();
  });
  document.addEventListener('keyup', e => { keys[e.key] = false; });

  // Touch controls
  function bindTouch(id, key) {
    const el = $(id); if (!el) return;
    el.addEventListener('touchstart', e => { e.preventDefault(); touch[key] = true; }, { passive: false });
    el.addEventListener('touchend', e => { e.preventDefault(); touch[key] = false; }, { passive: false });
    el.addEventListener('mousedown', () => touch[key] = true);
    el.addEventListener('mouseup', () => touch[key] = false);
  }
  bindTouch('mc-left', 'left');
  bindTouch('mc-right', 'right');
  bindTouch('mc-gas', 'gas');
  bindTouch('mc-brake', 'brake');
  bindTouch('mc-nitro', 'nitro');
}

function pauseRace() {
  gamePaused = true;
  showScreen('pause-screen');
  $('game-screen').classList.remove('hidden');
}

function resumeRace() {
  gamePaused = false;
  hideOverlay('pause-screen');
  lastTime = performance.now();
}

function hideOverlay(id) {
  $(id).classList.add('hidden');
}

// ══════════════════════════════════════════════════════════════
//  BUTTON WIRING
// ══════════════════════════════════════════════════════════════
function wireButtons() {
  $('btn-play').onclick = () => showTrackSelect();
  $('btn-garage').onclick = () => showGarage();
  $('btn-records').onclick = () => showRecords();
  $('btn-howto').onclick = () => showScreen('howto-screen');

  $('ts-back').onclick = () => goToMenu();
  $('btn-pause-game').onclick = () => pauseRace();
  $('btn-resume').onclick = () => resumeRace();
  $('btn-restart').onclick = () => { hideOverlay('pause-screen'); initRace(currentTrack); };
  $('btn-quit-pause').onclick = () => { hideOverlay('pause-screen'); goToMenu(); };

  $('btn-again').onclick = () => { hideOverlay('finish-screen'); initRace(currentTrack); };
  $('btn-quit-finish').onclick = () => { hideOverlay('finish-screen'); goToMenu(); };

  $('garage-back').onclick = () => { cancelAnimationFrame(garageAnimFrame); goToMenu(); };
  $('car-prev').onclick = () => { garageIdx = (garageIdx - 1 + CARS.length) % CARS.length; updateGarageView(); };
  $('car-next').onclick = () => { garageIdx = (garageIdx + 1) % CARS.length; updateGarageView(); };
  $('btn-select-car').onclick = () => { selectedCarIdx = garageIdx; saveData(); updateGarageView(); };

  $('records-back').onclick = () => goToMenu();
  $('howto-back').onclick = () => goToMenu();
}

// ══════════════════════════════════════════════════════════════
//  LOADING + BOOT
// ══════════════════════════════════════════════════════════════
function runLoader() {
  const bar = $('load-bar'), tip = $('load-tip');
  const tips = [
    'Loading sandy tracks...','Warming up the engines...','Painting palm trees...','Filling up the nitro tanks...','Waxing the buggies...'
  ];
  let prog = 0, tipIdx = 0;
  const step = () => {
    prog += rand(18, 38);
    if (prog > 100) prog = 100;
    bar.style.width = `${prog}%`;
    tip.textContent = tips[Math.floor(prog / 25)];
    if (prog < 100) setTimeout(step, rand(150, 400));
    else setTimeout(() => {
      $('loading-screen').style.opacity = '0';
      $('loading-screen').style.transition = 'opacity .6s ease';
      setTimeout(() => {
        $('loading-screen').style.display = 'none';
        goToMenu();
      }, 600);
    }, 300);
  };
  setTimeout(step, 300);
}

window.addEventListener('resize', () => {
  if (canvas) { canvas.width = window.innerWidth; canvas.height = window.innerHeight; W = canvas.width; H = canvas.height; }
  if (menuCanvas2) { menuCanvas2.width = window.innerWidth; menuCanvas2.height = window.innerHeight; }
});

document.addEventListener('DOMContentLoaded', () => {
  wireButtons();
  initInput();
  runLoader();
});
