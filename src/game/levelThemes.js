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

import { createAmbientSparkles } from './particles.js';

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

// A couple of very faint diagonal beams of light -- sun through jungle
// canopy, or desert glare -- one soft outer rectangle plus a thinner core,
// both barely-there alpha so they read as haze catching the light rather
// than a solid column. Placed within the initial viewport only, same
// constraint as glowOrb/drawClouds above.
function drawLightShafts(scene, cfg, color, scrollFactor, count) {
  for (let i = 0; i < count; i++) {
    const x = rand(150, 800);
    const angle = rand(9, 15);
    const beam = scene.add.rectangle(x, cfg.groundY - 300, rand(30, 46), 420, color, 0.018);
    beam.setScrollFactor(scrollFactor);
    beam.setAngle(angle);
    const core = scene.add.rectangle(x, cfg.groundY - 300, rand(10, 16), 420, color, 0.025);
    core.setScrollFactor(scrollFactor);
    core.setAngle(angle);
  }
}

// A jagged silhouette (dune ridge, mesa, distant hill) built from a hand-
// placed point path instead of a smooth primitive shape -- a plain ellipse
// or triangle reads as an icon, a slightly irregular ridge line reads as an
// actual landform.
function drawRidge(scene, cfg, baseX, spread, peakH, color, scrollFactor) {
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  const segments = 6;
  const points = [{ x: baseX - spread, y: cfg.groundY + 60 }];
  for (let s = 0; s <= segments; s++) {
    const t = s / segments;
    const dip = Math.sin(t * Math.PI) * peakH * rand(0.82, 1.08);
    points.push({ x: baseX - spread + t * spread * 2, y: cfg.groundY - dip });
  }
  points.push({ x: baseX + spread, y: cfg.groundY + 60 });
  g.fillPoints(points, true);
  g.setScrollFactor(scrollFactor);
  return g;
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
  glowOrb(scene, 780, 62, 24, 0xfbe8d3, 0.15);

  // a hazy, blurred-looking skyline well behind the real buildings -- flat
  // silhouettes with no windows and low alpha, so the eye reads it as miles
  // away rather than another row of the same buildings
  for (let i = 0; i < tileCount(cfg.width, 105); i++) {
    const bx = i * 105 + 50 + rand(-10, 10);
    const bh = 45 + ((i * 71) % 95) + rand(-10, 10);
    const shade = mixInto(p.skyHorizon, p.layer1, 0.6);
    scene.add.rectangle(bx, cfg.groundY - bh / 2, 55 + rand(-6, 6), bh, shade, 0.5).setScrollFactor(0.15);
  }

  for (let i = 0; i < tileCount(cfg.width, 150); i++) {
    const bx = i * 150 + 60 + rand(-12, 12);
    const bh = 90 + ((i * 61) % 140) + rand(-14, 14);
    const bw = 70 + ((i * 29) % 30) + rand(-6, 6);
    const shade = mixInto(p.layer1, 0x000000, rand(0, 0.12));
    const building = scene.add.rectangle(bx, cfg.groundY - bh / 2, bw, bh, shade);
    building.setScrollFactor(0.3);

    // a soft rim of light down one edge so the building reads as a lit
    // volume catching the skyline glow, not a flat cutout
    scene.add.rectangle(bx + bw / 2 - 2, cfg.groundY - bh / 2, 3, bh, mixInto(shade, 0xffffff, 0.22), 0.55).setScrollFactor(0.3);

    // rooftop clutter -- a mix of antenna/water-tower/vent instead of the
    // same two shapes on every roof
    const roofRoll = Math.random();
    if (roofRoll < 0.28) {
      const antenna = scene.add.rectangle(bx, cfg.groundY - bh - 14, 2, 28, mixInto(shade, 0x000000, 0.4));
      antenna.setScrollFactor(0.3);
      const beacon = scene.add.circle(bx, cfg.groundY - bh - 26, 2.5, 0xff5a5a, 0.9);
      beacon.setScrollFactor(0.3);
      scene.tweens.add({ targets: beacon, alpha: 0.15, duration: 700, yoyo: true, repeat: -1 });
    } else if (roofRoll < 0.5) {
      const legY = cfg.groundY - bh - 4;
      scene.add.rectangle(bx, legY, bw * 0.3, 14, mixInto(shade, 0x000000, 0.3)).setScrollFactor(0.3);
      scene.add.ellipse(bx, legY - 12, bw * 0.34, 16, mixInto(shade, 0x000000, 0.2)).setScrollFactor(0.3);
    } else if (roofRoll < 0.75) {
      scene.add.rectangle(bx + rand(-bw / 4, bw / 4), cfg.groundY - bh - 8, 10, 16, shade).setScrollFactor(0.3);
    }

    for (let wy = cfg.groundY - bh + 14; wy < cfg.groundY - 10; wy += 18) {
      for (let wx = bx - bw / 2 + 10; wx < bx + bw / 2 - 6; wx += 16) {
        if (((wx + wy) % 37) < 20) continue; // sparse, some windows dark
        const warm = Math.random() < 0.7;
        const win = scene.add.rectangle(wx, wy, 6, 8, warm ? 0xffd166 : 0x9fd8ff, warm ? 0.55 : 0.4);
        win.setScrollFactor(0.3);
        // a rare few windows flicker slowly, like someone's still up
        if (Math.random() < 0.05) {
          scene.tweens.add({ targets: win, alpha: 0.1, duration: 1500 + rand(0, 1200), yoyo: true, repeat: -1, delay: rand(0, 2000) });
        }
      }
    }
  }
  for (let i = 0; i < tileCount(cfg.width, 220); i++) {
    const bx = i * 220 + 140 + rand(-15, 15);
    const bh = 60 + ((i * 41) % 90) + rand(-10, 10);
    scene.add.rectangle(bx, cfg.groundY - bh / 2, 90, bh, mixInto(p.layer2, 0x000000, rand(0, 0.1))).setScrollFactor(0.5);
  }

  // street lamps along the sidewalk -- warm pools of light at ground level,
  // so the scene has a foreground and doesn't stop at the skyline
  for (let i = 0; i < tileCount(cfg.width, 260); i++) {
    const lx = i * 260 + 130 + rand(-20, 20);
    scene.add.rectangle(lx, cfg.groundY - 30, 3, 60, mixInto(p.layer2, 0x000000, 0.3)).setScrollFactor(0.55);
    glowOrb(scene, lx, cfg.groundY - 60, 6, 0xffd88a, 0.55);
  }

  // warm smog/light-pollution glow along the skyline, tying the buildings
  // into the horizon color instead of a hard silhouette cutoff
  drawHaze(scene, cfg, p.skyHorizon, 0.4);
}

