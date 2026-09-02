import Phaser from 'phaser';
import { ensureHeroTexture, animateHumanoid, headGeometry, HERO_SIZE } from './humanoid.js';
import { createFaceOverlay } from './faceOverlay.js';
import { ensureCirclePhotoTexture } from './circlePhoto.js';
import { ensureWandTexture } from './weapon.js';
import { player as playerConfig } from '../data/player.js';
import { friends } from '../data/friends.js';
import { assetUrl } from '../assetPath.js';
import { playSound } from '../sound.js';

const W = 960;
const H = 540;
const GROUND_Y = 460;

const PALETTE = {
  ground: 0x4a3570,
  groundTop: 0x6a4fa0,
  dragonBody: 0x8a1f3d,
  dragonBelly: 0xc23b5e,
  weakSafe: 0x5a2a45,
  weakHot: 0xff6b6b,
  fireball: 0xff9f45,
};

// Displayed HP (the pips shown in the HUD). Each pip actually takes several
// hits to bring down -- see HITS_PER_STAGE_* -- so with every rescued
// friend now also firing on the dragon (see buildAllySquad), the fight
// still has real duration instead of ending in a couple of seconds.
export const DRAGON_HP = 10;
const HITS_PER_STAGE_MIN = 4;
const HITS_PER_STAGE_MAX = 5;
// The dragon patrols this whole band horizontally (see startPatrolFrom())
// at one fixed altitude -- it never dives or changes height, only ever
// moving left/right along this single line -- DRAGON_HIGH_Y sits below the
// jail cell (JAIL_Y=84, bottom ~132) so it flies past the cage rather than
// through it, and ALLY_ROW_Y_START (below) keeps the whole rescued squad
// clear of its body while it's cruising.
const DRAGON_HIGH_Y = 190;
const DRAGON_PATROL_MIN_X = 170;
const DRAGON_PATROL_MAX_X = 790;
const DRAGON_PATROL_SPEED = 0.18; // px/ms
// The "vulnerable window" (see swoop()) used to be a dive down to a lower,
// reachable altitude; it's now purely a timed color flash on the weak point
// with no movement at all, kept inside this lane's x-keepout for the ally
// squad below for the same reason it always was -- nothing to do with any
// dive anymore, just a zone the squad still visually clears near mid-arena.
const DIVE_LANE_MIN_X = 380;
const DIVE_LANE_MAX_X = 580;
const DIVE_LANE_MARGIN = 30;
// Where the belly/weak-point sits relative to the dragon container's own
// origin -- kept as one constant so the decorative belly and the physics
// weak-point circle stay lined up.
const WEAK_OFFSET_Y = 20;
const SHOOT_COOLDOWN = 200;
const PLAYER_PROJECTILE_SPEED = 520;
// How often the "vulnerable" window (weak point flashes hot, hits count)
// opens, and how long it stays open.
const VULNERABLE_WINDOW_MS = 1000;
const SWOOP_INTERVAL = 2600;
// How often it throws, and how fast the fireball itself travels.
const FIREBALL_INTERVAL = 500;
const FIREBALL_SPEED = 320;
// How often the next friend in the squad takes a shot, and how long their
// shot takes to reach the dragon. Deterministic and not gated behind the
// dragon being "vulnerable" -- unlike the player's own weak-point shots,
// the squad's volley is what guarantees the fight always finishes even if
// she never fires a single shot herself.
const ALLY_FIRE_INTERVAL = 260;
const ALLY_PROJECTILE_DURATION = 220;
const JAIL_X = 480;
const JAIL_Y = 84;
const JAIL_W = 118;
const JAIL_H = 96;
// Each ally is the same hero figure the player controls everywhere else,
// scaled down and tinted/faced per friend, so "gun-toting little person"
// reads consistently across the whole game rather than a different
// avatar style just for this scene. Halved from the original 0.6 to cancel
// out HERO_SIZE doubling (see humanoid.js) -- only the player was asked to
// get bigger, so the squad renders at the same on-screen size as before.
const ALLY_SCALE = 0.3;
// The drawn head is tiny at ALLY_SCALE; enlarge the photo well past it so
// a face is actually legible, same trick LevelScene uses for the player.
const ALLY_FACE_SCALE = 2.3;
const ALLY_ROWS = 4;
// Pushed well below DRAGON_HIGH_Y (190) so the squad sits entirely under
// the dragon's cruising altitude instead of sharing its airspace -- the
// old START (138) put row 1 almost exactly where the dragon hovered.
const ALLY_ROW_Y_START = 280;
const ALLY_ROW_Y_STEP = 42;

