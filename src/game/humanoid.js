// Draws small humanoid placeholder sprites (head + torso + arms + legs) onto
// the scene's texture manager, with a simple 2-frame walk cycle, so the
// player/enemies read as little people rather than flat boxes. Pure
// Graphics-drawn, no image assets needed.

export const HERO_SIZE = { width: 36, height: 54 };
export const IMP_SIZE = { width: 30, height: 42 };

function drawFigure(g, { w, h, skin, torso, armColor, legColor, step, angry }) {
  const cx = w / 2;
  const headR = w * 0.3;
  const headCy = headR + 2;
  const torsoTop = headCy + headR - 2;
  const torsoH = h * 0.38;
  const torsoW = w * 0.5;
  const torsoBottom = torsoTop + torsoH;
  const armW = w * 0.2;
  const armH = h * 0.32;
  const legW = w * 0.24;
  const legH = h - torsoBottom - 2;

  // step swings limbs in opposite pairs: -1 / 0 / 1
  const swing = step * (h * 0.06);

  // back arm + leg first so the front pair overlaps them
  g.fillStyle(armColor, 1);
  g.fillRoundedRect(cx + torsoW / 2 - armW * 0.35, torsoTop + 2 - swing, armW, armH, armW / 2);
  g.fillStyle(legColor, 1);
  g.fillRoundedRect(cx + torsoW * 0.16, torsoBottom - 2 + swing, legW, legH, legW / 2);

  // torso
  g.fillStyle(torso, 1);
  g.fillRoundedRect(cx - torsoW / 2, torsoTop, torsoW, torsoH, torsoW * 0.3);

  // front leg + arm
  g.fillStyle(legColor, 1);
  g.fillRoundedRect(cx - torsoW * 0.16 - legW, torsoBottom - 2 - swing, legW, legH, legW / 2);
  g.fillStyle(armColor, 1);
  g.fillRoundedRect(cx - torsoW / 2 - armW * 0.65, torsoTop + 2 + swing, armW, armH, armW / 2);

  // head
  g.fillStyle(skin, 1);
  g.fillCircle(cx, headCy, headR);

  g.fillStyle(0x2b1140, 1);
  if (angry) {
    g.lineStyle(Math.max(1.5, w * 0.05), 0x2b1140, 1);
    g.lineBetween(cx - headR * 0.5, headCy - headR * 0.15, cx - headR * 0.15, headCy + headR * 0.05);
    g.lineBetween(cx + headR * 0.5, headCy - headR * 0.15, cx + headR * 0.15, headCy + headR * 0.05);
  } else {
    g.fillCircle(cx - headR * 0.35, headCy - headR * 0.05, Math.max(1.2, w * 0.045));
    g.fillCircle(cx + headR * 0.35, headCy - headR * 0.05, Math.max(1.2, w * 0.045));
  }
}

function buildWalkFrames(scene, baseKey, size, colors) {
  const { width: w, height: h } = size;
  ['idle', 'step-a', 'step-b'].forEach((suffix, i) => {
    const key = `${baseKey}-${suffix}`;
    if (scene.textures.exists(key)) return;
    const g = scene.add.graphics();
    const step = i === 0 ? 0 : i === 1 ? 1 : -1;
    drawFigure(g, { w, h, step, ...colors });
    g.generateTexture(key, w, h);
    g.destroy();
  });
}

export function ensureHeroTexture(scene, baseKey = 'hero') {
  buildWalkFrames(scene, baseKey, HERO_SIZE, {
    skin: 0xffd9a0,
    torso: 0xffb703,
    armColor: 0xffd9a0,
    legColor: 0x3a86ff,
    angry: false,
  });
}

export function ensureImpTexture(scene, baseKey = 'imp') {
  buildWalkFrames(scene, baseKey, IMP_SIZE, {
    skin: 0xff8f8f,
    torso: 0xff6b6b,
    armColor: 0xff8f8f,
    legColor: 0x9d0208,
    angry: true,
  });
}

// Call each frame to keep a physics sprite feeling alive: faces its
// direction of travel, steps through a 2-frame walk cycle on the ground,
// and gets a light squash/stretch while airborne.
export function animateHumanoid(sprite, { onGround, time, baseKey }) {
  const vx = sprite.body.velocity.x;
  const vy = sprite.body.velocity.y;

  if (vx < -5) sprite.setFlipX(true);
  else if (vx > 5) sprite.setFlipX(false);

  if (!onGround) {
    const stretch = vy < 0 ? 1 : -1;
    sprite.setScale(1 - stretch * 0.08, 1 + stretch * 0.08);
    sprite.setTexture(`${baseKey}-idle`);
  } else if (Math.abs(vx) > 5) {
    sprite.setScale(1, 1);
    const frame = Math.floor(time / 130) % 2 === 0 ? 'step-a' : 'step-b';
    sprite.setTexture(`${baseKey}-${frame}`);
  } else {
    sprite.setScale(1, 1);
    sprite.setTexture(`${baseKey}-idle`);
  }
}
