// Creatures used as each level's guardian mini-boss. Reuses the same
// walk-cycle/animate convention as humanoid.js (idle/step-a/step-b
// textures + animateHumanoid) so they drop into the existing enemy group,
// patrol, and hit logic unchanged.

export const ANIMAL_TYPES = ['snake', 'dog', 'wolf', 'lion', 'griffin', 'minotaur', 'yeti', 'bat'];
export const ANIMAL_SIZE = { width: 40, height: 30 };
// The mini-boss is drawn noticeably bigger than a regular enemy for presence.
export const BOSS_ANIMAL_SIZE = { width: 62, height: 46 };

function drawLegs(g, cx, groundY, color, spread, step) {
  const lift = step * 3;
  g.fillStyle(color, 1);
  g.fillRoundedRect(cx - spread - 3, groundY - 8 + (step > 0 ? -lift : 0), 5, 8, 2);
  g.fillRoundedRect(cx + spread - 2, groundY - 8 + (step < 0 ? -lift : 0), 5, 8, 2);
}

function drawSnake(g, w, h, step) {
  const bodyY = h * 0.6;
  const wave = step * 4;
  const segs = [
    { x: w * 0.15, r: 5, y: bodyY + wave },
    { x: w * 0.35, r: 6, y: bodyY - wave },
    { x: w * 0.55, r: 6.5, y: bodyY + wave },
    { x: w * 0.75, r: 7, y: bodyY },
  ];
  g.fillStyle(0x2a9d4f, 1);
  segs.forEach((s) => g.fillCircle(s.x, s.y, s.r));
  g.fillStyle(0x74c69d, 1);
  segs.forEach((s) => g.fillCircle(s.x, s.y + s.r * 0.3, s.r * 0.5));
  // head
  g.fillStyle(0x2a9d4f, 1);
  g.fillCircle(w * 0.88, bodyY, 7.5);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(w * 0.9, bodyY - 2, 1.6);
  g.fillStyle(0xff5d5d, 1);
  g.fillRect(w * 0.95, bodyY, 5, 1.4);
}

function drawQuadruped(g, w, h, step, { body, belly, ear, eye, mane, wings, horns }) {
  const groundY = h - 2;
  const bodyCy = h * 0.55;
  drawLegs(g, w * 0.32, groundY, shade(body, -0.25), 0, step);
  drawLegs(g, w * 0.68, groundY, shade(body, -0.25), 0, -step);

  if (wings) {
    g.fillStyle(shade(body, 0.15), 1);
    g.fillTriangle(w * 0.4, bodyCy - h * 0.05, w * 0.22, bodyCy - h * 0.45, w * 0.5, bodyCy - h * 0.1);
    g.fillTriangle(w * 0.5, bodyCy - h * 0.05, w * 0.68, bodyCy - h * 0.5, w * 0.58, bodyCy - h * 0.08);
  }

  if (mane) {
    g.fillStyle(mane, 1);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.fillCircle(w * 0.8 + Math.cos(a) * 8, h * 0.32 + Math.sin(a) * 8, 3.2);
    }
  }

  g.fillStyle(body, 1);
  g.fillEllipse(w * 0.45, bodyCy, w * 0.55, h * 0.4);
  g.fillStyle(belly, 1);
  g.fillEllipse(w * 0.45, bodyCy + h * 0.12, w * 0.4, h * 0.2);

  // tail
  g.fillStyle(body, 1);
  g.fillTriangle(w * 0.12, bodyCy - 2, w * 0.02, bodyCy - 8, w * 0.1, bodyCy + 4);

  // head
  g.fillStyle(body, 1);
  g.fillCircle(w * 0.8, h * 0.35, 9);

  if (horns) {
    g.fillStyle(0xe8e2d0, 1);
    g.fillTriangle(w * 0.74, h * 0.3, w * 0.7, h * 0.06, w * 0.79, h * 0.24);
    g.fillTriangle(w * 0.86, h * 0.24, w * 0.9, h * 0.02, w * 0.92, h * 0.28);
  } else {
    g.fillStyle(ear, 1);
    g.fillTriangle(w * 0.72, h * 0.28, w * 0.76, h * 0.12, w * 0.8, h * 0.26);
    g.fillTriangle(w * 0.84, h * 0.26, w * 0.88, h * 0.1, w * 0.9, h * 0.28);
  }

  // snout
  g.fillStyle(belly, 1);
  g.fillEllipse(w * 0.9, h * 0.4, 7, 5);
  // eye
  g.fillStyle(eye, 1);
  g.fillCircle(w * 0.84, h * 0.32, 1.8);
}

function shade(hex, amt) {
  const r = Math.max(0, Math.min(255, ((hex >> 16) & 0xff) * (1 + amt)));
  const gr = Math.max(0, Math.min(255, ((hex >> 8) & 0xff) * (1 + amt)));
  const b = Math.max(0, Math.min(255, (hex & 0xff) * (1 + amt)));
  return (r << 16) | (gr << 8) | b;
}

const DRAWERS = {
  snake: (g, w, h, step) => drawSnake(g, w, h, step),
  dog: (g, w, h, step) => drawQuadruped(g, w, h, step, { body: 0xc38a4f, belly: 0xf1d9b5, ear: 0x8a5a2b, eye: 0x2b1140 }),
  wolf: (g, w, h, step) => drawQuadruped(g, w, h, step, { body: 0x8892a6, belly: 0xd8dde6, ear: 0x5c6472, eye: 0xffd166 }),
  lion: (g, w, h, step) => drawQuadruped(g, w, h, step, { body: 0xe0a94a, belly: 0xf6dfa8, ear: 0xb8822f, eye: 0x2b1140, mane: 0xc9781f }),
  griffin: (g, w, h, step) =>
    drawQuadruped(g, w, h, step, { body: 0xd4a24c, belly: 0xf3e0b0, ear: 0xa8762c, eye: 0xffe066, wings: true }),
  minotaur: (g, w, h, step) =>
    drawQuadruped(g, w, h, step, { body: 0x8a5a44, belly: 0xd8b89a, ear: 0x5c3a2a, eye: 0xff5d5d, horns: true }),
  yeti: (g, w, h, step) =>
    drawQuadruped(g, w, h, step, { body: 0xe8ecf0, belly: 0xffffff, ear: 0xc7ceda, eye: 0x3a86ff }),
  bat: (g, w, h, step) =>
    drawQuadruped(g, w, h, step, { body: 0x4a3570, belly: 0x7a5fa0, ear: 0x2b1140, eye: 0xff5d5d, wings: true }),
};

export function ensureAnimalTexture(scene, type, baseKey, size = ANIMAL_SIZE) {
  const { width: w, height: h } = size;
  const draw = DRAWERS[type] || DRAWERS.dog;
  ['idle', 'step-a', 'step-b'].forEach((suffix, i) => {
    const key = `${baseKey}-${suffix}`;
    if (scene.textures.exists(key)) return;
    const g = scene.add.graphics();
    const step = i === 0 ? 0 : i === 1 ? 1 : -1;
    draw(g, w, h, step);
    g.generateTexture(key, w, h);
    g.destroy();
  });
}
