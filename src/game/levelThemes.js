// Five background environments, cycling by level index, so 19 levels don't
// all share one reused backdrop. Each theme draws its own parallax layers
// and hands back a stone palette the fort gate (same structure on every
// level) tints itself with, so the fort feels like it belongs to its biome.

function tileCount(width, spacing) {
  return Math.ceil(width / spacing) + 1;
}

function drawHills(scene, cfg, p) {
  for (let i = 0; i < tileCount(cfg.width, 400); i++) {
    const hill = scene.add.ellipse(i * 400 + 100, cfg.groundY + 60, 500, 220, p.layer1);
    hill.setScrollFactor(0.25);
    const hill2 = scene.add.ellipse(i * 400 + 300, cfg.groundY + 90, 400, 180, p.layer2);
    hill2.setScrollFactor(0.45);
  }
}

// Phaser's add.triangle(x, y, x1, y1, x2, y2, x3, y3, ...) takes x/y as the
// object's world anchor and x1..y3 as vertex points LOCAL to that anchor,
// not absolute world coordinates -- passing world coords for the vertices
// (an earlier version of this file did) silently renders the shape far
// outside the visible area instead of erroring.
function drawMountains(scene, cfg, p) {
  for (let i = 0; i < tileCount(cfg.width, 420); i++) {
    const bx = i * 420 + 80;
    const peakH = 150 + ((i * 53) % 90);
    const far = scene.add.triangle(bx, cfg.groundY, -190, 0, 40, -peakH, 210, 0, p.layer1);
    far.setScrollFactor(0.2);
    scene.add.triangle(bx + 20, cfg.groundY - peakH - 6, -36, 30, 0, -28, 34, 30, 0xe8ecf5, 0.5).setScrollFactor(0.2);

    const nx = bx + 180;
    const peakH2 = 110 + ((i * 37) % 60);
    const near = scene.add.triangle(nx, cfg.groundY, -160, 0, 30, -peakH2, 170, 0, p.layer2);
    near.setScrollFactor(0.4);
  }
}

function drawCity(scene, cfg, p) {
  scene.add.circle(cfg.width * 0.82, 70, 26, 0xf4ecd8, 0.5).setScrollFactor(0.15);

  for (let i = 0; i < tileCount(cfg.width, 150); i++) {
    const bx = i * 150 + 60;
    const bh = 90 + ((i * 61) % 140);
    const bw = 70 + ((i * 29) % 30);
    const building = scene.add.rectangle(bx, cfg.groundY - bh / 2, bw, bh, p.layer1);
    building.setScrollFactor(0.3);
    for (let wy = cfg.groundY - bh + 14; wy < cfg.groundY - 10; wy += 18) {
      for (let wx = bx - bw / 2 + 10; wx < bx + bw / 2 - 6; wx += 16) {
        if (((wx + wy) % 37) < 20) continue; // sparse, some windows dark
        scene.add.rectangle(wx, wy, 6, 8, 0xffd166, 0.55).setScrollFactor(0.3);
      }
    }
  }
  for (let i = 0; i < tileCount(cfg.width, 220); i++) {
    const bx = i * 220 + 140;
    const bh = 60 + ((i * 41) % 90);
    scene.add.rectangle(bx, cfg.groundY - bh / 2, 90, bh, p.layer2).setScrollFactor(0.5);
  }
}

function drawForest(scene, cfg, p) {
  scene.add.rectangle(cfg.width / 2, cfg.groundY - 20, cfg.width, 40, p.layer2, 0.35).setScrollFactor(0.5);

  function pine(x, scale, color, scrollFactor) {
    const w = 70 * scale;
    const h = 150 * scale;
    const trunk = scene.add.rectangle(x, cfg.groundY - 6 * scale, 8 * scale, 16 * scale, 0x2a1f3a);
    trunk.setScrollFactor(scrollFactor);
    for (let t = 0; t < 3; t++) {
      const ty = cfg.groundY - h * 0.35 - t * h * 0.28;
      const tw = w * (1 - t * 0.22);
      scene.add.triangle(x, ty - h * 0.22, -tw / 2, h * 0.32, 0, -h * 0.1, tw / 2, h * 0.32, color).setScrollFactor(scrollFactor);
    }
  }

  for (let i = 0; i < tileCount(cfg.width, 260); i++) {
    pine(i * 260 + 70, 1.15, p.layer1, 0.3);
  }
  for (let i = 0; i < tileCount(cfg.width, 190); i++) {
    pine(i * 190 + 170, 0.8, p.layer2, 0.5);
  }
}

function drawDesert(scene, cfg, p) {
  scene.add.circle(cfg.width * 0.78, 65, 30, 0xffd9a0, 0.55).setScrollFactor(0.15);

  for (let i = 0; i < tileCount(cfg.width, 420); i++) {
    const dune = scene.add.ellipse(i * 420 + 120, cfg.groundY + 80, 560, 190, p.layer1);
    dune.setScrollFactor(0.25);
    const dune2 = scene.add.ellipse(i * 420 + 340, cfg.groundY + 100, 420, 150, p.layer2);
    dune2.setScrollFactor(0.45);
  }
  for (let i = 0; i < tileCount(cfg.width, 480); i++) {
    const cx = i * 480 + 260;
    const cactusColor = mixInto(p.layer2, 0x3a5f3a, 0.6);
    scene.add.rectangle(cx, cfg.groundY - 26, 12, 52, cactusColor).setScrollFactor(0.5);
    scene.add.rectangle(cx - 14, cfg.groundY - 36, 10, 22, cactusColor).setScrollFactor(0.5);
    scene.add.rectangle(cx + 14, cfg.groundY - 30, 10, 18, cactusColor).setScrollFactor(0.5);
  }
}

// tiny local mix, kept independent of color.js's Phaser-based one to avoid
// a circular/awkward import for one decorative use
function mixInto(a, b, t) {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bch = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bch;
}

export const LEVEL_THEMES = [
  {
    name: 'hills',
    sky: 0x1a1035,
    layer1: 0x2d1b56,
    layer2: 0x35205f,
    stone: 0x3a2a5c,
    stoneDark: 0x241542,
    stoneLight: 0x4a3570,
    draw: drawHills,
  },
  {
    name: 'mountains',
    sky: 0x131a30,
    layer1: 0x2a3554,
    layer2: 0x354469,
    stone: 0x3c4560,
    stoneDark: 0x262d42,
    stoneLight: 0x4e5a7c,
    draw: drawMountains,
  },
  {
    name: 'city',
    sky: 0x120f26,
    layer1: 0x241f3d,
    layer2: 0x2e2750,
    stone: 0x362f52,
    stoneDark: 0x201a38,
    stoneLight: 0x473c66,
    draw: drawCity,
  },
  {
    name: 'forest',
    sky: 0x0f1d1a,
    layer1: 0x1d3a2c,
    layer2: 0x264a37,
    stone: 0x33473a,
    stoneDark: 0x1d2b22,
    stoneLight: 0x445c4c,
    draw: drawForest,
  },
  {
    name: 'desert',
    sky: 0x2a1a2a,
    layer1: 0x6b4a4f,
    layer2: 0x7c5a52,
    stone: 0x6b5240,
    stoneDark: 0x3f3024,
    stoneLight: 0x8a6a4e,
    draw: drawDesert,
  },
];

export function getLevelTheme(levelIndex) {
  return LEVEL_THEMES[levelIndex % LEVEL_THEMES.length];
}
