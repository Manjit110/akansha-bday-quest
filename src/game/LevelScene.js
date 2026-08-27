import Phaser from 'phaser';
import { generateLevel } from './levelConfig.js';
import { ensureHeroTexture, ensureImpTexture, animateHumanoid, headGeometry, HERO_SIZE, IMP_SIZE } from './humanoid.js';
import { ensureAnimalTexture, ANIMAL_TYPES, BOSS_ANIMAL_SIZE } from './animals.js';
import { createFaceOverlay } from './faceOverlay.js';
import { ensureWandTexture } from './weapon.js';
import { createAmbientSparkles } from './particles.js';
import { mixColors } from './color.js';
import { getLevelTheme } from './levelThemes.js';
import { assetUrl } from '../assetPath.js';

const PALETTE = {
  ground: 0x4a3570,
  groundTop: 0x6a4fa0,
  platform: 0x3a2a5c,
};

// The face shown on the player is enlarged relative to the drawn head, so
// it reads clearly at this small sprite scale (and just looks fun/chibi).
const PLAYER_FACE_SCALE = 1.8;
const SHOOT_COOLDOWN = 380;
const BOSS_HP = 3;

// How often the mini-boss throws a fireball, in ms. Ramps down slightly
// with level difficulty but never below the floor -- kept slow/gentle on
// purpose (this is a birthday gift, not meant to be genuinely hard).
const BOSS_FIRE_DELAY_BASE = 3200;
const BOSS_FIRE_DELAY_STEP = 50;
const BOSS_FIRE_DELAY_MIN = 2200;

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
    // This scene instance is reused for every level (Phaser keeps one
    // instance per scene class alive for the game's lifetime rather than
    // creating a fresh one per scene.start() call), so any flag set while
    // finishing the previous level has to be explicitly reset here -- these
    // three used to leak across levels and left her frozen (inputLocked)
    // the moment the next level loaded.
    this.enteringFort = false;
    this.inputLocked = false;
    this.jumpLock = false;
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
    this.theme = getLevelTheme(this.levelIndex);

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

    // --- goal: a small fort gate; entering leads into the memory room ---
    this.createFortGate(cfg);

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

  // Horizontal stone courses with offset mortar joints -- reads as
  // textured brick/stone from gameplay distance without needing a real
  // texture asset. Colors come from the level's theme (see
  // levelThemes.js), so the fort's stone matches its surrounding biome.
  drawStoneTexture(x, y, w, h) {
    const { stone, stoneDark, stoneLight } = this.theme;
    const rows = Math.max(4, Math.round(h / 15));
    const rowH = h / rows;
    for (let r = 0; r < rows; r++) {
      const rowY = y - h / 2 + rowH * r + rowH / 2;
      const shade = r % 3 === 0 ? stoneLight : r % 3 === 1 ? stone : stoneDark;
      this.add.rectangle(x, rowY, w - 2, rowH - 2, shade);
      const jointX = x + (r % 2 === 0 ? -w * 0.18 : w * 0.18);
      this.add.rectangle(jointX, rowY, 2, rowH - 3, stoneDark, 0.6);
    }
    this.add.rectangle(x, y, w, h, 0x000000, 0).setStrokeStyle(2, stoneDark, 0.9);
  }

  createFortGate(cfg) {
    const gateX = cfg.flagX;
    const gateY = cfg.groundY;
    const color = Phaser.Display.Color.HexStringToColor(this.friend.color).color;
    const { stoneDark, stoneLight } = this.theme;
    const towerW = 46;
    const towerH = 130;

    [-68, 68].forEach((dx) => {
      const tx = gateX + dx;
      this.drawStoneTexture(tx, gateY - towerH / 2, towerW, towerH);
      for (let i = -1; i <= 1; i++) {
        this.add.rectangle(tx + i * 15, gateY - towerH - 7, 11, 14, stoneDark).setStrokeStyle(1, 0x140b28, 0.8);
      }

      // a little pennant flying from each tower, colored for this friend
      const poleTopY = gateY - towerH - 34;
      this.add.rectangle(tx, poleTopY + 12, 2, 26, stoneLight, 0.9);
      const flag = this.add.triangle(tx, poleTopY, 0, 0, 20, 6, 0, 12, color);
      this.tweens.add({ targets: flag, scaleX: 0.8, duration: 480 + Math.random() * 200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

      // a little ivy climbing the base, for texture against all that stone
      for (let v = 0; v < 3; v++) {
        this.add
          .circle(tx + (dx < 0 ? towerW / 2 - 2 : -towerW / 2 + 2), gateY - 10 - v * 16, 5, 0x4a7a4f, 0.7)
          .setScrollFactor(1);
      }
    });

    // arched stone doorway instead of a plain rectangle
    const gateW = 74;
    const gateH = 112;
    const gateTopY = gateY - gateH;
    const archG = this.add.graphics();
    archG.fillStyle(0x140b28, 1);
    archG.fillRoundedRect(gateX - gateW / 2, gateTopY, gateW, gateH, { tl: gateW / 2, tr: gateW / 2, bl: 0, br: 0 });
    archG.lineStyle(3, color, 0.9);
    archG.strokeRoundedRect(gateX - gateW / 2, gateTopY, gateW, gateH, { tl: gateW / 2, tr: gateW / 2, bl: 0, br: 0 });
    this.tweens.add({ targets: archG, alpha: 0.65, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.rectangle(gateX, gateTopY, 14, 10, stoneLight).setAngle(45);

    // torches flanking the doorway
    [-38, 38].forEach((dx) => {
      const tx = gateX + dx;
      const ty = gateY - 30;
      this.add.rectangle(tx, ty + 10, 5, 24, 0x2a1f3a);
      const glow = this.add.circle(tx, ty - 8, 16, 0xff9f45, 0.3);
      const flame = this.add.ellipse(tx, ty - 8, 10, 16, 0xff9f45);
      const flameCore = this.add.ellipse(tx, ty - 6, 5, 9, 0xffd166);
      this.tweens.add({ targets: [flame, flameCore], scaleY: 0.8, scaleX: 0.9, duration: 240 + Math.random() * 160, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: glow, alpha: 0.12, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    this.flag = this.add.zone(gateX, gateY - 55, 80, 120);
    this.physics.add.existing(this.flag, true);

    // gateX sits at flagX = width - 160 (see levelConfig.js); keep the
    // walk-in target comfortably inside the world bounds at `width`.
    this.interiorX = gateX + 60;
  }

  // She walks into the gate, the camera eases forward with her, then she
  // fades out through the doorway -- the actual reveal happens in
  // RevealRoomScene, which takes over the whole screen next.
  enterFort() {
    if (this.enteringFort) return;
    this.enteringFort = true;
    this.inputLocked = true;
    this.player.body.setVelocityX(140);

    this.cameras.main.stopFollow();
    this.cameras.main.pan(this.interiorX, this.cameras.main.midPoint.y, 700, 'Sine.easeInOut');

    this.time.delayedCall(550, () => {
      if (this.player.body) this.player.body.setVelocityX(0);
    });
    this.time.delayedCall(750, () => this.fadeIntoDoor());
  }

  fadeIntoDoor() {
    const targets = [this.player, this.wand];
    if (this.playerFace) targets.push(this.playerFace.image);
    this.tweens.add({
      targets,
      alpha: 0,
      scale: 0.6,
      duration: 450,
      ease: 'Sine.easeIn',
      onComplete: () => this.enterRoom(),
    });
  }

  enterRoom() {
    this.scene.start('RevealRoomScene', {
      friend: this.friend,
      callbacks: { onDone: () => this.callbacks.onComplete(this.levelIndex) },
    });
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
      delay: Math.max(BOSS_FIRE_DELAY_MIN, BOSS_FIRE_DELAY_BASE - this.levelIndex * BOSS_FIRE_DELAY_STEP),
      callback: () => this.bossThrow(guardian),
      loop: true,
    });
  }

  bossThrow(guardian) {
    if (!guardian.active || this.enteringFort) return;
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
    // Each level picks one of a handful of environments (mountains, city,
    // forest, desert, rolling hills) by index, then that theme's own
    // palette is tinted a little further toward this friend's color -- so
    // levels vary by biome *and* still feel personal, rather than all 19
    // sharing one backdrop. Each theme draws its own sky gradient/glow/haze
    // (see levelThemes.js), so there's no flat background color to set here.
    const friendColor = Phaser.Display.Color.HexStringToColor(this.friend.color).color;
    const theme = this.theme;
    const palette = {
      layer1: mixColors(theme.layer1, friendColor, 0.2),
      layer2: mixColors(theme.layer2, friendColor, 0.2),
      skyTop: mixColors(theme.sky, friendColor, 0.1),
      skyHorizon: mixColors(theme.skyHorizon, friendColor, 0.12),
      accent: mixColors(theme.stoneLight, friendColor, 0.5),
    };

    theme.draw(this, cfg, palette);

    for (let i = 0; i < 24; i++) {
      const star = this.add.circle(Math.random() * cfg.width, Math.random() * (cfg.groundY - 60), 1.6, 0xffffff, 0.6);
      star.setScrollFactor(0.6);
      if (Math.random() < 0.35) {
        this.tweens.add({ targets: star, alpha: 0.15, duration: 900 + Math.random() * 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    }

    // Deliberately NOT tinted with friendColor like the sky/hills above --
    // a sparkle in the same hue as its background nearly disappears, so
    // this stays a fixed warm palette that reads against any sky tint.
    createAmbientSparkles(this, {
      x: 0,
      y: 30,
      width: cfg.width,
      height: cfg.groundY - 90,
      scrollFactor: 0.7,
    });
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

  update(time) {
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