function drawForest(scene, cfg, p) {
  drawSkyGradient(scene, cfg, p.skyTop, p.skyHorizon);
  glowOrb(scene, 220, 55, 18, 0xdff2e8, 0.12);
  drawLightShafts(scene, cfg, 0xfff3d0, 0.14, 3);

  // a fog-softened band of far canopy, well behind the real trees, so the
  // jungle reads as going back for miles instead of stopping at one tree line
  for (let i = 0; i < tileCount(cfg.width, 85); i++) {
    const bx = i * 85 + rand(-18, 18);
    const bh = 55 + rand(-10, 25);
    const mist = mixInto(p.skyHorizon, p.layer1, 0.55);
    scene.add.ellipse(bx, cfg.groundY - bh / 2, 120, bh, mist, 0.35).setScrollFactor(0.08);
  }

  // Broadleaf canopy trees -- several overlapping soft blobs per crown
  // instead of one stacked-triangle pine, since a single hard-edged cone
  // reads as a conifer icon rather than actual jungle foliage. A buttress
  // root flare + occasional hanging vine sell the "leaning into the canopy"
  // read.
  function canopyTree(x, scale, color, scrollFactor, lean) {
    const trunkH = 58 * scale;
    const trunkTopY = cfg.groundY - trunkH;
    const trunkShade = mixInto(color, 0x140d22, 0.55);
    scene.add.triangle(x, cfg.groundY, -16 * scale, 0, 0, -20 * scale, 16 * scale, 0, trunkShade).setScrollFactor(scrollFactor);
    const trunk = scene.add.rectangle(x + lean * 4, cfg.groundY - trunkH / 2, 9 * scale, trunkH, trunkShade);
    trunk.setScrollFactor(scrollFactor);
    trunk.setAngle(lean * 3);

    const canopyY = trunkTopY - 6 * scale;
    const blobCount = 5;
    for (let b = 0; b < blobCount; b++) {
      const angle = (b / blobCount) * Math.PI * 2;
      const bx2 = x + lean * 10 + Math.cos(angle) * 26 * scale;
      const by2 = canopyY - 10 * scale + Math.sin(angle) * 15 * scale;
      const shade = mixInto(color, Math.random() < 0.5 ? 0x0c1f14 : 0xdcefc8, rand(0.05, 0.22));
      scene.add.ellipse(bx2, by2, 48 * scale, 34 * scale, shade, 0.92).setScrollFactor(scrollFactor);
    }
    // top-lit highlight blob, catches the canopy light from above
    scene.add.ellipse(x + lean * 10 - 8 * scale, canopyY - 22 * scale, 32 * scale, 22 * scale, mixInto(color, 0xf3ffe0, 0.3), 0.75).setScrollFactor(scrollFactor);

    if (Math.random() < 0.4) {
      const vine = scene.add.graphics();
      vine.lineStyle(2, mixInto(color, 0x0c1f14, 0.5), 0.6);
      const vx = x + lean * 10 + rand(-20, 20) * scale;
      const vLen = rand(30, 68) * scale;
      vine.beginPath();
      vine.moveTo(vx, canopyY);
      vine.lineTo(vx + rand(-6, 6), canopyY + vLen * 0.5);
      vine.lineTo(vx + rand(-10, 10), canopyY + vLen);
      vine.strokePath();
      vine.setScrollFactor(scrollFactor);
    }
  }

  for (let i = 0; i < tileCount(cfg.width, 230); i++) {
    canopyTree(i * 230 + 70 + rand(-30, 30), 1.05 * rand(0.9, 1.15), p.layer1, 0.3, rand(-1, 1));
  }
  for (let i = 0; i < tileCount(cfg.width, 165); i++) {
    canopyTree(i * 165 + 150 + rand(-25, 25), 0.75 * rand(0.85, 1.1), p.layer2, 0.5, rand(-1, 1));
  }

  // ferns/undergrowth hugging the ground line, so the forest floor has
  // texture instead of a bare haze band
  for (let i = 0; i < tileCount(cfg.width, 38); i++) {
    if (Math.random() < 0.35) continue;
    const fx = i * 38 + rand(-12, 12);
    const fh = rand(10, 20);
    const shade = mixInto(p.layer2, 0x0c1f14, rand(0, 0.3));
    scene.add.triangle(fx, cfg.groundY, -7, 0, 0, -fh, 7, 0, shade).setScrollFactor(0.65);
  }

  drawHaze(scene, cfg, p.skyHorizon, 0.4);
  scene.add.rectangle(cfg.width / 2, cfg.groundY - 20, cfg.width, 40, p.layer2, 0.3).setScrollFactor(0.5);

  // fireflies drifting at canopy height -- a fixed warm palette (like the
  // room's own ambient sparkles) so they read against any friend-tinted sky
  createAmbientSparkles(scene, {
    x: 0,
    y: cfg.groundY - 220,
    width: cfg.width,
    height: 180,
    scrollFactor: 0.5,
    colors: [0xd9ff8a, 0xfff3b0],
  });
}

