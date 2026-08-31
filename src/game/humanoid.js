// Draws small humanoid placeholder sprites (head + torso + arms + legs,
// optionally a party hat) onto the scene's texture manager, with a simple
// 2-frame walk cycle, so the player/enemies read as little people rather
// than flat boxes. Pure Graphics-drawn, no image assets needed.
//
// The hero figure comes in two builds -- a broad-shouldered commando taper
// for 'male' and a fitted hourglass taper with a ponytail for 'female'
// (see drawTorso/drawHair below), closer to an 8-bit run-and-gun hero than
// the old one-size-fits-all blob. Regular enemies (ensureImpTexture) don't
// pass a gender and keep the plain original silhouette -- they're monsters,
// not friends, so there's nothing to differentiate.
export const HERO_SIZE = { width: 36, height: 68, topMargin: 16 };
export const IMP_SIZE = { width: 30, height: 42, topMargin: 2 };

const BOOT_COLOR = 0x2b2320;
const HAIR_COLOR = 0x3a2416;

// Matches the head circle drawFigure() draws, so a photo overlay can be
// positioned/sized to sit exactly on top of it.
export function headGeometry(size) {
  const headR = size.width * 0.3;
  const headCy = headR + size.topMargin;
  return { radius: headR - 1, offsetY: headCy - size.height / 2 };
}

function drawPartyHat(g, cx, headCy, headR) {
  const baseY = headCy - headR * 0.55;
  const apexX = cx + headR * 0.15;
  const apexY = headCy - headR * 1.9;
  g.fillStyle(0xff8fab, 1);
  g.fillTriangle(cx - headR * 0.8, baseY, cx + headR * 0.85, baseY, apexX, apexY);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(cx - headR * 0.2, baseY - headR * 0.4, headR * 0.12);
  g.fillCircle(cx + headR * 0.15, baseY - headR * 0.8, headR * 0.1);
  g.fillStyle(0xffd166, 1);
  g.fillCircle(apexX, apexY, headR * 0.22);
}

// Broad, square shoulders tapering to a narrower waist for 'male' (the
// classic run-and-gun commando V-shape); a fitted top tapering in at the
// waist then back out at the hip for 'female'. Anything else (regular
// enemies) keeps the original plain rounded block.
function drawTorso(g, { cx, torsoTop, torsoH, torsoW, color, gender }) {
  g.fillStyle(color, 1);
  if (gender === 'male') {
    const shoulderW = torsoW * 1.3;
    const waistW = torsoW * 0.82;
    g.fillPoints(
      [
        { x: cx - shoulderW / 2, y: torsoTop },
        { x: cx + shoulderW / 2, y: torsoTop },
        { x: cx + waistW / 2, y: torsoTop + torsoH },
        { x: cx - waistW / 2, y: torsoTop + torsoH },
      ],
      true
    );
  } else if (gender === 'female') {
    const shoulderW = torsoW * 0.95;
    const waistW = torsoW * 0.6;
    const hipW = torsoW * 0.88;
    const waistY = torsoTop + torsoH * 0.55;
    g.fillPoints(
      [
        { x: cx - shoulderW / 2, y: torsoTop },
        { x: cx + shoulderW / 2, y: torsoTop },
        { x: cx + waistW / 2, y: waistY },
        { x: cx + hipW / 2, y: torsoTop + torsoH },
        { x: cx - hipW / 2, y: torsoTop + torsoH },
        { x: cx - waistW / 2, y: waistY },
      ],
      true
    );
  } else {
    g.fillRoundedRect(cx - torsoW / 2, torsoTop, torsoW, torsoH, torsoW * 0.3);
  }
}