// A keep-out zone around the jail cell, in the row nearest it -- an
// evenly-spaced grid alone put one friend's slot at exactly JAIL_X, and
// she ended up standing right at the foot of Akansha's own cell.
const JAIL_KEEPOUT_X_MIN = JAIL_X - JAIL_W / 2 - 24;
const JAIL_KEEPOUT_X_MAX = JAIL_X + JAIL_W / 2 + 24;
const JAIL_KEEPOUT_Y_MAX = JAIL_Y + JAIL_H / 2 + 30;

// Mirrors DIVE_LANE_MIN_X/MAX_X above -- no ally ever stands in the lane
// the dragon dives through, in any row, so the dive never clips a body.
const DIVE_KEEPOUT_X_MIN = DIVE_LANE_MIN_X - DIVE_LANE_MARGIN;
const DIVE_KEEPOUT_X_MAX = DIVE_LANE_MAX_X + DIVE_LANE_MARGIN;

// Individual floating podiums scattered across four staggered rows, so
// everyone reads as having claimed their own spot rather than standing
// shoulder to shoulder. Builds several extra slots per row (more candidate
// positions than friends) specifically so any slot landing inside the
// jail or dive-lane keep-out zones can just be dropped instead of needing
// a friend reassigned by hand -- stays correct even if the roster size
// changes.
function buildAllyPositions(total) {
  const perRow = Math.ceil(total / ALLY_ROWS) + 3;
  const marginX = 60;
  const usableW = W - marginX * 2;
  const spacing = usableW / perRow;

  const positions = [];
  for (let row = 0; row < ALLY_ROWS; row++) {
    const y = ALLY_ROW_Y_START + row * ALLY_ROW_Y_STEP;
    const stagger = row % 2 === 1 ? spacing / 2 : 0;
    for (let col = 0; col < perRow; col++) {
      const x = Math.min(W - marginX, marginX + stagger + (col + 0.5) * spacing);
      const inJailKeepout = y < JAIL_KEEPOUT_Y_MAX && x > JAIL_KEEPOUT_X_MIN && x < JAIL_KEEPOUT_X_MAX;
      const inDiveKeepout = x > DIVE_KEEPOUT_X_MIN && x < DIVE_KEEPOUT_X_MAX;
      if (inJailKeepout || inDiveKeepout) continue;
      positions.push({ x, y });
    }
  }
  return positions.slice(0, total);
}

export default class BossScene extends Phaser.Scene {
  constructor() {
    super('BossScene');
  }

  init(data) {
    this.callbacks = data.callbacks;
    this.hearts = 3;
    this.dragonHP = DRAGON_HP;
    this.hitsUntilNextStage = Phaser.Math.Between(HITS_PER_STAGE_MIN, HITS_PER_STAGE_MAX);
    this.allyTurn = 0;
    this.invulnerable = false;
    this.vulnerable = false;
    this.finished = false;
    this.lastShotAt = -9999;
    this.shootRequested = false;
    this.isSwooping = false;
  }

  preload() {
    if (playerConfig.facePhoto && !this.textures.exists('face-player')) {
      this.load.image('face-player', assetUrl(playerConfig.facePhoto));
    }
    // The whole rescued squad shows up for the finale (see
    // buildAllySquad), so their faces need loading here too -- most are
    // already cached from playing through their own levels, but a fresh
    // session (or the ?level=boss cheat code) hits this scene directly.
    friends.forEach((f) => {
      const key = `face-friend-${f.id}`;
      if (f.photoSolo && !this.textures.exists(key)) {
        this.load.image(key, assetUrl(f.photoSolo));
      }
    });
  }

