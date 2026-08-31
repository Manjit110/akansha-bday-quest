import Phaser from 'phaser';

// A comic-style "thought cloud" -- a fluffy bubble with a trail of shrinking
// circles leading down to whoever's thinking it. Used by LevelScene for the
// level's own friend reacting the moment their mini-boss first comes into
// view. Tracks `target` every frame rather than a fixed spot, since she's
// usually still running toward the fort gate while it's showing.
const WRAP_WIDTH = 190;
const PADDING_X = 14;
const PADDING_Y = 11;
const HOLD_MS = 6000;
const FADE_MS = 350;
const TRAIL_COUNT = 3;
const GAP_ABOVE_HEAD = 20;

// target: the game object to hover above (its .x/.y are read every frame).
// offsetY: how far above target.y its actual head sits (a negative number).
// fontSize: in px.
export function createThoughtCloud(scene, text, target, offsetY, fontSize) {
  const label = scene.add
    .text(0, 0, text, {
      fontFamily: 'Quicksand, sans-serif',
      fontSize: `${fontSize}px`,
      fontStyle: '600',
      color: '#2b1140',
      align: 'center',
      wordWrap: { width: WRAP_WIDTH },
    })
    .setOrigin(0.5);

  const w = label.width + PADDING_X * 2;
  const h = label.height + PADDING_Y * 2;

  const g = scene.add.graphics();
  g.fillStyle(0xfffaf0, 0.97);
  g.lineStyle(2, 0x2b1140, 0.35);
  const radius = Math.min(h / 2.2, 28);
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

  const container = scene.add.container(0, 0, [g, label]);
  container.setDepth(500);
  container.setAlpha(0);

  const trail = [];
  for (let i = 0; i < TRAIL_COUNT; i++) {
    const c = scene.add.circle(0, 0, Phaser.Math.Linear(7, 2, (i + 1) / (TRAIL_COUNT + 1)), 0xfffaf0, 0.97);
    c.setStrokeStyle(1.5, 0x2b1140, 0.35);
    c.setDepth(500);
    c.setAlpha(0);
    trail.push(c);
  }

  const reposition = () => {
    const headX = target.x;
    const headY = target.y + offsetY;
    const cloudY = headY - h / 2 - GAP_ABOVE_HEAD;
    container.setPosition(headX, cloudY);
    const bottomY = cloudY + h / 2;
    trail.forEach((c, i) => {
      c.setPosition(headX, Phaser.Math.Linear(bottomY, headY, (i + 1) / (TRAIL_COUNT + 1)));
    });
  };
  reposition();

  const all = [container, ...trail];
  // Tracks the target every frame for its whole lifetime -- both listeners
  // below are torn down together so a cloud that outlives its scene (a
  // fast level finish inside the 6s hold) can't keep ticking against a
  // player sprite that no longer exists.
  const updateHandler = () => reposition();
  scene.events.on('update', updateHandler);
  const cleanup = () => {
    scene.events.off('update', updateHandler);
    scene.events.off('shutdown', cleanup);
    all.forEach((o) => o.destroy());
  };
  scene.events.once('shutdown', cleanup);

  scene.tweens.add({ targets: all, alpha: 1, duration: 220, ease: 'Sine.easeOut' });
  scene.time.delayedCall(HOLD_MS, () => {
    scene.tweens.add({ targets: all, alpha: 0, duration: FADE_MS, onComplete: cleanup });
  });

  return container;
}
