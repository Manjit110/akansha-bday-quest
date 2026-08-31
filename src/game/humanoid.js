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

function drawFigure(g, size, { skin, torso, armColor, legColor, step, angry, hat, gender }) {
  const { width: w, height: h, topMargin } = size;
  const cx = w / 2;
  const headR = w * 0.3;
  const headCy = headR + topMargin;
  const torsoTop = headCy + headR - 2;
  const torsoH = h * 0.32;
  const torsoW = w * 0.5;
  const torsoBottom = torsoTop + torsoH;
  // Male reads bulkier through the arms (a small deltoid bump added below);
  // female stays leaner. Legs mirror the same difference, a touch slimmer
  // for female, and both get a dark boot cap instead of the old flat
  // single-color leg.
  const armW = w * (gender === 'male' ? 0.24 : gender === 'female' ? 0.17 : 0.2);
  const armH = h * 0.27;
  const legW = w * (gender === 'male' ? 0.25 : gender === 'female' ? 0.2 : 0.24);
  const legH = h - torsoBottom - 2;
  const bootH = Math.max(3, legH * 0.22);

  // step swings limbs in opposite pairs: -1 / 0 / 1
  const swing = step * (h * 0.05);

  const drawLeg = (lx, ly) => {
    g.fillStyle(legColor, 1);
    g.fillRoundedRect(lx, ly, legW, legH, legW / 2);
    g.fillStyle(BOOT_COLOR, 1);
    g.fillRoundedRect(lx, ly + legH - bootH, legW, bootH, legW * 0.35);
  };

  const drawArm = (ax, ay) => {
    g.fillStyle(armColor, 1);
    g.fillRoundedRect(ax, ay, armW, armH, armW / 2);
    if (gender === 'male') {
      g.fillCircle(ax + armW / 2, ay + armW * 0.4, armW * 0.62);
    }
  };

  // back arm + leg first so the front pair overlaps them
  drawArm(cx + torsoW / 2 - armW * 0.35, torsoTop + 2 - swing);
  drawLeg(cx + torsoW * 0.16, torsoBottom - 2 + swing);

  // torso
  drawTorso(g, { cx, torsoTop, torsoH, torsoW, color: torso, gender });

  // front leg + arm
  drawLeg(cx - torsoW * 0.16 - legW, torsoBottom - 2 - swing);
  drawArm(cx - torsoW / 2 - armW * 0.65, torsoTop + 2 + swing);

  if (gender === 'female') drawHair(g, { cx, headCy, headR, swing });

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
    torso: gender === 'female' ? 0xff8fab : 0x606c38,
    armColor: 0xffd9a0,
    legColor: gender === 'female' ? 0x4a4e69 : 0x3a4a2b,
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