  create() {
    this.cameras.main.setBackgroundColor('#1a1035');
    this.physics.world.setBounds(0, 0, W, H + 300);

    for (let i = 0; i < 30; i++) {
      this.add.circle(Math.random() * W, Math.random() * (GROUND_Y - 60), 1.6, 0xffffff, 0.5);
    }

    const ground = this.add.rectangle(W / 2, GROUND_Y + 40, W, 80, PALETTE.ground);
    this.add.rectangle(W / 2, GROUND_Y, W, 8, PALETTE.groundTop);
    this.physics.add.existing(ground, true);

    this.heroBaseKey = ensureHeroTexture(this, playerConfig.gender);
    this.player = this.physics.add.sprite(120, GROUND_Y - 100, `${this.heroBaseKey}-idle`);
    // Body size deliberately NOT scaled up with HERO_SIZE, but the offset
    // has to be -- see the full explanation in LevelScene.js's matching
    // setSize/setOffset call. Without it, player.y (what the fireball
    // hit-check and other fixed offsets are measured from) sits at the
    // wrong height once she's standing on the ground.
    this.player.body
      .setSize(22, 46)
      .setOffset((HERO_SIZE.width - 22) / 2, HERO_SIZE.height - 46 - 2);
    this.player.body.setMaxVelocity(260, 900);
    this.physics.add.collider(this.player, ground);

    const heroHead = headGeometry(HERO_SIZE);
    this.playerFace = createFaceOverlay(this, { textureKey: 'face-player', radius: heroHead.radius });
    this.playerFaceOffsetY = heroHead.offsetY;

    ensureWandTexture(this);
    this.wand = this.add.image(this.player.x, this.player.y, 'wand');

    this.buildDragon();
    // Visible target for where/when to shoot -- lights up (see swoop())
    // while vulnerable. Sized a bit generously so a shot lands even if its
    // height doesn't line up pixel-perfect; this used to be a "walk/jump
    // into it" hitbox sized for physical touch, a much stricter target
    // than a horizontally-fired shot needs. Positioned at the dragon's
    // actual starting spot (not a hardcoded x) now that it patrols.
    this.weakPoint = this.add.circle(this.dragonGroup.x, this.dragonGroup.y + WEAK_OFFSET_Y, 22, PALETTE.weakSafe, 0.9);
    this.weakPoint.setStrokeStyle(2, 0xffffff, 0.45);
    // Dynamic, not static -- it gets repositioned every frame the dragon
    // swoops, and a static body's bounds are meant for things that don't
    // move (Phaser docs call repeatedly updating one "expensive and not
    // recommended").
    this.physics.add.existing(this.weakPoint);
    this.weakPoint.body.setAllowGravity(false);

    this.fireballs = this.physics.add.group({ allowGravity: false });
    this.playerProjectiles = this.physics.add.group({ allowGravity: false });

    this.physics.add.overlap(this.player, this.fireballs, (player, fb) => this.hitByFireball(fb));
    // Argument order matters here: overlap(group, singleObject, cb) that
    // destroys the group member inside cb landed exactly one hit, ever --
    // confirmed by testing several real shots in a row, not just one.
    // Every shot after the first spawned correctly and lined up correctly
    // but the overlap callback simply never fired again for the rest of
    // the fight. Swapping to overlap(singleObject, group, cb) -- the same
    // order every other single-vs-group overlap in this codebase already
    // uses -- fixed it outright.
    this.physics.add.overlap(this.weakPoint, this.playerProjectiles, (weakPoint, proj) => {
      proj.destroy();
      this.tryHitDragon();
    });

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE,F');

    this.buildJailCell();
    this.buildAllySquad();

    this.callbacks.onHeartsChange(this.hearts);
    this.callbacks.onBossStart(DRAGON_HP);

    this.startPatrolFrom(this.dragonGroup.x);
    this.swoopTimer = this.time.addEvent({ delay: SWOOP_INTERVAL, callback: () => this.swoop(), loop: true });
    this.fireTimer = this.time.addEvent({ delay: FIREBALL_INTERVAL, callback: () => this.spawnFireball(), loop: true });
    this.allyFireTimer = this.time.addEvent({ delay: ALLY_FIRE_INTERVAL, callback: () => this.allyVolley(), loop: true });
  }

