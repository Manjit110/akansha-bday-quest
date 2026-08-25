import Phaser from 'phaser';
import { ensureHeroTexture, animateHumanoid } from './humanoid.js';

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
    this.player.body.setSize(22, 46).setOffset(7, 6);
    this.player.body.setMaxVelocity(260, 900);
    this.physics.add.collider(this.player, ground);

    // dragon (simple composite: body + belly + weak point)
    this.dragon = this.add.rectangle(DRAGON_X, DRAGON_HIGH_Y, 130, 90, PALETTE.dragonBody);
    this.dragonBelly = this.add.ellipse(DRAGON_X, DRAGON_HIGH_Y + 30, 70, 40, PALETTE.dragonBelly);
    this.weakPoint = this.add.circle(DRAGON_X, DRAGON_HIGH_Y + 50, 16, PALETTE.weakSafe);
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

  swoop() {
    if (this.finished) return;
    this.vulnerable = true;
    this.weakPoint.fillColor = PALETTE.weakHot;
    this.tweens.add({
      targets: [this.dragon, this.dragonBelly],
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
            targets: [this.dragon, this.dragonBelly],
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
    this.weakPoint.setPosition(this.dragon.x, this.dragon.y + 50);
    this.weakPoint.body.updateFromGameObject();
  }

  spawnFireball() {
    if (this.finished) return;
    const fx = this.dragon.x + (Math.random() - 0.5) * 60;
    const fb = this.add.circle(fx, this.dragon.y + 20, 9, PALETTE.fireball);
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

    this.tweens.add({ targets: [this.dragon, this.dragonBelly], alpha: 0.3, duration: 100, yoyo: true, repeat: 3 });

    if (this.dragonHP <= 0) {
      this.winFight();
    } else {
      this.tweens.add({
        targets: [this.dragon, this.dragonBelly],
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
      targets: [this.dragon, this.dragonBelly, this.weakPoint],
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
  }
}