// A ponytail, drawn before the head circle so the head paints over its
// base and it only reads as trailing out from behind -- the one gendered
// detail that survives even the oversized face-photo overlay, since it
// sits outside the head's own circle radius. Swings a little with her
// stride via the same `swing` the limbs use.
function drawHair(g, { cx, headCy, headR, swing }) {
  // Only the "root" corner sits inside the head circle's radius (tucked
  // under it, so the head paints over just that corner) -- the other three
  // corners land outside it, so most of this shape survives and actually
  // reads as hair swooping out from behind the head rather than getting
  // swallowed entirely.
  g.fillStyle(HAIR_COLOR, 1);
  g.fillPoints(
    [
      { x: cx + headR * 0.7, y: headCy - headR * 0.6 }, // root, near the crown
      { x: cx + headR * 1.4, y: headCy + headR * 0.1 }, // outer bulge
      { x: cx + headR * 0.9 + swing * 0.4, y: headCy + headR * 2.3 }, // tip, past the shoulder
      { x: cx + headR * 0.35, y: headCy + headR * 0.35 }, // inner tuck, under the head
    ],
    true
  );
}

// Graphics.save()/translateCanvas()/rotateCanvas() turned out unreliable
// for this under the WebGL renderer (Phaser.AUTO resolves to it here) --
// legs and arms drawn through that pivot rendered collapsed/misplaced
// instead of actually rotating. Plain trigonometry + fillPoints (already
// used for the torso taper above, and known-good there) sidesteps it
// entirely: rotate each corner by hand around the hip/shoulder point.
function rotatePoint(originX, originY, angle, localX, localY) {
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  return { x: originX + localX * cosA - localY * sinA, y: originY + localX * sinA + localY * cosA };
}

// A width-wide, (y0->y1)-long rectangle, rotated by `angle` around
// (originX, originY) -- (0,0) in local space is that pivot, +y runs along
// the limb away from the body, matching how a hip/shoulder joint actually
// swings.
function rotatedRect(originX, originY, angle, width, y0, y1) {
  const hw = width / 2;
  return [
    rotatePoint(originX, originY, angle, -hw, y0),
    rotatePoint(originX, originY, angle, hw, y0),
    rotatePoint(originX, originY, angle, hw, y1),
    rotatePoint(originX, originY, angle, -hw, y1),
  ];
}

function drawLeg(g, { hipX, hipY, angle, legLen, legW, bootH, color }) {
  g.fillStyle(color, 1);
  g.fillPoints(rotatedRect(hipX, hipY, angle, legW, 0, legLen), true);
  g.fillStyle(BOOT_COLOR, 1);
  g.fillPoints(rotatedRect(hipX, hipY, angle, legW, legLen - bootH, legLen), true);
}

function drawArm(g, { shoulderX, shoulderY, angle, armLen, armW, color, bicep }) {
  g.fillStyle(color, 1);
  g.fillPoints(rotatedRect(shoulderX, shoulderY, angle, armW, 0, armLen), true);
  if (bicep) {
    const c = rotatePoint(shoulderX, shoulderY, angle, 0, armW * 0.6);
    g.fillCircle(c.x, c.y, armW * 0.62);
  }
}

// How far the stride/pump swings each step -- big enough to read as an
// actual run at this tiny size, not just a flicker.
const STRIDE_ANGLE = 0.5;
const PUMP_ANGLE = 0.55;
// The gun arm holds this same forward angle in every frame, idle included
// -- constantly aimed and ready, the one clearly "FPS/run-and-gun" detail
// that doesn't depend on the animation frame at all.
const GUN_ARM_ANGLE = 0.55;