function drawDesert(scene, cfg, p) {
  drawSkyGradient(scene, cfg, p.skyTop, p.skyHorizon);
  glowOrb(scene, 680, 66, 32, 0xffe3ad, 0.15);
  drawLightShafts(scene, cfg, 0xffe6b8, 0.12, 2);

  // distant mesas, flat-topped and well behind the dunes, so the desert has
  // a horizon landmark instead of just rolling sand to infinity
  for (let i = 0; i < tileCount(cfg.width, 520); i++) {
    const mx = i * 520 + 220 + rand(-60, 60);
    const mh = rand(70, 120);
    const mw = rand(150, 230);
    const shade = mixInto(p.skyHorizon, p.layer1, 0.55);
    scene.add.rectangle(mx, cfg.groundY - mh / 2 + 12, mw, mh, shade, 0.55).setScrollFactor(0.12);
    scene.add.rectangle(mx, cfg.groundY - mh + 4, mw * 0.6, 12, shade, 0.55).setScrollFactor(0.12);
  }

  // dune ridges as a jagged wind-carved silhouette (drawRidge) instead of a
  // smooth ellipse, which read as a bubble rather than sand
  for (let i = 0; i < tileCount(cfg.width, 420); i++) {
    drawRidge(scene, cfg, i * 420 + 120 + rand(-30, 30), 260 * rand(0.9, 1.1), 120 * rand(0.85, 1.15), p.layer1, 0.25);
    drawRidge(scene, cfg, i * 420 + 320 + rand(-25, 25), 210 * rand(0.9, 1.1), 90 * rand(0.85, 1.15), p.layer2, 0.45);
  }

  // fine sand-ripple texture along the near dune crest
  for (let i = 0; i < tileCount(cfg.width, 55); i++) {
    const rx = i * 55 + rand(-10, 10);
    const ripple = scene.add.ellipse(rx, cfg.groundY - rand(0, 22), 42, 4, mixInto(p.layer2, 0xffffff, 0.1), 0.22);
    ripple.setScrollFactor(0.5);
  }

  // sun-bleached rocks scattered between the cacti, so it's not cactus-or-
  // nothing
  for (let i = 0; i < tileCount(cfg.width, 340); i++) {
    if (Math.random() < 0.5) continue;
    const rx = i * 340 + rand(50, 300);
    const rockShade = mixInto(p.layer2, 0x2a1f1c, 0.4);
    scene.add.ellipse(rx, cfg.groundY - 8, rand(20, 36), rand(12, 18), rockShade).setScrollFactor(0.5);
    scene.add.ellipse(rx + 9, cfg.groundY - 15, rand(10, 16), rand(8, 12), mixInto(rockShade, 0xffffff, 0.15)).setScrollFactor(0.5);
  }

  for (let i = 0; i < tileCount(cfg.width, 480); i++) {
    const cx = i * 480 + 260 + rand(-40, 40);
    const cactusColor = mixInto(p.layer2, 0x3a5f3a, 0.6 + rand(-0.1, 0.1));
    const s = rand(0.85, 1.15);
    scene.add.rectangle(cx, cfg.groundY - 26 * s, 12, 52 * s, cactusColor).setScrollFactor(0.5);
    if (Math.random() < 0.8) scene.add.rectangle(cx - 14, cfg.groundY - 36 * s, 10, 22 * s, cactusColor).setScrollFactor(0.5);
    if (Math.random() < 0.8) scene.add.rectangle(cx + 14, cfg.groundY - 30 * s, 10, 18 * s, cactusColor).setScrollFactor(0.5);
    // a thin rim-lit edge so the cactus reads as a lit 3D form, not a flat cutout
    scene.add.rectangle(cx - 3, cfg.groundY - 26 * s, 2, 44 * s, mixInto(cactusColor, 0xffffff, 0.3), 0.5).setScrollFactor(0.5);
  }

  drawHaze(scene, cfg, p.skyHorizon, 0.45);
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
