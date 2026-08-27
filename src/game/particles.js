import Phaser from 'phaser';

// A soft glowing dot, reused for both the slow ambient drift in levels/rooms
// and the little burst that accompanies a card reveal.
export function ensureSparkleTexture(scene, key = 'sparkle') {
  if (scene.textures.exists(key)) return;
  const g = scene.add.graphics();
  g.fillStyle(0xffffff, 1);
  g.fillCircle(4, 4, 4);
  g.generateTexture(key, 8, 8);
  g.destroy();
}

// A gentle, low-density drift of glowing particles across a rectangular
// area -- meant to sit quietly in the background, not draw attention.
export function createAmbientSparkles(scene, { x = 0, y = 0, width, height, scrollFactor = 1, colors = [0xffd166, 0xff8fab, 0xffffff] } = {}) {
  ensureSparkleTexture(scene);
  const emitter = scene.add.particles(0, 0, 'sparkle', {
    emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(x, y, width, height) },
    lifespan: { min: 2600, max: 4600 },
    speedX: { min: -6, max: 6 },
    speedY: { min: -16, max: -6 },
    scale: { start: 0.5, end: 0 },
    alpha: { start: 0.85, end: 0 },
    tint: colors,
    frequency: 380,
    quantity: 1,
  });
  emitter.setScrollFactor(scrollFactor);
  return emitter;
}