  // Akansha's cage, held above the fight throughout -- what everyone's
  // actually here for. Bars swing open in openJailCell() once the dragon
  // falls. Reuses her own face photo (playerConfig.facePhoto), the same
  // one she wears during this fight, since it's the same person either way.
  buildJailCell() {
    this.add.rectangle(JAIL_X, JAIL_Y, JAIL_W, JAIL_H, 0x1a0f2e, 0.9).setStrokeStyle(2, 0x3a2a5c, 0.9);

    const photoRadius = JAIL_H / 2 - 14;
    if (playerConfig.facePhoto && this.textures.exists('face-player')) {
      // Stays still the whole fight, so it can be baked once too (see
      // ensureCirclePhotoTexture) instead of a live mask.
      const bakedKey = ensureCirclePhotoTexture(this, {
        key: `jail-photo-${Math.round(photoRadius)}`,
        sourceKey: 'face-player',
        diameter: Math.round(photoRadius * 2),
      });
      this.add.image(JAIL_X, JAIL_Y, bakedKey);
    } else {
      this.add.circle(JAIL_X, JAIL_Y, photoRadius, 0xffd166);
      this.add
        .text(JAIL_X, JAIL_Y, 'A', { fontFamily: 'Press Start 2P, monospace', fontSize: '24px', color: '#2b1140' })
        .setOrigin(0.5);
    }

    this.jailBars = [];
    const barCount = 6;
    for (let i = 0; i < barCount; i++) {
      const bx = JAIL_X - JAIL_W / 2 + 10 + i * ((JAIL_W - 20) / (barCount - 1));
      const bar = this.add.rectangle(bx, JAIL_Y, 5, JAIL_H - 8, 0x2a1f3a);
      bar.setStrokeStyle(1, 0x140b28, 0.7);
      this.jailBars.push(bar);
    }
    this.add.rectangle(JAIL_X, JAIL_Y - JAIL_H / 2 + 3, JAIL_W, 6, 0x140b28);
    this.add.rectangle(JAIL_X, JAIL_Y + JAIL_H / 2 - 3, JAIL_W, 6, 0x140b28);

    this.jailGlow = this.add.circle(JAIL_X, JAIL_Y, JAIL_H / 2, 0xffd166, 0);

    this.add
      .text(JAIL_X, JAIL_Y + JAIL_H / 2 + 16, 'Akansha', {
        fontFamily: 'Quicksand, sans-serif',
        fontSize: '12px',
        fontStyle: '700',
        color: '#c9b8e8',
      })
      .setOrigin(0.5);
  }

  // The full rescued squad, each on their own floating podium, taking
  // automated potshots at the dragon throughout the fight (see
  // allyVolley) -- this is what guarantees the fight finishes even if she
  // never fires a single shot herself.
  buildAllySquad() {
    const positions = buildAllyPositions(friends.length);
    this.allies = friends.map((friend, i) => this.buildAlly(friend, positions[i]));
  }

