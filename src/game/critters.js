// Small patrol-enemy critters -- spider, frog, snake, lizard -- drawn the
// same way as humanoid.js (pure Graphics, no image assets, baked once into
// a 3-frame idle/step-a/step-b set per type). Used in place of the old
// single red-imp look every level reused identically, so LevelScene can mix
// several different creatures into the same level instead.
//
// A wider-than-tall canvas (unlike HERO_SIZE's tall portrait box) --
// spiders/frogs/snakes/lizards are all low, ground-hugging shapes, and
// forcing them into a tall box would squash them.
export const CRITTER_SIZE = { width: 36, height: 26 };
const CRITTER_TYPES = ['spider', 'frog', 'snake', 'lizard'];

// Deterministic per (level, enemy-within-level) so a level's patrol always
// looks the same across replays, but different levels -- and different
// enemies within the same level -- land on different creatures instead of
// all matching.
export function critterTypeFor(levelIndex, enemyIndex) {
  // Both coefficients must be odd relative to CRITTER_TYPES.length (4) --
  // an earlier version used levelIndex*3 + enemyIndex*2, and since the
  // second term was always even, the sum's parity depended only on
  // levelIndex, which meant every even-indexed level could only ever land
  // on types 0 or 2 (spider/snake) and never 1 or 3 (frog/lizard).
  return CRITTER_TYPES[(levelIndex * 3 + enemyIndex * 5) % CRITTER_TYPES.length];
}

function drawSpider(g, { w, h, step }) {
  const cx = w / 2;
  const bodyY = h * 0.55;
  const legLift = step * 2.2;

  // Two-segment legs, four per side, each pair alternating up/down between
  // frames for a scuttle instead of a plain in-place bob.
  g.lineStyle(1.6, 0x1a1030, 1);
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 4; i++) {
      const t = (i - 1.5) / 1.5; // -1..1 front-to-back
      const dir = i % 2 === 0 ? 1 : -1;
      const kneeX = cx + side * (9 + Math.abs(t) * 2);
      const kneeY = bodyY + t * 3 - 3 + dir * legLift;
      const footX = cx + side * (15 + Math.abs(t) * 3);
      const footY = bodyY + t * 5 + 6 - dir * legLift * 0.6;
      g.beginPath();
      g.moveTo(cx + side * 5, bodyY - 1);
      g.lineTo(kneeX, kneeY);
      g.lineTo(footX, footY);
      g.strokePath();
    }
  }

  g.fillStyle(0x3d2a5c, 1);
  g.fillEllipse(cx - 2, bodyY, 15, 11);
  g.fillStyle(0x2b2140, 1);
  g.fillCircle(cx + 8, bodyY - 1, 6.5);

  g.fillStyle(0xff5d5d, 1);
  g.fillCircle(cx + 10.5, bodyY - 3, 1.4);
  g.fillCircle(cx + 12, bodyY - 0.5, 1.2);
  g.fillCircle(cx + 10, bodyY + 1.2, 1);
}

function drawFrog(g, { w, h, step }) {
  const cx = w / 2;
  const bodyY = h * 0.6;
  // A hop cycle rather than a walk -- crouched low on one frame, legs
  // pushed out extended on the other, since frogs don't stride.
  const crouch = step > 0 ? 2 : 0;
  const kick = step < 0 ? 5 : 1.5;

  g.fillStyle(0x3a7d33, 1);
  // back legs, folded (drawn first so the body overlaps their hip joint)
  [-1, 1].forEach((side) => {
    g.fillTriangle(
      cx + side * 6,
      bodyY + 4 - crouch,
      cx + side * (10 + kick),
      bodyY + 9,
      cx + side * (6 + kick * 0.6),
      bodyY + 10
    );
  });

  g.fillEllipse(cx, bodyY + 1 - crouch, 20, 12 + crouch * 0.6);

  // front legs, small nubs
  [-1, 1].forEach((side) => {
    g.fillCircle(cx + side * 7, bodyY + 7 - crouch * 0.4, 2.6);
  });

  // bulging eyes on top, the single most frog-identifying feature
  [-1, 1].forEach((side) => {
    g.fillStyle(0xdff2c8, 1);
    g.fillCircle(cx + side * 4, bodyY - 7 + crouch * 0.3, 3.4);
    g.fillStyle(0x1a1030, 1);
    g.fillCircle(cx + side * 4, bodyY - 7 + crouch * 0.3, 1.5);
  });
}

