// Five background environments, cycling by level index, so 19 levels don't
// all share one reused backdrop. Each theme draws its own sky gradient,
// horizon glow, and parallax layers, and hands back a stone palette the
// fort gate (same structure on every level) tints itself with, so the fort
// feels like it belongs to its biome.
//
// Kept deliberately away from a single flat sky color + perfectly evenly
// spaced repeated shapes -- that reads as a mechanical tiled stamp rather
// than a place. Every layer here either gets a gradient, a soft glow, or
// some per-shape jitter so nothing repeats identically.

function tileCount(width, spacing) {
  return Math.ceil(width / spacing) + 1;
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

// Local hex mixer, kept independent of color.js's Phaser-based one to avoid
// a circular/awkward import for decorative one-offs.
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

// A real vertical gradient built from stacked bands rather than Graphics'
// fillGradientStyle, which is WebGL-only and renders wrong under Phaser's
// Canvas fallback -- this looks identical either way. Fixed to the camera
// (scrollFactor 0) since the sky itself doesn't parallax.
export function drawSkyGradient(scene, cfg, topColor, horizonColor) {
  const bands = 22;
  const h = cfg.groundY + 30;
  const bandH = h / bands;
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    const color = mixInto(topColor, horizonColor, t * t); // t^2: holds the deep tone longer, warms up fast near the horizon
    scene.add.rectangle(480, i * bandH + bandH / 2, 960, bandH + 1, color).setScrollFactor(0);
  }
}

// A soft glowing orb (moon/sun) built from fading rings instead of one flat
// circle, which reads as a sticker pasted on the sky.
function glowOrb(scene, x, y, r, color, scrollFactor) {
  for (let i = 3; i >= 1; i--) {
    scene.add.circle(x, y, r + i * 9, color, 0.1).setScrollFactor(scrollFactor);
  }
  scene.add.circle(x, y, r, color, 0.95).setScrollFactor(scrollFactor);
  scene.add.circle(x - r * 0.25, y - r * 0.25, r * 0.4, 0xffffff, 0.25).setScrollFactor(scrollFactor);
}

