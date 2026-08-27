import Phaser from 'phaser';
import { assetUrl } from '../assetPath.js';
import { createAmbientSparkles } from './particles.js';
import { mixColors } from './color.js';

const W = 960;
const H = 540;
// Placeholder color for Akansha's half of the "together" photo until a real
// one is supplied -- matches the hero's own gold, since she's the hero.
const AKANSHA_PLACEHOLDER_COLOR = 0xffd166;

// A slight, consistent tilt per card (like something actually pinned up),
// not a fresh random angle every time you revisit.
const CARD_ROTATIONS = [-3, 2.5, -2, 3, -2.5, 2];

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

    this.drawRoom();
    this.createTogetherVisual();

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
    const friendColor = Phaser.Display.Color.HexStringToColor(this.friend.color).color;
    const backdrop = mixColors(0x2a1b4d, friendColor, 0.14);
    const floor = mixColors(0x3a2a5c, friendColor, 0.14);
    const pillar = mixColors(0x33215c, friendColor, 0.14);
    this.cameras.main.setBackgroundColor(backdrop);

    this.add.rectangle(W / 2, H / 2, W, H, backdrop);
    this.add.rectangle(W / 2, H - 40, W, 80, floor);
    this.add.ellipse(W / 2, H - 38, 280, 44, mixColors(0x4a3570, friendColor, 0.14), 0.55);

    [70, W - 70].forEach((x) => {
      this.add.rectangle(x, H / 2, 46, H, pillar).setStrokeStyle(2, 0x241542, 0.7);
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

    // Fixed warm palette, not tinted with friendColor -- a sparkle in the
    // same hue as the now-tinted backdrop would barely show up.
    this.sparkles = createAmbientSparkles(this, {
      x: 0,
      y: 90,
      width: W,
      height: H - 180,
    });
  }

  // A photo of the two of them together, at the bottom of the room -- or,
  // until a real photoTogether is supplied, a placeholder of the two
  // avatars side by side so the spot reads clearly as "their photo goes
  // here" rather than looking broken.
  createTogetherVisual() {
    const f = this.friend;
    const cx = W / 2;
    const cy = H - 108;
    const togetherKey = `together-friend-${f.id}`;
    const friendColor = Phaser.Display.Color.HexStringToColor(f.color).color;

    this.togetherGroup = [];

    if (this.textures.exists(togetherKey)) {
      const frameW = 172;
      const frameH = 118;
      const outer = this.add.rectangle(cx, cy, frameW, frameH, 0xffd166);
      const photo = this.add.image(cx, cy, togetherKey);
      photo.setDisplaySize(frameW - 10, frameH - 10);
      const caption = this.add
        .text(cx, cy + frameH / 2 + 16, `Akansha & ${f.name}`, {
          fontFamily: 'Quicksand, sans-serif',
          fontSize: '12px',
          fontStyle: '700',
          color: '#c9b8e8',
        })
        .setOrigin(0.5);
      this.togetherGroup.push(outer, photo, caption);
    } else {
      const r = 27;
      const gap = 8;
      const leftX = cx - r - gap / 2;
      const rightX = cx + r + gap / 2;

      const akanshaCircle = this.add.circle(leftX, cy, r, AKANSHA_PLACEHOLDER_COLOR);
      akanshaCircle.setStrokeStyle(3, 0x1a1035, 1);
      const akanshaLabel = this.add
        .text(leftX, cy, 'A', { fontFamily: 'Press Start 2P, monospace', fontSize: '18px', color: '#2b1140' })
        .setOrigin(0.5);

      const friendCircle = this.add.circle(rightX, cy, r, friendColor);
      friendCircle.setStrokeStyle(3, 0x1a1035, 1);
      const friendLabel = this.add
        .text(rightX, cy, f.name.trim().charAt(0).toUpperCase() || '?', {
          fontFamily: 'Press Start 2P, monospace',
          fontSize: '18px',
          color: '#2b1140',
        })
        .setOrigin(0.5);

      const heart = this.add.text(cx, cy - r - 12, '💛', { fontSize: '15px' }).setOrigin(0.5);

      const caption = this.add
        .text(cx, cy + r + 16, `Akansha & ${f.name}`, {
          fontFamily: 'Quicksand, sans-serif',
          fontSize: '12px',
          fontStyle: '700',
          color: '#c9b8e8',
        })
        .setOrigin(0.5);

      this.togetherGroup.push(akanshaCircle, akanshaLabel, friendCircle, friendLabel, heart, caption);
    }

    this.togetherGroup.forEach((o) => o.setAlpha(0));
    this.tweens.add({ targets: this.togetherGroup, alpha: 1, duration: 500 });
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

  // A small strip of "tape" straddling the top edge, so the card reads as
  // pinned up rather than a plain UI panel.
  addTape(h, index) {
    const tape = this.add.rectangle(0, -h / 2, 46, 16, 0xfff2c7, 0.6);
    tape.setAngle(index % 2 === 0 ? -7 : 7);
    tape.setStrokeStyle(1, 0xd8c397, 0.5);
    return tape;
  }

  // A rounded, paper-like card face with a soft stacked shadow, in place of
  // a flat sharp-cornered rectangle -- reads as an actual card someone cut
  // out and pinned up, not a UI dialog box.
  paperCard(w, h, fillColor, borderColor, radius = 16) {
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.16);
    g.fillRoundedRect(-w / 2 + 9, -h / 2 + 11, w, h, radius);
    g.fillStyle(0x000000, 0.1);
    g.fillRoundedRect(-w / 2 + 4, -h / 2 + 6, w, h, radius);
    g.fillStyle(fillColor, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
    g.lineStyle(2, borderColor, 0.85);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
    // a faint folded corner, like a card that's been handled
    g.fillStyle(0x000000, 0.06);
    g.beginPath();
    g.moveTo(w / 2 - 22, -h / 2);
    g.lineTo(w / 2, -h / 2);
    g.lineTo(w / 2, -h / 2 + 22);
    g.closePath();
    g.fillPath();
    return g;
  }

  showCard(index) {
    this.cardContainer.removeAll(true);
    const card = this.cards[index];
    const color = Phaser.Display.Color.HexStringToColor(this.friend.color).color;
    const paperColor = mixColors(0xf7ecd6, color, 0.1);
    const borderColor = mixColors(0xd9c39c, color, 0.35);

    if (card.type === 'photo') {
      const size = 176;
      const frame = this.paperCard(size, size, paperColor, borderColor, 10);
      const inner = this.add.rectangle(0, -6, size - 24, size - 24, 0x1a1035);
      let photo;
      const parts = [frame, inner];
      if (card.photoKey && this.textures.exists(card.photoKey)) {
        photo = this.add.image(0, -6, card.photoKey);
        photo.setDisplaySize(size - 32, size - 32);
        parts.push(photo);
      } else {
        photo = this.add.rectangle(0, -6, size - 32, size - 32, color);
        const initial = this.add
          .text(0, -6, this.friend.name.trim().charAt(0).toUpperCase() || '?', {
            fontFamily: 'Press Start 2P, monospace',
            fontSize: '36px',
            color: '#2b1140',
          })
          .setOrigin(0.5);
        parts.push(photo, initial);
      }
      const label = this.add
        .text(0, size / 2 - 16, card.label, {
          fontFamily: 'Caveat, cursive',
          fontSize: '26px',
          fontStyle: '700',
          color: '#5a3d2a',
        })
        .setOrigin(0.5);
      parts.push(label, this.addTape(size, index));
      this.cardContainer.add(parts);
    } else {
      const w = 480;
      const h = 190;
      const frame = this.paperCard(w, h, paperColor, borderColor);
      const sealGlow = this.add.circle(-w / 2 + 42, -h / 2 + 30, 20, color, 0.18);
      const iconText = this.add.text(-w / 2 + 42, -h / 2 + 30, card.icon, { fontSize: '26px' }).setOrigin(0.5);
      const label = this.add
        .text(-w / 2 + 74, -h / 2 + 30, card.label, {
          fontFamily: 'Quicksand, sans-serif',
          fontSize: '15px',
          fontStyle: '700',
          color: '#7a4a34',
        })
        .setOrigin(0, 0.5);
      const rule = this.add.rectangle(-w / 2 + 74, -h / 2 + 46, label.width, 2, color, 0.6).setOrigin(0, 0.5);
      const body = this.add
        .text(0, 22, card.text || '', {
          fontFamily: 'Caveat, cursive',
          fontSize: '26px',
          fontStyle: '600',
          color: '#3a2a3a',
          align: 'center',
          wordWrap: { width: w - 70 },
        })
        .setOrigin(0.5);
      this.cardContainer.add([frame, sealGlow, iconText, label, rule, body, this.addTape(h, index)]);
    }

    this.cardContainer.setRotation(Phaser.Math.DegToRad(CARD_ROTATIONS[index % CARD_ROTATIONS.length]));
    this.cardContainer.setAlpha(0);

    // Alternate between a scale-in and a slide-in so consecutive reveals
    // don't all move the same way.
    if (index % 2 === 1) {
      this.cardContainer.setScale(1);
      this.cardContainer.x = W / 2 + 55;
      this.tweens.add({ targets: this.cardContainer, alpha: 1, x: W / 2, duration: 420, ease: 'Cubic.easeOut' });
    } else {
      this.cardContainer.x = W / 2;
      this.cardContainer.setScale(0.85);
      this.tweens.add({ targets: this.cardContainer, alpha: 1, scale: 1, duration: 350, ease: 'Back.easeOut' });
    }

    if (this.sparkles) this.sparkles.explode(8, this.cardContainer.x, this.cardContainer.y);
  }

  advance() {
    if (this.finishing) return;
    this.cardIndex++;
    if (this.cardIndex >= this.cards.length) {
      this.finishing = true;
      this.tweens.add({
        targets: [this.cardContainer, this.hint, ...this.togetherGroup].filter(Boolean),
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