  // Same hero figure + wand the player wears everywhere else in the game
  // (see LevelScene), just smaller and standing still -- reads as "one of
  // her friends, armed, holding position" rather than a different avatar
  // style invented just for this scene. Faces toward the middle of the
  // arena, where the dragon's dive lane (and the jail) sit -- there's no
  // single fixed "toward the dragon" anymore now that it patrols the
  // whole width.
  buildAlly(friend, pos) {
    const { x, y } = pos;
    const color = Phaser.Display.Color.HexStringToColor(friend.color).color;
    const dir = x < W / 2 ? 1 : -1;

    this.add.ellipse(x, y + 29, 32, 7, 0x000000, 0.28);
    this.add.rectangle(x, y + 25, 28, 6, 0x241542, 0.95).setStrokeStyle(1, 0x140b28, 0.6);

    const allyBaseKey = ensureHeroTexture(this, friend.gender);
    const sprite = this.add.sprite(x, y, `${allyBaseKey}-idle`);
    sprite.setScale(ALLY_SCALE);
    sprite.setFlipX(dir === -1);

    const photoKey = `face-friend-${friend.id}`;
    if (friend.photoSolo && this.textures.exists(photoKey)) {
      const heroHead = headGeometry(HERO_SIZE);
      const radius = heroHead.radius * ALLY_SCALE * ALLY_FACE_SCALE;
      // Baked once (see circlePhoto.js), not a live mask -- up to 19 of
      // these can be on screen simultaneously, and 19 live GeometryMasks
      // measurably dropped the frame rate. Static avatars don't need to
      // move, so baking is free of the tradeoffs a live mask exists for.
      const bakedKey = ensureCirclePhotoTexture(this, {
        key: `ally-face-${friend.id}-${Math.round(radius)}`,
        sourceKey: photoKey,
        diameter: Math.round(radius * 2),
      });
      this.add.image(x, y + heroHead.offsetY * ALLY_SCALE, bakedKey);
    } else {
      // No photo yet -- tint the figure itself in her color instead of a
      // separate placeholder shape, same "still reads as her" fallback
      // spirit as the rest of the game's photo-optional avatars.
      sprite.setTint(color);
    }

    const wand = this.add.image(x + dir * 7 * ALLY_SCALE, y + 20 * ALLY_SCALE, 'wand');
    wand.setScale(ALLY_SCALE);
    wand.setFlipX(dir === -1);

    return { x, y, color, sprite, wand };
  }

  // Fires from the next friend in the squad, round-robin. Purely a visual
  // tween to the dragon's current position, not physics/overlap-based --
  // damage lands deterministically when it arrives (see registerHit), so
  // the fight's pace never depends on collision timing.
  allyVolley() {
    if (this.finished || !this.allies || !this.allies.length) return;
    const ally = this.allies[this.allyTurn % this.allies.length];
    this.allyTurn++;

    this.tweens.add({ targets: ally.wand, scaleX: ALLY_SCALE * 1.7, scaleY: ALLY_SCALE * 1.7, duration: 120, yoyo: true });
    this.tweens.add({ targets: ally.sprite, alpha: 0.55, duration: 90, yoyo: true });

    const proj = this.add.circle(ally.wand.x, ally.wand.y, 5, ally.color);
    this.tweens.add({
      targets: proj,
      x: this.dragonGroup.x,
      y: this.dragonGroup.y + WEAK_OFFSET_Y,
      duration: ALLY_PROJECTILE_DURATION,
      ease: 'Sine.easeIn',
      onComplete: () => {
        proj.destroy();
        this.registerHit();
      },
    });
  }

  // Bars swing apart and the cage glows -- called once from winFight(),
  // right as the dragon starts its own fade-out.
  openJailCell() {
    if (!this.jailBars) return;
    this.jailBars.forEach((bar, i) => {
      this.tweens.add({
        targets: bar,
        x: bar.x + (i % 2 === 0 ? -34 : 34),
        alpha: 0,
        duration: 700,
        ease: 'Back.easeIn',
      });
    });
    if (this.jailGlow) {
      this.tweens.add({ targets: this.jailGlow, alpha: 0.8, scale: 1.35, duration: 450, yoyo: true, repeat: 1 });
    }
  }