function drawSnake(g, { w, h, step }) {
  const bodyY = h * 0.62;
  // A chain of shrinking segments along a sine wave -- `step` shifts the
  // wave's phase between frames for a slither instead of a static S.
  const phase = step * 1.1;
  const segments = 6;
  g.fillStyle(0x2f8f4e, 1);
  for (let i = segments - 1; i >= 0; i--) {
    const t = i / (segments - 1);
    const x = 5 + t * (w - 10);
    const wave = Math.sin(t * Math.PI * 1.6 + phase) * 5;
    const r = 6 - t * 3.2;
    g.fillCircle(x, bodyY + wave, r);
  }
  // head + eye + tongue flick, at the wide (t=0) end
  const headWave = Math.sin(phase) * 5;
  g.fillStyle(0x256b3a, 1);
  g.fillCircle(6, bodyY + headWave, 6.4);
  g.fillStyle(0xffe066, 1);
  g.fillCircle(4, bodyY + headWave - 1.5, 1.2);
  if (step >= 0) {
    g.lineStyle(1, 0xff5d5d, 1);
    g.lineBetween(1, bodyY + headWave, -3, bodyY + headWave - 1);
    g.lineBetween(1, bodyY + headWave, -3, bodyY + headWave + 1);
  }
}

function drawLizard(g, { w, h, step }) {
  const cx = w / 2;
  const bodyY = h * 0.6;
  const gait = step * 3;

  g.fillStyle(0x4a7a5c, 1);
  // tail, tapering back
  g.fillTriangle(cx - 10, bodyY, cx - 22, bodyY - 3, cx - 22, bodyY + 3);
  // four short splayed legs, diagonal pairs opposite each other like a real quadruped gait
  g.fillStyle(0x3c6249, 1);
  g.fillRect(cx - 6, bodyY + 3, 3, 5 + gait);
  g.fillRect(cx + 5, bodyY + 3, 3, 5 - gait);
  g.fillRect(cx - 6, bodyY - 8 - gait, 3, 5);
  g.fillRect(cx + 5, bodyY - 8 + gait, 3, 5);

  g.fillStyle(0x4a7a5c, 1);
  g.fillEllipse(cx, bodyY, 20, 9);
  g.fillCircle(cx + 12, bodyY - 1, 5.2);
  g.fillStyle(0x1a1030, 1);
  g.fillCircle(cx + 14, bodyY - 2.5, 1.1);
}

const DRAWERS = { spider: drawSpider, frog: drawFrog, snake: drawSnake, lizard: drawLizard };

function buildCritterFrames(scene, baseKey, type) {
  const { width: w, height: h } = CRITTER_SIZE;
  const draw = DRAWERS[type];
  ['idle', 'step-a', 'step-b'].forEach((suffix, i) => {
    const key = `${baseKey}-${suffix}`;
    if (scene.textures.exists(key)) return;
    const g = scene.add.graphics();
    const step = i === 0 ? 0 : i === 1 ? 1 : -1;
    draw(g, { w, h, step });
    g.generateTexture(key, w, h);
    g.destroy();
  });
}

// Returns the base texture key (`critter-<type>`) to use for both the
// sprite's initial texture and animateHumanoid()'s baseKey.
export function ensureCritterTexture(scene, type) {
  const baseKey = `critter-${type}`;
  buildCritterFrames(scene, baseKey, type);
  return baseKey;
}
