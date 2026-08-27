import Phaser from 'phaser';
import { ensureHeroTexture, headGeometry, HERO_SIZE } from './humanoid.js';
import { createFaceOverlay } from './faceOverlay.js';
import { assetUrl } from '../assetPath.js';

// Enlarge the character's face here too, matching LevelScene, so it's the
// same "wears the friend's face" character continuing into this scene.
const PLAYER_FACE_SCALE = 1.8;
const W = 960;
const H = 540;

export default class RevealRoomScene extends Phaser.Scene {
  constructor() {
    super('RevealRoomScene');
  }

  init(data) {
    this.friend = data.friend;
    this.callbacks = data.callbacks; // { onDone }
    this.cardIndex = 0;
    this.finishing = false;
  }

  preload() {
    if (this.friend?.photoSolo && !this.textures.exists(`face-friend-${this.friend.id}`)) {
      this.load.image(`face-friend-${this.friend.id}`, assetUrl(this.friend.photoSolo));
    }
    if (this.friend?.photoTogether && !this.textures.exists(`together-friend-${this.friend.id}`)) {
      this.load.image(`together-friend-${this.friend.id}`, assetUrl(this.friend.photoTogether));
    }
  }

  create() {
    // No combat here regardless of how we got here (finishing a level, or a
    // revisit from the map) -- hide HUD elements that don't apply.
    const heartsEl = document.getElementById('hearts');
    if (heartsEl) heartsEl.style.display = 'none';
    const btnShoot = document.getElementById('btn-shoot');
    if (btnShoot) btnShoot.style.display = 'none';

    this.cameras.main.setBackgroundColor('#1a1035');
    this.drawRoom();

    ensureHeroTexture(this);
    this.character = this.add.image(W / 2, H - 90, 'hero-idle');
    this.character.setAlpha(0);
    this.tweens.add({ targets: this.character, alpha: 1, duration: 500 });
    this.tweens.add({ targets: this.character, y: '-=5', duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const heroHead = headGeometry(HERO_SIZE);
    this.charFace = createFaceOverlay(this, {
      textureKey: `face-friend-${this.friend.id}`,
      radius: heroHead.radius * PLAYER_FACE_SCALE,
    });
    if (this.charFace) {
      this.charFace.setPosition(this.character.x, this.character.y + heroHead.offsetY);
      this.charFace.image.setAlpha(0);
      this.tweens.add({ targets: this.charFace.image, alpha: 1, duration: 500 });
    }

    this.cards = this.buildCards();
    this.cardContainer = this.add.container(W / 2, 160);
    this.showCard(0);

    // fillAlpha here is baked into the shape and separate from the
    // GameObject's own .alpha -- always create at full fill alpha and do all
    // dimming via setAlpha() below, so brightening later actually works.
    const dotSpacing = 16;
    this.progressDots = this.cards.map((_, i) => {
      const dot = this.add.circle(W / 2 - ((this.cards.length - 1) * dotSpacing) / 2 + i * dotSpacing, H - 24, 4, 0xffffff, 1);
      dot.setAlpha(i === 0 ? 1 : 0.3);
      return dot;
    });

    this.hint = this.add
      .text(W / 2, H - 46, 'tap to continue ▶', {
        fontFamily: 'Quicksand, sans-serif',
        fontSize: '13px',
        color: '#c9b8e8',
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: this.hint, alpha: 0.4, duration: 800, yoyo: true, repeat: -1 });

    this.input.on('pointerdown', () => this.advance());
    this.spaceKey = this.input.keyboard.addKey('SPACE');
  }

  drawRoom() {
    this.add.rectangle(W / 2, H / 2, W, H, 0x2a1b4d);
    this.add.rectangle(W / 2, H - 40, W, 80, 0x3a2a5c);
    this.add.ellipse(W / 2, H - 38, 280, 44, 0x4a3570, 0.55);

    [70, W - 70].forEach((x) => {
      this.add.rectangle(x, H / 2, 46, H, 0x33215c).setStrokeStyle(2, 0x241542, 0.7);
      this.add.rectangle(x, 24, 70, 30, 0x241542);
      this.add.rectangle(x, H - 72, 70, 20, 0x241542);
    });

    this.add.rectangle(W / 2, 0, W, 90, 0x140b28, 0.7).setOrigin(0.5, 0);

    [W * 0.28, W * 0.72].forEach((x) => {
      this.add.rectangle(x, 30, 2, 28, 0x5a4a7a);
      const glow = this.add.circle(x, 60, 10, 0xffd166, 0.85);
      this.tweens.add({ targets: glow, alpha: 0.4, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    for (let i = 0; i < 18; i++) {
      this.add.circle(Math.random() * W, Math.random() * 90 + 8, 1.4, 0xffffff, 0.5);
    }
  }

  buildCards() {
    const f = this.friend;
    const photoKey = f.photoTogether ? `together-friend-${f.id}` : f.photoSolo ? `face-friend-${f.id}` : null;
    return [
      { type: 'photo', label: f.name, photoKey },
      { icon: '🎂', label: 'Birthday Wish', text: f.message },
      { icon: '👀', label: 'First Impression', text: f.firstImpression },
      { icon: '🤝', label: 'Where We Met', text: f.firstMet },
      { icon: '😊', label: 'Impression Now', text: f.nowImpression },
      { icon: '❤️', label: 'What She Loves About Her', text: f.quality },
    ];
  }

  showCard(index) {
    this.cardContainer.removeAll(true);
    const card = this.cards[index];
    const color = Phaser.Display.Color.HexStringToColor(this.friend.color).color;

    if (card.type === 'photo') {
      const size = 176;
      const outer = this.add.rectangle(0, 0, size, size, 0xffd166);
      const inner = this.add.rectangle(0, 0, size - 12, size - 12, 0x1a1035);
      let photo;
      if (card.photoKey && this.textures.exists(card.photoKey)) {
        photo = this.add.image(0, 0, card.photoKey);
        photo.setDisplaySize(size - 22, size - 22);
      } else {
        photo = this.add.rectangle(0, 0, size - 22, size - 22, color);
        const initial = this.add
          .text(0, 0, this.friend.name.trim().charAt(0).toUpperCase() || '?', {
            fontFamily: 'Press Start 2P, monospace',
            fontSize: '40px',
            color: '#2b1140',
          })
          .setOrigin(0.5);
        this.cardContainer.add(initial);
      }
      const label = this.add
        .text(0, size / 2 + 26, card.label, {
          fontFamily: 'Press Start 2P, monospace',
          fontSize: '14px',
          color: '#ffd166',
        })
        .setOrigin(0.5);
      this.cardContainer.add([outer, inner, photo, label]);
    } else {
      const w = 480;
      const h = 190;
      const frame = this.add.rectangle(0, 0, w, h, 0x33215c);
      frame.setStrokeStyle(4, 0xffd166, 0.9);
      const iconText = this.add.text(0, -h / 2 + 26, card.icon, { fontSize: '26px' }).setOrigin(0.5);
      const label = this.add
        .text(0, -h / 2 + 56, card.label, {
          fontFamily: 'Quicksand, sans-serif',
          fontSize: '15px',
          fontStyle: '700',
          color: '#7fe7d6',
        })
        .setOrigin(0.5);
      const body = this.add
        .text(0, 12, card.text || '', {
          fontFamily: 'Quicksand, sans-serif',
          fontSize: '16px',
          color: '#fdf6ff',
          align: 'center',
          wordWrap: { width: w - 60 },
        })
        .setOrigin(0.5);
      this.cardContainer.add([frame, iconText, label, body]);
    }

    this.cardContainer.setAlpha(0);
    this.cardContainer.setScale(0.85);
    this.tweens.add({ targets: this.cardContainer, alpha: 1, scale: 1, duration: 350, ease: 'Back.easeOut' });
  }

  advance() {
    if (this.finishing) return;
    this.cardIndex++;
    if (this.cardIndex >= this.cards.length) {
      this.finishing = true;
      this.tweens.add({
        targets: [this.cardContainer, this.character, this.charFace?.image, this.hint].filter(Boolean),
        alpha: 0,
        duration: 400,
        onComplete: () => this.callbacks.onDone(),
      });
      return;
    }
    this.progressDots.forEach((d, i) => d.setAlpha(i <= this.cardIndex ? 1 : 0.3));
    this.showCard(this.cardIndex);
    if (this.cardIndex === this.cards.length - 1) {
      this.hint.setText('tap to finish ✨');
    }
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) this.advance();
  }
}
