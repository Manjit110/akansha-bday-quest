import Phaser from 'phaser';
import { generateLevel } from './levelConfig.js';
import { ensureHeroTexture, ensureImpTexture, animateHumanoid, headGeometry, HERO_SIZE, IMP_SIZE } from './humanoid.js';
import { ensureAnimalTexture, ANIMAL_TYPES, BOSS_ANIMAL_SIZE } from './animals.js';
import { createFaceOverlay } from './faceOverlay.js';
import { ensureWandTexture } from './weapon.js';
import { assetUrl } from '../assetPath.js';

const PALETTE = {
  ground: 0x4a3570,
  groundTop: 0x6a4fa0,
  platform: 0x3a2a5c,
  bgHill1: 0x2d1b56,
  bgHill2: 0x35205f,
};

// The face shown on the player is enlarged relative to the drawn head, so
// it reads clearly at this small sprite scale (and just looks fun/chibi).
const PLAYER_FACE_SCALE = 1.8;
const SHOOT_COOLDOWN = 380;
const BOSS_HP = 3;

export default class LevelScene extends Phaser.Scene {
  constructor() {
    super('LevelScene');
  }

  init(data) {
    this.levelIndex = data.levelIndex;
    this.friend = data.friend;
    this.callbacks = data.callbacks;
    this.totalLevels = data.totalLevels;
    this.hearts = 3;
    this.invulnerable = false;
    this.miniBossDefeated = false;
    this.lastShotAt = -9999;
    this.bossHpPips = [];
    this.shootRequested = false;
  }

  preload() {
    if (this.friend?.photoSolo) {
      this.load.image(`face-friend-${this.friend.id}`, assetUrl(this.friend.photoSolo));
    }
    if (this.friend?.photoTogether) {
      this.load.image(`together-friend-${this.friend.id}`, assetUrl(this.friend.photoTogether));
    }
  }

  create() {
    const cfg = generateLevel(this.levelIndex, this.totalLevels);
    this.cfg = cfg;

    this.cameras.main.setBackgroundColor('#1a1035');
    this.physics.world.setBounds(0, 0, cfg.width, cfg.height + 400);

    this.drawBackground(cfg);

    // --- ground & platforms (static) ---
    this.groundGroup = this.physics.add.staticGroup();
    cfg.groundSegments.forEach((seg) => {
      if (seg.width <= 0) return;
      const rect = this.add.rectangle(seg.x + seg.width / 2, cfg.groundY + 30, seg.width, 60, PALETTE.ground);
      rect.setStrokeStyle(0);
      const top = this.add.rectangle(seg.x + seg.width / 2, cfg.groundY, seg.width, 8, PALETTE.groundTop);
      this.physics.add.existing(rect, true);
      this.groundGroup.add(rect);
    });

    this.platformGroup = this.physics.add.staticGroup();
    cfg.platforms.forEach((p) => {
      const rect = this.add.rectangle(p.x, p.y, p.width, 20, PALETTE.platform);
      this.physics.add.existing(rect, true);
      this.platformGroup.add(rect);
    });

    // --- goal: a small fort gate; entering leads to a framed photo on the wall inside ---
    this.createFortGate(cfg);
    this.createInteriorWall(cfg);

    // --- player: wears this level's friend's face while you play their level ---
    ensureHeroTexture(this);
    this.player = this.physics.add.sprite(cfg.spawnX, cfg.groundY - 100, 'hero-idle');
    this.player.body.setSize(22, 46).setOffset(7, 20);
    this.player.body.setBounce(0);
    this.player.body.setMaxVelocity(260, 900);

    const heroHead = headGeometry(HERO_SIZE);
    this.playerFace = createFaceOverlay(this, {
      textureKey: `face-friend-${this.friend.id}`,
      radius: heroHead.radius * PLAYER_FACE_SCALE,
    });
    this.playerFaceOffsetY = heroHead.offsetY;

    ensureWandTexture(this);
    this.wand = this.add.image(this.player.x, this.player.y, 'wand');

    // --- projectiles ---
    this.playerProjectiles = this.physics.add.group({ allowGravity: false });
    this.bossProjectiles = this.physics.add.group({ allowGravity: false });

    // --- enemies: regular patrol enemies, plus an animal mini-boss guarding the fort gate ---
    ensureImpTexture(this);
    this.enemyGroup = this.physics.add.group({ allowGravity: false, immovable: false });
    cfg.enemies.forEach((e) => {
      const enemy = this.physics.add.sprite(e.x, cfg.groundY - IMP_SIZE.height / 2, 'imp-idle');
      enemy.body.setAllowGravity(false);
      enemy.body.setSize(20, 34).setOffset(5, 6);
      enemy.startX = e.x - e.range / 2;
      enemy.endX = e.x + e.range / 2;
      enemy.body.setVelocityX(e.speed);
      enemy.baseKeyName = 'imp';
      this.enemyGroup.add(enemy);
    });
    this.spawnMiniBoss(cfg);

    // --- collisions ---
    this.physics.add.collider(this.player, this.groundGroup);
    this.physics.add.collider(this.player, this.platformGroup);
    this.physics.add.overlap(this.player, this.flag, () => {
      if (this.miniBossDefeated) this.enterFort();
    });
    this.physics.add.overlap(this.player, this.enemyGroup, (player, enemy) => this.handleEnemyHit(player, enemy));
    this.physics.add.overlap(this.playerProjectiles, this.enemyGroup, (proj, enemy) => {
      proj.destroy();
      this.damageEnemy(enemy);
    });
    this.physics.add.overlap(this.player, this.bossProjectiles, (player, fb) => {
      fb.destroy();
      if (!this.invulnerable) this.damagePlayer();
    });

    // --- camera ---
    this.cameras.main.setBounds(0, 0, cfg.width, cfg.height);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12, -200, 40);

