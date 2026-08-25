// Draws small humanoid placeholder sprites (head + torso + legs) onto the
// scene's texture manager, so the player/enemies read as "little people"
// rather than flat boxes. Pure Graphics-drawn, no image assets needed.

export const HERO_SIZE = { width: 30, height: 46 };
export const IMP_SIZE = { width: 26, height: 34 };

export function ensureHeroTexture(scene, key = 'hero') {
  if (scene.textures.exists(key)) return;
  const { width: w, height: h } = HERO_SIZE;
  const g = scene.add.graphics();

  g.fillStyle(0x6a4fa0, 1);
  g.fillRoundedRect(w / 2 - 9, h - 15, 7, 15, 3);
  g.fillRoundedRect(w / 2 + 2, h - 15, 7, 15, 3);

  g.fillStyle(0xffb703, 1);
  g.fillRoundedRect(w / 2 - 11, h - 33, 22, 21, 7);

  g.fillStyle(0xffd166, 1);
  g.fillCircle(w / 2, h - 36, 10);

  g.fillStyle(0x2b1140, 1);
  g.fillCircle(w / 2 - 4, h - 37, 1.5);
  g.fillCircle(w / 2 + 4, h - 37, 1.5);

  g.generateTexture(key, w, h);
  g.destroy();
}

export function ensureImpTexture(scene, key = 'imp') {
  if (scene.textures.exists(key)) return;
  const { width: w, height: h } = IMP_SIZE;
  const g = scene.add.graphics();

  g.fillStyle(0x8a1f3d, 1);
  g.fillRoundedRect(w / 2 - 7, h - 11, 6, 11, 2);
  g.fillRoundedRect(w / 2 + 1, h - 11, 6, 11, 2);

  g.fillStyle(0xff6b6b, 1);
  g.fillRoundedRect(w / 2 - 10, h - 25, 20, 17, 6);

  g.fillStyle(0xff8f8f, 1);
  g.fillCircle(w / 2, h - 26, 8);

  // angry eyebrows
  g.lineStyle(2, 0x2b1140, 1);
  g.lineBetween(w / 2 - 6, h - 29, w / 2 - 2, h - 27);
  g.lineBetween(w / 2 + 6, h - 29, w / 2 + 2, h - 27);

  g.generateTexture(key, w, h);
  g.destroy();
}

// Call each frame to keep a physics sprite feeling alive: faces its
// direction of travel and gets a light squash/stretch while walking/airborne.
export function animateHumanoid(sprite, { onGround, time }) {
  const vx = sprite.body.velocity.x;
  const vy = sprite.body.velocity.y;

  if (vx < -5) sprite.setFlipX(true);
  else if (vx > 5) sprite.setFlipX(false);

  if (!onGround) {
    const stretch = vy < 0 ? 1 : -1;
    sprite.setScale(1 - stretch * 0.08, 1 + stretch * 0.08);
  } else if (Math.abs(vx) > 5) {
    const wobble = Math.sin(time * 0.02) * 0.06;
    sprite.setScale(1 - wobble, 1 + wobble);
  } else {
    sprite.setScale(1, 1);
  }
}