  // A small composite dragon (container of primitives) in the same
  // chibi/low-poly style as the rest of the game, in place of a flat
  // rectangle with two circles that didn't read as a dragon at all.
  // Built as a Container so the whole thing can be tweened as one unit.
  buildDragon() {
    const { dragonBody: body, dragonBelly: belly } = PALETTE;
    const dark = 0x5c1428;
    const g = this.add.container(DRAGON_PATROL_MIN_X, DRAGON_HIGH_Y);

    const tail = this.add.triangle(-40, 6, 0, 0, -55, -18, -18, -14, dark);
    const wingL = this.add.triangle(-8, -10, 0, 0, -58, -50, 4, -18, dark).setAlpha(0.92);
    const wingR = this.add.triangle(8, -10, 0, 0, 58, -50, -4, -18, dark).setAlpha(0.92);

    const torso = this.add.graphics();
    torso.fillStyle(body, 1);
    torso.fillRoundedRect(-45, -30, 90, 60, 22);
    torso.fillStyle(dark, 1);
    [-24, -4, 16].forEach((x) => {
      torso.fillTriangle(x - 7, -28, x, -44, x + 7, -28);
    });

    const bellyShape = this.add.ellipse(4, WEAK_OFFSET_Y - 2, 54, 30, belly);

    const head = this.add.circle(50, -8, 19, body);
    const snout = this.add.triangle(58, -2, 0, 0, 24, 5, 0, 12, body);
    const hornL = this.add.triangle(42, -20, 0, 0, -5, -20, 10, -2, dark);
    const hornR = this.add.triangle(54, -22, 0, 0, -3, -20, 12, -2, dark);
    const eyeWhite = this.add.circle(56, -12, 4.5, 0xffffff);
    const eyePupil = this.add.circle(57.5, -12, 2.1, 0x1a1035);
    const nostril = this.add.circle(74, 1, 1.6, 0x3a0d1c, 0.8);

    g.add([tail, wingL, wingR, torso, bellyShape, head, snout, hornL, hornR, eyeWhite, eyePupil, nostril]);
    this.dragonGroup = g;
    this.dragonWings = [wingL, wingR];

    this.tweens.add({
      targets: this.dragonWings,
      scaleX: 0.8,
      duration: 380,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // Flies it back and forth across DRAGON_PATROL_MIN_X..MAX_X at cruising
  // altitude, one leg at a time (rather than one long yoyo/repeat tween) so
  // it can always be interrupted and later resumed from wherever it
  // actually is -- see swoop()/retractDragon(). A plain yoyo tween paused
  // mid-flight and resumed later snaps back onto its own original
  // start/end interpolation instead of continuing from the paused spot,
  // which looked like the dragon teleporting after every dive.
  startPatrolFrom(x) {
    this.patrolDir = x <= (DRAGON_PATROL_MIN_X + DRAGON_PATROL_MAX_X) / 2 ? 1 : -1;
    this.queueNextPatrolLeg(x);
  }

  queueNextPatrolLeg(fromX) {
    const targetX = this.patrolDir === 1 ? DRAGON_PATROL_MAX_X : DRAGON_PATROL_MIN_X;
    const duration = Math.max(200, Math.abs(targetX - fromX) / DRAGON_PATROL_SPEED);
    this.dragonPatrolTween = this.tweens.add({
      targets: this.dragonGroup,
      x: targetX,
      duration,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (this.finished) return;
        this.patrolDir *= -1;
        this.queueNextPatrolLeg(this.dragonGroup.x);
      },
    });
  }

  // Opens the "vulnerable" window: the weak point flashes hot and hits
  // start counting, on a timer -- no longer a dive down to a lower
  // altitude, just a color flash while the dragon keeps cruising its one
  // horizontal line exactly as always (see startPatrolFrom/
  // queueNextPatrolLeg, untouched by this). Still guarded against two
  // windows ever overlapping.
  swoop() {
    if (this.finished || this.isSwooping) return;
    this.isSwooping = true;
    this.vulnerable = true;
    this.weakPoint.fillColor = PALETTE.weakHot;
    // Landing an early hit (see tryHitDragon) closes the window itself and
    // cancels this timer -- if it didn't, this would fire again regardless,
    // re-closing an already-closed window.
    this.swoopCloseTimer = this.time.delayedCall(VULNERABLE_WINDOW_MS, () => {
      if (this.finished) return;
      this.retractDragon();
    });
  }

  // Closes the vulnerable window. Called either when it times out unhit
  // (see swoop) or immediately when a hit lands (see tryHitDragon) --
  // exactly one of those two paths runs per window, never both.
  retractDragon() {
    this.vulnerable = false;
    this.weakPoint.fillColor = PALETTE.weakSafe;
    this.isSwooping = false;
  }

  syncWeakPoint() {
    if (this.finished || !this.weakPoint.body) return;
    this.weakPoint.setPosition(this.dragonGroup.x, this.dragonGroup.y + WEAK_OFFSET_Y);
    this.weakPoint.body.updateFromGameObject();
  }

  spawnFireball() {
    if (this.finished) return;
    playSound('bossFire', { volume: 0.35 });
    // Aimed at the player and fired sideways, matching the mini-boss
    // fireballs in the regular levels (see LevelScene's bossThrow) --
    // this used to launch with velocity (~0, 260), which is almost pure
    // downward drop with a tiny horizontal wobble, not a throw at her.
    const dir = this.player.x < this.dragonGroup.x ? -1 : 1;
    const fb = this.add.circle(this.dragonGroup.x, this.dragonGroup.y + 4, 15, PALETTE.fireball);
    fb.setStrokeStyle(3, 0xffd166, 0.8);
    this.physics.add.existing(fb);
    this.fireballs.add(fb);
    fb.body.setAllowGravity(false);
    fb.body.setVelocityX(dir * FIREBALL_SPEED);
    this.time.delayedCall(2600, () => fb.destroy());
  }

  hitByFireball(fb) {
    fb.destroy();
    this.damagePlayer();
  }

  // Called by the on-screen shoot button (see main.js), alongside the F key.
  requestShoot() {
    this.shootRequested = true;
  }

  shoot() {
    const dir = this.player.flipX ? -1 : 1;
    const proj = this.add.circle(this.player.x + dir * 18, this.player.y + 10, 8, 0xffd166);
    proj.setStrokeStyle(2, 0xffffff, 0.6);
    this.physics.add.existing(proj);
    this.playerProjectiles.add(proj);
    proj.body.setAllowGravity(false);
    proj.body.setVelocityX(dir * PLAYER_PROJECTILE_SPEED);
    this.time.delayedCall(1000, () => {
      if (proj.active) proj.destroy();
    });
  }

  tryHitDragon() {
    if (!this.vulnerable || this.finished) return;
    // Only the player's own hits get a sound here, not the squad's -- the
    // automated volley lands one every ~260ms, which would turn into
    // constant noise for the whole fight if it played this too.
    playSound('impact', { volume: 0.45 });
    // This hit is what's ending the vulnerable window now, so the window's
    // own 1400ms timeout must not *also* fire later and retract the dragon
    // a second time (see swoop()).
    if (this.swoopCloseTimer) this.swoopCloseTimer.remove(false);
    this.registerHit();
    // registerHit() may have just called winFight() (dragonHP hit 0) --
    // don't also retract a dragon that's already fading out.
    if (!this.finished) this.retractDragon();
  }

  // Shared by the player's own weak-point shots and the squad's automated
  // volley (see allyVolley) -- each hit only chips at a fine-grained
  // counter, and the HUD's displayed HP pip only drops every 4-5 hits, so
  // 19 friends is what actually finishes this fight, not a single lucky
  // shot.
  registerHit() {
    if (this.finished) return;
    this.tweens.add({ targets: this.dragonGroup, alpha: 0.55, duration: 70, yoyo: true });
    this.hitsUntilNextStage -= 1;
    if (this.hitsUntilNextStage > 0) return;
    this.hitsUntilNextStage = Phaser.Math.Between(HITS_PER_STAGE_MIN, HITS_PER_STAGE_MAX);
    this.dragonHP -= 1;
    this.callbacks.onDragonHit(this.dragonHP);
    if (this.dragonHP <= 0) this.winFight();
  }

  damagePlayer() {
    if (this.invulnerable || this.finished) return;
    this.hearts -= 1;
    if (this.hearts <= 0) {
      this.hearts = 3;
      playSound('reset', { volume: 0.5 });
    } else {
      playSound('hit', { volume: 0.45 });
    }
    this.callbacks.onHeartsChange(this.hearts);
    this.invulnerable = true;
    this.player.setPosition(120, GROUND_Y - 100);
    this.player.body.setVelocity(0, 0);
    this.tweens.add({
      targets: this.player,
      alpha: 0.3,
      duration: 120,
      yoyo: true,
      repeat: 6,
      onComplete: () => {
        this.player.setAlpha(1);
        this.invulnerable = false;
      },
    });
  }

  winFight() {
    this.finished = true;
    this.swoopTimer.remove();
    this.fireTimer.remove();
    this.allyFireTimer.remove();
    if (this.dragonPatrolTween) this.dragonPatrolTween.remove();
    this.fireballs.clear(true, true);
    this.openJailCell();
    this.tweens.add({
      targets: [this.dragonGroup, this.weakPoint],
      alpha: 0,
      scale: 0.6,
      duration: 900,
      ease: 'Back.easeIn',
      // A short beat after the dragon's own fade so she gets to see the
      // cage actually open, rather than cutting to the finale screen
      // mid-animation.
      onComplete: () => this.time.delayedCall(600, () => this.callbacks.onVictory()),
    });
  }

  update(time) {
    if (this.finished) return;
    const { cursors, keys, player } = this;
    const left = cursors.left.isDown || keys.A.isDown;
    const right = cursors.right.isDown || keys.D.isDown;
    const jumpKey = cursors.up.isDown || keys.W.isDown || keys.SPACE.isDown;

    if (left) player.body.setVelocityX(-200);
    else if (right) player.body.setVelocityX(200);
    else player.body.setVelocityX(0);

    const onGround = player.body.blocked.down || player.body.touching.down;
    if (jumpKey && onGround && !this.jumpLock) {
      player.body.setVelocityY(-560);
      this.jumpLock = true;
      playSound('jump', { volume: 0.3 });
    }
    if (!jumpKey) this.jumpLock = false;

    if ((keys.F.isDown || this.shootRequested) && time - this.lastShotAt > SHOOT_COOLDOWN) {
      this.shoot();
      this.lastShotAt = time;
    }
    this.shootRequested = false;

    animateHumanoid(player, { onGround, time, baseKey: this.heroBaseKey });
    if (this.wand) {
      const dir = player.flipX ? -1 : 1;
      this.wand.setPosition(player.x + dir * 14, player.y + 12);
      this.wand.setFlipX(player.flipX);
    }
    if (this.playerFace) {
      this.playerFace.setPosition(player.x, player.y + this.playerFaceOffsetY * player.scaleY);
    }

    // The weak point used to only need repositioning during a swoop's own
    // tween (dragonGroup.y moving); now dragonGroup.x also drifts every
    // frame from the horizontal patrol, so it has to track continuously
    // rather than just during a swoop.
    this.syncWeakPoint();

    // Face whichever way it's actually moving -- patrol and the swoop dive
    // both just move dragonGroup.x directly, so a plain frame-to-frame
    // delta covers both instead of needing separate facing logic for each.
    if (this.dragonGroup) {
      const dx = this.dragonGroup.x - (this.lastDragonX ?? this.dragonGroup.x);
      if (Math.abs(dx) > 0.05) this.dragonGroup.setScale(dx < 0 ? -1 : 1, 1);
      this.lastDragonX = this.dragonGroup.x;
    }
  }
}