function drawFigure(g, size, { skin, torso, armColor, legColor, step, angry, hat, gender }) {
  const { width: w, height: h, topMargin } = size;
  const cx = w / 2;
  const headR = w * 0.3;
  const headCy = headR + topMargin;
  const torsoTop = headCy + headR - 2;
  // Slimmer torso fraction than the original (h*0.32) to free up more
  // height for the legs below -- the old proportions left them only ~13%
  // of the figure's total height, barely enough to read as legs at all,
  // let alone stride through a real pose.
  const torsoH = h * 0.27;
  const torsoW = w * 0.5;
  const torsoBottom = torsoTop + torsoH;
  // Male reads bulkier through the arms (a small deltoid bump added below);
  // female stays leaner. Legs mirror the same difference, a touch slimmer
  // for female, and both get a dark boot cap instead of the old flat
  // single-color leg.
  const armW = w * (gender === 'male' ? 0.24 : gender === 'female' ? 0.17 : 0.2);
  const armLen = h * 0.22;
  const legW = w * (gender === 'male' ? 0.25 : gender === 'female' ? 0.2 : 0.24);
  const legLen = h - torsoBottom - 2;
  const bootH = Math.max(3, legLen * 0.22);
  const bicep = gender === 'male';

  const hipY = torsoBottom - 2;
  const hipRightX = cx + torsoW * 0.22;
  const hipLeftX = cx - torsoW * 0.22;
  const shoulderY = torsoTop + 3;
  const shoulderRightX = cx + torsoW * 0.42;
  const shoulderLeftX = cx - torsoW * 0.42;

  // back (right-side) leg, then torso, then front (left-side) leg overlaps
  // it -- opposite phase from the right leg for an actual alternating gait.
  drawLeg(g, { hipX: hipRightX, hipY, angle: step * STRIDE_ANGLE, legLen, legW, bootH, color: legColor });

  drawTorso(g, { cx, torsoTop, torsoH, torsoW, color: torso, gender });

  drawLeg(g, { hipX: hipLeftX, hipY, angle: -step * STRIDE_ANGLE, legLen, legW, bootH, color: legColor });

  // Off-hand pumps opposite the gun arm, in phase with the back leg, like a
  // real running counterbalance. Biased away from the gun arm's fixed
  // forward angle (GUN_ARM_ANGLE) so the two don't run near-parallel and
  // blur into one shape, which is what a small idle-forward lean did.
  drawArm(g, {
    shoulderX: shoulderLeftX,
    shoulderY,
    angle: -0.15 + step * PUMP_ANGLE,
    armLen,
    armW,
    color: armColor,
    bicep,
  });

  if (gender === 'female') drawHair(g, { cx, headCy, headR, swing: step });

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

  if (hat) drawPartyHat(g, cx, headCy, headR);

  // The gun arm, drawn last so it's always topmost -- constantly extended
  // forward at the same angle regardless of frame (see GUN_ARM_ANGLE),
  // roughly where the separately-rendered wand already sits (see the +14/
  // +12 offset LevelScene/BossScene position it at each frame), so the
  // figure actually looks like it's the one holding it.
  drawArm(g, { shoulderX: shoulderRightX, shoulderY, angle: GUN_ARM_ANGLE, armLen, armW, color: armColor, bicep });
}

function buildWalkFrames(scene, baseKey, size, colors) {
  const { width: w, height: h } = size;
  ['idle', 'step-a', 'step-b'].forEach((suffix, i) => {
    const key = `${baseKey}-${suffix}`;
    if (scene.textures.exists(key)) return;
    const g = scene.add.graphics();
    const step = i === 0 ? 0 : i === 1 ? 1 : -1;
    drawFigure(g, size, { step, ...colors });
    g.generateTexture(key, w, h);
    g.destroy();
  });
}

// gender: 'male' | 'female'. Returns the base texture key
// (`hero-male`/`hero-female`) to use for both the sprite's initial texture
// and animateHumanoid()'s baseKey -- callers need it back since it now
// varies per friend instead of always being a fixed 'hero'.
export function ensureHeroTexture(scene, gender = 'male') {
  const baseKey = `hero-${gender}`;
  buildWalkFrames(scene, baseKey, HERO_SIZE, {
    skin: 0xffd9a0,
    // Pants deliberately don't share a hue family with the torso above
    // them (brown vs. olive, slate vs. pink) -- close-hue pairs like the
    // original olive-on-olive nearly vanished into each other at this
    // size, reading as "no legs" rather than two separate garments.
    torso: gender === 'female' ? 0xff8fab : 0x606c38,
    armColor: 0xffd9a0,
    legColor: gender === 'female' ? 0x4a4e69 : 0x4a3c2a,
    angry: false,
    hat: true,
    gender,
  });
  return baseKey;
}

export function ensureImpTexture(scene, baseKey = 'imp') {
  buildWalkFrames(scene, baseKey, IMP_SIZE, {
    skin: 0xff8f8f,
    torso: 0xff6b6b,
    armColor: 0xff8f8f,
    legColor: 0x9d0208,
    angry: true,
    hat: false,
  });
  return baseKey;
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