// A few soft, drifting cloud blobs so the sky has some life instead of
// being static.
function drawClouds(scene, cfg, color, scrollFactor, count) {
  // Spread across the initial ~960px viewport, not the (much wider) level
  // width -- with a scrollFactor this low an object barely moves as the
  // camera scrolls, so anything placed further out just never comes into
  // view. This is atmosphere, not level geometry; it doesn't need to
  // populate the whole level the way the tiled terrain below does.
  for (let i = 0; i < count; i++) {
    const cx = rand(40, 920);
    const cy = rand(35, 120);
    const group = [];
    for (let b = 0; b < 3; b++) {
      const blob = scene.add.ellipse(cx + b * 22 - 22, cy + (b === 1 ? -6 : 4), 56 - b * 8, 26 - b * 5, color, 0.3);
      blob.setScrollFactor(scrollFactor);
      group.push(blob);
    }
    scene.tweens.add({ targets: group, x: '+=16', duration: 6000 + rand(0, 4000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
}

// A soft haze band where the terrain meets the sky -- fades the ground
// layer's own color upward into transparency, instead of a hard color seam.
function drawHaze(scene, cfg, color, scrollFactor) {
  const bands = 10;
  const bandTopY = cfg.groundY - 170;
  const bandH = 170 / bands;
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    scene.add.rectangle(cfg.width / 2, bandTopY + i * bandH + bandH / 2, cfg.width, bandH + 1, color, t * 0.35).setScrollFactor(scrollFactor);
  }
}

function drawHills(scene, cfg, p) {
  drawSkyGradient(scene, cfg, p.skyTop, p.skyHorizon);
  drawClouds(scene, cfg, 0xfff0e6, 0.15, 4);

  for (let i = 0; i < tileCount(cfg.width, 400); i++) {
    const jH = rand(0.85, 1.2);
    const jY = rand(-18, 18);
    const hill = scene.add.ellipse(i * 400 + 100 + rand(-30, 30), cfg.groundY + 60 + jY, 500 * jH, 220 * jH, p.layer1);
    hill.setScrollFactor(0.25);
    const jH2 = rand(0.85, 1.15);
    const hill2 = scene.add.ellipse(i * 400 + 300 + rand(-25, 25), cfg.groundY + 90 + rand(-15, 15), 400 * jH2, 180 * jH2, p.layer2);
    hill2.setScrollFactor(0.45);
  }

  drawHaze(scene, cfg, p.skyHorizon, 0.45);

  // small friend-colored wildflowers dotting the near hillside, for a
  // personal touch that isn't just terrain
  for (let i = 0; i < tileCount(cfg.width, 55); i++) {
    if (Math.random() < 0.4) continue;
    const fx = i * 55 + rand(-15, 15);
    const stem = scene.add.rectangle(fx, cfg.groundY - 4, 2, 10, mixInto(p.layer2, 0x1a1035, 0.3));
    stem.setScrollFactor(0.6);
    const bloom = scene.add.circle(fx, cfg.groundY - 10, 3.5, p.accent, 0.85);
    bloom.setScrollFactor(0.6);
  }
}

// Phaser's add.triangle(x, y, x1, y1, x2, y2, x3, y3, ...) takes x/y as the
// object's world anchor and x1..y3 as vertex points LOCAL to that anchor,
// not absolute world coordinates -- passing world coords for the vertices
// (an earlier version of this file did) silently renders the shape far
// outside the visible area instead of erroring.
function drawMountains(scene, cfg, p) {
  drawSkyGradient(scene, cfg, p.skyTop, p.skyHorizon);
  // A low scrollFactor only slows an object's drift as the camera scrolls
  // -- it does NOT rescale its starting position, so this has to be placed
  // within the initial ~960px viewport, not at a fraction of the (much
  // wider) level width, or it renders off-screen from the start.
  glowOrb(scene, 700, 75, 22, 0xf4ecff, 0.15);
  drawClouds(scene, cfg, 0xc9d6ff, 0.2, 3);

  for (let i = 0; i < tileCount(cfg.width, 420); i++) {
    const bx = i * 420 + 80 + rand(-25, 25);
    const peakH = 150 + ((i * 53) % 90) + rand(-15, 15);
    const farShade = mixInto(p.layer1, 0xffffff, rand(0, 0.08));
    const far = scene.add.triangle(bx, cfg.groundY, -190, 0, 40, -peakH, 210, 0, farShade);
    far.setScrollFactor(0.2);
    scene.add.triangle(bx + 20, cfg.groundY - peakH - 6, -36, 30, 0, -28, 34, 30, 0xe8ecf5, 0.55).setScrollFactor(0.2);

    const nx = bx + 180;
    const peakH2 = 110 + ((i * 37) % 60) + rand(-10, 10);
    const nearShade = mixInto(p.layer2, 0x000000, rand(0, 0.1));
    const near = scene.add.triangle(nx, cfg.groundY, -160, 0, 30, -peakH2, 170, 0, nearShade);
    near.setScrollFactor(0.4);
  }

  drawHaze(scene, cfg, p.skyHorizon, 0.35);
}

function drawCity(scene, cfg, p) {
  drawSkyGradient(scene, cfg, p.skyTop, p.skyHorizon);
  glowOrb(scene, 780, 65, 24, 0xfbe8d3, 0.15);

  for (let i = 0; i < tileCount(cfg.width, 150); i++) {
    const bx = i * 150 + 60 + rand(-12, 12);
    const bh = 90 + ((i * 61) % 140) + rand(-14, 14);
    const bw = 70 + ((i * 29) % 30) + rand(-6, 6);
    const shade = mixInto(p.layer1, 0x000000, rand(0, 0.12));
    const building = scene.add.rectangle(bx, cfg.groundY - bh / 2, bw, bh, shade);
    building.setScrollFactor(0.3);

    // a little rooftop clutter so the skyline silhouette isn't just boxes
    if (Math.random() < 0.6) {
      scene.add.rectangle(bx + rand(-bw / 4, bw / 4), cfg.groundY - bh - 8, 10, 16, shade).setScrollFactor(0.3);
    }
    if (Math.random() < 0.4) {
      scene.add.rectangle(bx, cfg.groundY - bh - 18, 2, 20, mixInto(shade, 0x000000, 0.4)).setScrollFactor(0.3);
    }

    for (let wy = cfg.groundY - bh + 14; wy < cfg.groundY - 10; wy += 18) {
      for (let wx = bx - bw / 2 + 10; wx < bx + bw / 2 - 6; wx += 16) {
        if (((wx + wy) % 37) < 20) continue; // sparse, some windows dark
        const warm = Math.random() < 0.7;
        scene.add.rectangle(wx, wy, 6, 8, warm ? 0xffd166 : 0x9fd8ff, warm ? 0.55 : 0.4).setScrollFactor(0.3);
      }
    }
  }
  for (let i = 0; i < tileCount(cfg.width, 220); i++) {
    const bx = i * 220 + 140 + rand(-15, 15);
    const bh = 60 + ((i * 41) % 90) + rand(-10, 10);
    scene.add.rectangle(bx, cfg.groundY - bh / 2, 90, bh, mixInto(p.layer2, 0x000000, rand(0, 0.1))).setScrollFactor(0.5);
  }

  // warm smog/light-pollution glow along the skyline, tying the buildings
  // into the horizon color instead of a hard silhouette cutoff
  drawHaze(scene, cfg, p.skyHorizon, 0.4);
}

function drawForest(scene, cfg, p) {
  drawSkyGradient(scene, cfg, p.skyTop, p.skyHorizon);
  glowOrb(scene, 220, 60, 18, 0xdff2e8, 0.12);

  function pine(x, scale, color, scrollFactor) {
    const w = 70 * scale;
    const h = 150 * scale;
    const shade = mixInto(color, Math.random() < 0.5 ? 0x000000 : 0xffffff, rand(0, 0.1));
    const trunk = scene.add.rectangle(x, cfg.groundY - 6 * scale, 8 * scale, 16 * scale, 0x2a1f3a);
    trunk.setScrollFactor(scrollFactor);
    for (let t = 0; t < 3; t++) {
      const ty = cfg.groundY - h * 0.35 - t * h * 0.28;
      const tw = w * (1 - t * 0.22);
      scene.add.triangle(x, ty - h * 0.22, -tw / 2, h * 0.32, 0, -h * 0.1, tw / 2, h * 0.32, shade).setScrollFactor(scrollFactor);
    }
  }

  for (let i = 0; i < tileCount(cfg.width, 260); i++) {
    pine(i * 260 + 70 + rand(-30, 30), 1.15 * rand(0.9, 1.1), p.layer1, 0.3);
  }
  for (let i = 0; i < tileCount(cfg.width, 190); i++) {
    pine(i * 190 + 170 + rand(-25, 25), 0.8 * rand(0.85, 1.15), p.layer2, 0.5);
  }

  drawHaze(scene, cfg, p.skyHorizon, 0.4);
  scene.add.rectangle(cfg.width / 2, cfg.groundY - 20, cfg.width, 40, p.layer2, 0.3).setScrollFactor(0.5);
}

function drawDesert(scene, cfg, p) {
  drawSkyGradient(scene, cfg, p.skyTop, p.skyHorizon);
  glowOrb(scene, 680, 68, 30, 0xffdca0, 0.15);

  for (let i = 0; i < tileCount(cfg.width, 420); i++) {
    const jH = rand(0.85, 1.15);
    const dune = scene.add.ellipse(i * 420 + 120 + rand(-30, 30), cfg.groundY + 80, 560 * jH, 190 * jH, p.layer1);
    dune.setScrollFactor(0.25);
    const dune2 = scene.add.ellipse(i * 420 + 340 + rand(-25, 25), cfg.groundY + 100, 420 * rand(0.85, 1.1), 150, p.layer2);
    dune2.setScrollFactor(0.45);
  }
  for (let i = 0; i < tileCount(cfg.width, 480); i++) {
    const cx = i * 480 + 260 + rand(-40, 40);
    const cactusColor = mixInto(p.layer2, 0x3a5f3a, 0.6 + rand(-0.1, 0.1));
    const s = rand(0.85, 1.15);
    scene.add.rectangle(cx, cfg.groundY - 26 * s, 12, 52 * s, cactusColor).setScrollFactor(0.5);
    if (Math.random() < 0.8) scene.add.rectangle(cx - 14, cfg.groundY - 36 * s, 10, 22 * s, cactusColor).setScrollFactor(0.5);
    if (Math.random() < 0.8) scene.add.rectangle(cx + 14, cfg.groundY - 30 * s, 10, 18 * s, cactusColor).setScrollFactor(0.5);
  }

  drawHaze(scene, cfg, p.skyHorizon, 0.4);
}

export const LEVEL_THEMES = [
  {
    name: 'hills',
    sky: 0x1a1035,
    skyHorizon: 0x6b3f66,
    layer1: 0x2d1b56,
    layer2: 0x35205f,
    stone: 0x3a2a5c,
    stoneDark: 0x241542,
    stoneLight: 0x4a3570,
    draw: drawHills,
  },
  {
    name: 'mountains',
    sky: 0x0d1226,
    skyHorizon: 0x3d4d75,
    layer1: 0x2a3554,
    layer2: 0x354469,
    stone: 0x3c4560,
    stoneDark: 0x262d42,
    stoneLight: 0x4e5a7c,
    draw: drawMountains,
  },
  {
    name: 'city',
    sky: 0x0f0c22,
    skyHorizon: 0x5a2f52,
    layer1: 0x241f3d,
    layer2: 0x2e2750,
    stone: 0x362f52,
    stoneDark: 0x201a38,
    stoneLight: 0x473c66,
    draw: drawCity,
  },
  {
    name: 'forest',
    sky: 0x081713,
    skyHorizon: 0x274a3c,
    layer1: 0x1d3a2c,
    layer2: 0x264a37,
    stone: 0x33473a,
    stoneDark: 0x1d2b22,
    stoneLight: 0x445c4c,
    draw: drawForest,
  },
  {
    name: 'desert',
    sky: 0x1c1230,
    skyHorizon: 0x8a4a4a,
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