    // --- input ---
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE,F');

    this.callbacks.onHeartsChange(this.hearts);
  }

  createFortGate(cfg) {
    const gateX = cfg.flagX;
    const gateY = cfg.groundY;
    const color = Phaser.Display.Color.HexStringToColor(this.friend.color).color;
    const towerW = 46;
    const towerH = 130;

    [-68, 68].forEach((dx) => {
      const tower = this.add.rectangle(gateX + dx, gateY - towerH / 2, towerW, towerH, 0x3a2a5c);
      tower.setStrokeStyle(2, 0x241542, 0.8);
      for (let i = -1; i <= 1; i++) {
        this.add.rectangle(gateX + dx + i * 15, gateY - towerH - 7, 11, 14, 0x3a2a5c).setStrokeStyle(2, 0x241542, 0.8);
      }
    });

    const gate = this.add.rectangle(gateX, gateY - 55, 74, 112, 0x140b28, 1);
    gate.setStrokeStyle(3, color, 0.85);
    this.tweens.add({ targets: gate, alpha: 0.65, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.flag = this.add.zone(gateX, gateY - 55, 80, 120);
    this.physics.add.existing(this.flag, true);

    // gateX sits at flagX = width - 160 (see levelConfig.js); the interior wall
    // (75px half-width) needs to stay inside the world bounds at `width`.
    this.interiorX = gateX + 75;
  }

  createInteriorWall(cfg) {
    const wallX = this.interiorX;
    const wallY = cfg.groundY - 95;
    const color = Phaser.Display.Color.HexStringToColor(this.friend.color).color;

    const backdrop = this.add.rectangle(0, 0, 150, 195, 0x2a1b4d, 1);
    backdrop.setStrokeStyle(3, color, 0.5);
    const backdropInner = this.add.rectangle(0, 0, 130, 175, 0x33215c, 1);

    const frameOuter = this.add.rectangle(0, -25, 96, 96, 0xffd166);
    const frameInner = this.add.rectangle(0, -25, 84, 84, 0x1a1035);

    const photoKey = this.friend.photoTogether
      ? `together-friend-${this.friend.id}`
      : this.friend.photoSolo
      ? `face-friend-${this.friend.id}`
      : null;
    let photoContent;
    if (photoKey && this.textures.exists(photoKey)) {
      photoContent = this.add.image(0, -25, photoKey);
      photoContent.setDisplaySize(78, 78);
    } else {
      photoContent = this.add.rectangle(0, -25, 78, 78, color);
      this.add
        .text(0, -25, this.friend.name.trim().charAt(0).toUpperCase() || '?', {
          fontFamily: 'Quicksand, sans-serif',
          fontSize: '30px',
          fontStyle: '700',
          color: '#2b1140',
        })
        .setOrigin(0.5)
        .setDepth(1);
    }

    const nameText = this.add
      .text(0, 40, this.friend.name, {
        fontFamily: 'Quicksand, sans-serif',
        fontSize: '15px',
        fontStyle: '700',
        color: '#ffd166',
      })
      .setOrigin(0.5);

    const sparkleL = this.add.circle(-55, -30, 3, 0xffd166, 0.9);
    const sparkleR = this.add.circle(55, -10, 3, 0xff8fab, 0.9);
    this.tweens.add({ targets: [sparkleL, sparkleR], alpha: 0.3, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.interiorWall = this.add.container(wallX, wallY, [
      backdrop,
      backdropInner,
      sparkleL,
      sparkleR,
      frameOuter,
      frameInner,
      photoContent,
      nameText,
    ]);
    this.interiorWall.setAlpha(0);
    this.interiorWall.setScale(0.7);
  }

  enterFort() {
    if (this.enteringFort || this.completed) return;
    this.enteringFort = true;
    this.inputLocked = true;
    this.player.body.setVelocityX(140);

    this.cameras.main.stopFollow();
    this.cameras.main.pan(this.interiorX, this.cameras.main.midPoint.y, 1100, 'Sine.easeInOut');

    this.time.delayedCall(650, () => {
      if (this.player.body) this.player.body.setVelocityX(0);
    });
    this.time.delayedCall(1100, () => this.revealFrame());
  }

  revealFrame() {
    this.tweens.add({
      targets: this.interiorWall,
      alpha: 1,
      scale: 1,
      duration: 550,
      ease: 'Back.easeOut',
    });
    this.time.delayedCall(1900, () => this.completeLevel());
  }

  spawnMiniBoss(cfg) {
    const type = ANIMAL_TYPES[this.levelIndex % ANIMAL_TYPES.length];
    const baseKey = `animal-boss-${type}`;
    ensureAnimalTexture(this, type, baseKey, BOSS_ANIMAL_SIZE);

    const guardX = cfg.flagX - 110;
    const guardian = this.physics.add.sprite(guardX, cfg.groundY - BOSS_ANIMAL_SIZE.height / 2, `${baseKey}-idle`);
    guardian.body.setAllowGravity(false);
    guardian.body.setSize(BOSS_ANIMAL_SIZE.width * 0.7, BOSS_ANIMAL_SIZE.height * 0.7);
    guardian.body.setOffset(BOSS_ANIMAL_SIZE.width * 0.15, BOSS_ANIMAL_SIZE.height * 0.3);
    guardian.baseKeyName = baseKey;
    // Kept inside the guaranteed-solid ground before the gate (see SAFE_END
    // in levelConfig.js) so the patrol never drifts out over a gap.
    guardian.startX = guardX - 45;
    guardian.endX = guardX + 45;
    guardian.body.setVelocityX(60 + this.levelIndex * 2);
    guardian.isBoss = true;
    guardian.hp = BOSS_HP;
    this.enemyGroup.add(guardian);
    this.bossGuardian = guardian;

    this.bossHpPips = [0, 1, 2].map((i) =>
      this.add.circle(guardX - 14 + i * 14, cfg.groundY - BOSS_ANIMAL_SIZE.height - 14, 5, 0xff5d5d)
    );

    this.bossThrowTimer = this.time.addEvent({
      delay: Math.max(1300, 2200 - this.levelIndex * 40),
      callback: () => this.bossThrow(guardian),
      loop: true,
    });
  }

  bossThrow(guardian) {
    if (!guardian.active || this.completed) return;
    const dir = this.player.x < guardian.x ? -1 : 1;
    const fb = this.add.circle(guardian.x, guardian.y - 4, 7, 0xff6b35);
    fb.setStrokeStyle(2, 0xffd166, 0.8);
    this.physics.add.existing(fb);
    this.bossProjectiles.add(fb);
    fb.body.setAllowGravity(false);
    fb.body.setVelocityX(dir * 190);
    this.time.delayedCall(2600, () => {
      if (fb.active) fb.destroy();
    });
  }

  // Called by the on-screen shoot button (see main.js), alongside the F key.
  requestShoot() {
    this.shootRequested = true;
  }

  shoot() {
    const dir = this.player.flipX ? -1 : 1;
    const color = Phaser.Display.Color.HexStringToColor(this.friend.color).color;
    // Fired low (near the player's waist, not chest) so it actually lines up
    // with the short, ground-hugging animal enemies' collision boxes -- a
    // higher spawn point flew clean over their backs every time.
    const proj = this.add.circle(this.player.x + dir * 18, this.player.y + 10, 8, color);
    proj.setStrokeStyle(2, 0xffffff, 0.6);
    this.physics.add.existing(proj);
    this.playerProjectiles.add(proj);
    proj.body.setAllowGravity(false);
    proj.body.setVelocityX(dir * 420);
    this.time.delayedCall(1000, () => {
      if (proj.active) proj.destroy();
    });
  }

  drawBackground(cfg) {
    for (let i = 0; i < Math.ceil(cfg.width / 400) + 1; i++) {
      const hill = this.add.ellipse(i * 400 + 100, cfg.groundY + 60, 500, 220, PALETTE.bgHill1);
      hill.setScrollFactor(0.25);
      const hill2 = this.add.ellipse(i * 400 + 300, cfg.groundY + 90, 400, 180, PALETTE.bgHill2);
      hill2.setScrollFactor(0.45);
    }
    for (let i = 0; i < 24; i++) {
      const star = this.add.circle(Math.random() * cfg.width, Math.random() * (cfg.groundY - 60), 1.6, 0xffffff, 0.6);
      star.setScrollFactor(0.6);
    }
  }

  handleEnemyHit(player, enemy) {
    if (this.invulnerable) return;
    const stomped = player.body.velocity.y > 0 && player.y < enemy.y - 6;
    if (stomped) {
      this.damageEnemy(enemy);
      this.player.body.setVelocityY(-360);
    } else {
      this.damagePlayer();
    }
  }

  damageEnemy(enemy) {
    if (!enemy.active || enemy.justHit) return;
    if (enemy.isBoss) {
      enemy.hp -= 1;
      enemy.justHit = true;
      this.time.delayedCall(300, () => {
        if (enemy.active) enemy.justHit = false;
      });
      this.updateBossPips(enemy);
      this.tweens.add({ targets: enemy, alpha: 0.3, duration: 90, yoyo: true, repeat: 2 });
      if (enemy.hp <= 0) this.defeatMiniBoss(enemy);
    } else {
      enemy.destroy();
    }
  }

  updateBossPips(enemy) {
    this.bossHpPips.forEach((pip, i) => {
      pip.fillColor = i < enemy.hp ? 0xff5d5d : 0x4a3570;
    });
  }

  defeatMiniBoss(enemy) {
    this.miniBossDefeated = true;
    if (this.bossThrowTimer) this.bossThrowTimer.remove();
    enemy.body.enable = false;
    this.enemyGroup.remove(enemy);
    this.bossHpPips.forEach((p) => p.destroy());
    this.bossHpPips = [];
    this.tweens.add({
      targets: enemy,
      alpha: 0,
      scale: 0.3,
      duration: 400,
      ease: 'Back.easeIn',
      onComplete: () => enemy.destroy(),
    });
  }

  damagePlayer() {
    if (this.invulnerable) return;
    this.hearts -= 1;
    if (this.hearts <= 0) this.hearts = 3;
    this.callbacks.onHeartsChange(this.hearts);
    this.respawnPlayer();
  }

  respawnPlayer() {
    this.invulnerable = true;
    this.player.setPosition(this.cfg.spawnX, this.cfg.groundY - 100);
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

  completeLevel() {
    if (this.completed) return;
    this.completed = true;
    // Deferred to update(): calling the completion callback (which stops this
    // scene) synchronously from inside a physics overlap callback corrupts
    // other group-vs-group checks still pending in the same physics step.
    this.pendingComplete = true;
  }

  update(time) {
    if (this.pendingComplete) {
      this.pendingComplete = false;
      this.callbacks.onComplete(this.levelIndex);
      return;
    }
    if (this.completed) return;
    const { cursors, keys, player } = this;

    if (!this.inputLocked) {
      const left = cursors.left.isDown || keys.A.isDown;
      const right = cursors.right.isDown || keys.D.isDown;
      const jumpKey = cursors.up.isDown || keys.W.isDown || keys.SPACE.isDown;

      if (left) player.body.setVelocityX(-200);
      else if (right) player.body.setVelocityX(200);
      else player.body.setVelocityX(0);

      const grounded = player.body.blocked.down || player.body.touching.down;
      if (jumpKey && grounded && !this.jumpLock) {
        player.body.setVelocityY(-560);
        this.jumpLock = true;
      }
      if (!jumpKey) this.jumpLock = false;

      if ((keys.F.isDown || this.shootRequested) && time - this.lastShotAt > SHOOT_COOLDOWN) {
        this.shoot();
        this.lastShotAt = time;
      }
    }
    this.shootRequested = false;

    const onGround = player.body.blocked.down || player.body.touching.down;

    animateHumanoid(player, { onGround, time, baseKey: 'hero' });
    if (this.wand) {
      const dir = player.flipX ? -1 : 1;
      this.wand.setPosition(player.x + dir * 14, player.y + 12);
      this.wand.setFlipX(player.flipX);
    }
    if (this.playerFace) {
      this.playerFace.setPosition(player.x, player.y + this.playerFaceOffsetY * player.scaleY);
    }

    // fell into a pit
    if (player.y > this.cfg.groundY + 300) {
      this.damagePlayer();
    }

    // mini-boss HP pips follow it as it patrols
    if (this.bossGuardian && this.bossGuardian.active) {
      this.bossHpPips.forEach((pip, i) => {
        pip.x = this.bossGuardian.x - 14 + i * 14;
      });
    }

    // enemy patrol turnaround
    this.enemyGroup.children.each((enemy) => {
      if (!enemy.active) return;
      if (enemy.x <= enemy.startX) enemy.body.setVelocityX(Math.abs(enemy.body.velocity.x));
      if (enemy.x >= enemy.endX) enemy.body.setVelocityX(-Math.abs(enemy.body.velocity.x));
      animateHumanoid(enemy, { onGround: true, time, baseKey: enemy.baseKeyName });
    });
  }
}
