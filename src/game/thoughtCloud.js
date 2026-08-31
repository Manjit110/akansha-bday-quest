import Phaser from 'phaser';

// A comic-style "thought cloud" -- a fluffy bubble with a trail of shrinking
// circles leading down to whoever's thinking it, used for the rescued
// squad's one-line reactions when the dragon fight opens (see BossScene's
// showBossQuotes). Sized to fit its own wrapped text rather than one fixed
// size, since some lines run far longer than others.
const WRAP_WIDTH = 132;
const PADDING_X = 10;
const PADDING_Y = 8;
const FONT_SIZE = 9;
const HOLD_MS = 6000;
const FADE_MS = 350;
const TRAIL_COUNT = 3;

// (x, headY) is the top of whoever's thinking it -- the cloud sits above
// that point, with the trail bridging the gap down to it.
export function createThoughtCloud(scene, x, headY, text) {
  const label = scene.add
    .text(0, 0, text, {
      fontFamily: 'Quicksand, sans-serif',
      fontSize: `${FONT_SIZE}px`,
      fontStyle: '600',
      color: '#2b1140',
      align: 'center',
      wordWrap: { width: WRAP_WIDTH },
    })
    .setOrigin(0.5);

  const w = label.width + PADDING_X * 2;
  const h = label.height + PADDING_Y * 2;
  const cloudY = headY - h / 2 - 20;

  const g = scene.add.graphics();
  g.fillStyle(0xfffaf0, 0.97);
  g.lineStyle(2, 0x2b1140, 0.35);
  const radius = Math.min(h / 2.2, 26);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
  // Bumps scattered around the perimeter so it reads as a fluffy cloud
  // instead of a flat dialog box.
  const bumps = [
    [-w / 2 + 2, -h / 2, h * 0.3],
    [w / 2 - 2, -h / 2, h * 0.28],
    [-w / 2, h / 2 - 2, h * 0.26],
    [w / 2, h / 2 - 2, h * 0.3],
    [0, -h / 2 + 1, h * 0.32],
    [0, h / 2 - 1, h * 0.3],
  ];
  bumps.forEach(([bx, by, r]) => {
    g.fillCircle(bx, by, r);
    g.strokeCircle(bx, by, r);
  });

  const container = scene.add.container(x, cloudY, [g, label]);
  container.setDepth(500);
  container.setAlpha(0);

  // The trail lives outside the container -- it bridges from the cloud's
  // own bottom edge down to (x, headY), a different anchor than the
  // cloud's centered origin.
  const bottomY = cloudY + h / 2;
  const trail = [];
  for (let i = 0; i < TRAIL_COUNT; i++) {
    const t = (i + 1) / (TRAIL_COUNT + 1);
    const cy = Phaser.Math.Linear(bottomY, headY, t);
    const r = Phaser.Math.Linear(6, 2, t);
    const c = scene.add.circle(x, cy, r, 0xfffaf0, 0.97);
    c.setStrokeStyle(1.5, 0x2b1140, 0.35);
    c.setDepth(500);
    c.setAlpha(0);
    trail.push(c);
  }

  const all = [container, ...trail];
  scene.tweens.add({ targets: all, alpha: 1, duration: 220, ease: 'Sine.easeOut' });
  scene.time.delayedCall(HOLD_MS, () => {
    scene.tweens.add({
      targets: all,
      alpha: 0,
      duration: FADE_MS,
      onComplete: () => all.forEach((o) => o.destroy()),
    });
  });

  return container;
}
