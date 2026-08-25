import Phaser from 'phaser';
import { generateLevel } from './levelConfig.js';
import {
  ensureHeroTexture,
  ensureImpTexture,
  ensureNpcTexture,
  animateHumanoid,
  headGeometry,
  HERO_SIZE,
  IMP_SIZE,
  NPC_SIZE,
} from './humanoid.js';
import { createFaceOverlay } from './faceOverlay.js';
import { player as playerConfig } from '../data/player.js';
import { assetUrl } from '../assetPath.js';

const PALETTE = {
  ground: 0x4a3570,
  groundTop: 0x6a4fa0,
  platform: 0x3a2a5c,
  bgHill1: 0x2d1b56,
  bgHill2: 0x35205f,
};

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
  }

  preload() {
    if (playerConfig.facePhoto && !this.textures.exists('face-player')) {
      this.load.image('face-player', assetUrl(playerConfig.facePhoto));
    }
    if (this.friend?.photoSolo) {
      this.load.image(`face-friend-${this.friend.id}`, assetUrl(this.friend.photoSolo));
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

    // --- goal: the friend waiting at the end of the level ---
    const friendKey = `npc-${this.friend.id}`;
    const friendColor = Phaser.Display.Color.HexStringToColor(this.friend.color).color;
    ensureNpcTexture(this, friendKey, friendColor);
    this.friendNpc = this.add.sprite(cfg.flagX, cfg.groundY - NPC_SIZE.height / 2, `${friendKey}-idle`);
    this.tweens.add({ targets: this.friendNpc, y: '-=6', duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const npcHead = headGeometry(NPC_SIZE);
    this.friendFace = createFaceOverlay(this, { textureKey: `face-friend-${this.friend.id}`, radius: npcHead.radius });
    this.friendFaceOffsetY = npcHead.offsetY;

    this.flag = this.add.zone(cfg.flagX, cfg.groundY - NPC_SIZE.height / 2, NPC_SIZE.width, NPC_SIZE.height);
    this.physics.add.existing(this.flag, true);

    // --- player ---
    ensureHeroTexture(this);
    this.player = this.physics.add.sprite(cfg.spawnX, cfg.groundY - 100, 'hero-idle');
    this.player.body.setSize(22, 46).setOffset(7, 20);
    this.player.body.setBounce(0);
    this.player.body.setMaxVelocity(260, 900);

    const heroHead = headGeometry(HERO_SIZE);
    this.playerFace = createFaceOverlay(this, { textureKey: 'face-player', radius: heroHead.radius });
    this.playerFaceOffsetY = heroHead.offsetY;

    // --- enemies ---
    ensureImpTexture(this);
    this.enemyGroup = this.physics.add.group({ allowGravity: false, immovable: false });
    cfg.enemies.forEach((e) => {
      const enemy = this.physics.add.sprite(e.x, cfg.groundY - IMP_SIZE.height / 2, 'imp-idle');
      enemy.body.setAllowGravity(false);
      enemy.body.setSize(20, 34).setOffset(5, 6);
      enemy.startX = e.x - e.range / 2;
      enemy.endX = e.x + e.range / 2;
      enemy.body.setVelocityX(e.speed);
      this.enemyGroup.add(enemy);
    });

    // --- collisions ---
    this.physics.add.collider(this.player, this.groundGroup);
    this.physics.add.collider(this.player, this.platformGroup);
    this.physics.add.overlap(this.player, this.flag, () => this.completeLevel());
    this.physics.add.overlap(this.player, this.enemyGroup, (player, enemy) => this.handleEnemyHit(player, enemy));

    // --- camera ---
    this.cameras.main.setBounds(0, 0, cfg.width, cfg.height);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12, -200, 40);

    // --- input ---
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE');

    this.callbacks.onHeartsChange(this.hearts);
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
      enemy.destroy();
      this.player.body.setVelocityY(-360);
    } else {
      this.damagePlayer();
    }
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
    this.callbacks.onComplete(this.levelIndex);
  }

  update(time) {
    if (this.completed) return;
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
    if (this.friendFace) {
      this.friendFace.setPosition(this.friendNpc.x, this.friendNpc.y + this.friendFaceOffsetY);
    }

    // fell into a pit
    if (player.y > this.cfg.groundY + 300) {
      this.damagePlayer();
    }

    // enemy patrol turnaround
    this.enemyGroup.children.each((enemy) => {
      if (!enemy.active) return;
      if (enemy.x <= enemy.startX) enemy.body.setVelocityX(Math.abs(enemy.body.velocity.x));
      if (enemy.x >= enemy.endX) enemy.body.setVelocityX(-Math.abs(enemy.body.velocity.x));
      animateHumanoid(enemy, { onGround: true, time, baseKey: 'imp' });
    });
  }
}
