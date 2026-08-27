import Phaser from 'phaser';
import { ensureHeroTexture, animateHumanoid, headGeometry, HERO_SIZE } from './humanoid.js';
import { createFaceOverlay } from './faceOverlay.js';
import { player as playerConfig } from '../data/player.js';
import { assetUrl } from '../assetPath.js';

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

export const DRAGON_HP = 3;
const DRAGON_X = 740;
const DRAGON_HIGH_Y = 130;
const DRAGON_LOW_Y = 300;
// Where the belly/weak-point sits relative to the dragon container's own
// origin -- kept as one constant so the decorative belly and the physics
// weak-point circle stay lined up.
const WEAK_OFFSET_Y = 20;

export default class BossScene extends Phaser.Scene {
  constructor() {
    super('BossScene');
  }

  init(data) {
    this.callbacks = data.callbacks;
    this.hearts = 3;
    this.dragonHP = DRAGON_HP;
    this.invulnerable = false;
    this.vulnerable = false;
    this.finished = false;
  }

  preload() {
    if (playerConfig.facePhoto && !this.textures.exists('face-player')) {
      this.load.image('face-player', assetUrl(playerConfig.facePhoto));
    }
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

    ensureHeroTexture(this);
    this.player = this.physics.add.sprite(120, GROUND_Y - 100, 'hero-idle');
    this.player.body.setSize(22, 46).setOffset(7, 20);
    this.player.body.setMaxVelocity(260, 900);
    this.physics.add.collider(this.player, ground);

    const heroHead = headGeometry(HERO_SIZE);
    this.playerFace = createFaceOverlay(this, { textureKey: 'face-player', radius: heroHead.radius });
    this.playerFaceOffsetY = heroHead.offsetY;

    this.buildDragon();
    this.weakPoint = this.add.circle(DRAGON_X, DRAGON_HIGH_Y + WEAK_OFFSET_Y, 15, PALETTE.weakSafe, 0.9);
    this.weakPoint.setStrokeStyle(2, 0xffffff, 0.45);
    this.physics.add.existing(this.weakPoint, true);

    this.fireballs = this.physics.add.group({ allowGravity: false });

    this.physics.add.overlap(this.player, this.fireballs, (player, fb) => this.hitByFireball(fb));
    this.physics.add.overlap(this.player, this.weakPoint, () => this.tryHitDragon());

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE');

    this.callbacks.onHeartsChange(this.hearts);
    this.callbacks.onBossStart(DRAGON_HP);

    this.swoopTimer = this.time.addEvent({ delay: 4200, callback: () => this.swoop(), loop: true });
    this.fireTimer = this.time.addEvent({ delay: 950, callback: () => this.spawnFireball(), loop: true });
  }

  // A small composite dragon (container of primitives) in the same chibi/
  // low-poly style as the level mini-bosses (see animals.js), in place of
  // a flat rectangle with two circles that didn't read as a dragon at all.
  // Built as a Container so the whole thing can be tweened as one unit.
  buildDragon() {
    const { dragonBody: body, dragonBelly: belly } = PALETTE;
    const dark = 0x5c1428;
    const g = this.add.container(DRAGON_X, DRAGON_HIGH_Y);

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

  swoop() {
    if (this.finished) return;
    this.vulnerable = true;
    this.weakPoint.fillColor = PALETTE.weakHot;
    this.tweens.add({
      targets: this.dragonGroup,
      y: `+=${DRAGON_LOW_Y - DRAGON_HIGH_Y}`,
      duration: 500,
      ease: 'Sine.easeOut',
      onUpdate: () => this.syncWeakPoint(),
      onComplete: () => {
        this.time.delayedCall(1400, () => {
          if (this.finished) return;
          this.vulnerable = false;
          this.weakPoint.fillColor = PALETTE.weakSafe;
          this.tweens.add({
            targets: this.dragonGroup,
            y: `-=${DRAGON_LOW_Y - DRAGON_HIGH_Y}`,
            duration: 500,
            ease: 'Sine.easeIn',
            onUpdate: () => this.syncWeakPoint(),
          });
        });
      },
    });
  }

  syncWeakPoint() {
    this.weakPoint.setPosition(this.dragonGroup.x, this.dragonGroup.y + WEAK_OFFSET_Y);
    this.weakPoint.body.updateFromGameObject();
  }

  spawnFireball() {
    if (this.finished) return;
    const fx = this.dragonGroup.x + (Math.random() - 0.5) * 60;
    const fb = this.add.circle(fx, this.dragonGroup.y + 20, 9, PALETTE.fireball);
    this.physics.add.existing(fb);
    fb.body.setAllowGravity(false);
    fb.body.setVelocity((Math.random() - 0.5) * 60, 260);
    this.fireballs.add(fb);
    this.time.delayedCall(2600, () => fb.destroy());
  }

  hitByFireball(fb) {
    fb.destroy();
    this.damagePlayer();
  }

  tryHitDragon() {
    if (!this.vulnerable || this.finished) return;
    this.vulnerable = false;
    this.dragonHP -= 1;
    this.callbacks.onDragonHit(this.dragonHP);
    this.weakPoint.fillColor = PALETTE.weakSafe;
    this.player.body.setVelocityY(-320);

    this.tweens.add({ targets: this.dragonGroup, alpha: 0.3, duration: 100, yoyo: true, repeat: 3 });

    if (this.dragonHP <= 0) {
      this.winFight();
    } else {
      this.tweens.add({
        targets: this.dragonGroup,
        y: `-=${DRAGON_LOW_Y - DRAGON_HIGH_Y}`,
        duration: 400,
        onUpdate: () => this.syncWeakPoint(),
      });
    }
  }

  damagePlayer() {
    if (this.invulnerable || this.finished) return;
    this.hearts -= 1;
    if (this.hearts <= 0) this.hearts = 3;
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
    this.fireballs.clear(true, true);
    this.tweens.add({
      targets: [this.dragonGroup, this.weakPoint],
      alpha: 0,
      scale: 0.6,
      duration: 900,
      ease: 'Back.easeIn',
      onComplete: () => this.callbacks.onVictory(),
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
    }
    if (!jumpKey) this.jumpLock = false;

    animateHumanoid(player, { onGround, time, baseKey: 'hero' });
    if (this.playerFace) {
      this.playerFace.setPosition(player.x, player.y + this.playerFaceOffsetY * player.scaleY);
    }
  }
}
