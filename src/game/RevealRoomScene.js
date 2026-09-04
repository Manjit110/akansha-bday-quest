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

const FLOWER_EMOJI = ['🌸', '🌺', '🌼', '🌷', '🌻'];

// Text cards (birthday wish, first impression, etc) got noticeably
// bigger, and their font noticeably smaller, once real long-form answers
// started coming in -- some run to several hundred words, and the
// original 480x190 card at 26px was sized around short one-liners.
const TEXT_CARD_W = 520;
const TEXT_CARD_H = 280;
const TEXT_CARD_FONT_SIZE = 23;
// The body text's own vertical budget within the card, after the
// icon/label header and bottom margin -- used both to render and (see
// splitIntoPages) to decide where a long answer needs to break into a
// second card rather than overflow the frame.
const TEXT_CARD_BODY_MAX_HEIGHT = 190;
const TEXT_STYLE = {
  fontFamily: 'Caveat, cursive',
  fontSize: `${TEXT_CARD_FONT_SIZE}px`,
  fontStyle: '600',
  color: '#3a2a3a',
  align: 'center',
  wordWrap: { width: TEXT_CARD_W - 70 },
};

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
    // Was a single flat backdrop color -- now a banded gradient (see
    // levelThemes.drawSkyGradient for why bands instead of
    // Graphics.fillGradientStyle, which renders wrong under the Canvas
    // fallback) from deep indigo through magenta into a warm rose-gold,
    // so the room reads as a lot more colorful than a flat tint.
    const backdropTop = mixColors(0x201238, friendColor, 0.18);
    const backdropMid = mixColors(0x5a2168, friendColor, 0.26);
    const backdropLow = mixColors(0x8a3f5c, friendColor, 0.22);
    const floor = mixColors(0x3a2a5c, friendColor, 0.14);
    const pillar = mixColors(0x33215c, friendColor, 0.14);
    this.cameras.main.setBackgroundColor(backdropTop);

    this.drawBackdropGradient(backdropTop, backdropMid, backdropLow);
    this.drawFloatingPetals();
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

  drawBackdropGradient(topColor, midColor, lowColor) {
    const bands = 18;
    const bandH = H / bands;
    for (let i = 0; i < bands; i++) {
      const t = i / (bands - 1);
      // Two-stage mix: indigo->magenta for the top half, magenta->rose for
      // the bottom half.
      const bandColor = t < 0.55 ? mixColors(topColor, midColor, t / 0.55) : mixColors(midColor, lowColor, (t - 0.55) / 0.45);
      this.add.rectangle(W / 2, i * bandH + bandH / 2, W, bandH + 1, bandColor);
    }
  }

  // A handful of oversized, softly drifting flower emoji behind everything
  // else in the room -- pure color/atmosphere, not tied to any friend.
  drawFloatingPetals() {
    const spots = [
      { x: 90, y: 130 },
      { x: W - 100, y: 150 },
      { x: 60, y: H - 160 },
      { x: W - 70, y: H - 190 },
      { x: W * 0.5 - 180, y: 110 },
      { x: W * 0.5 + 200, y: H - 150 },
    ];
    spots.forEach(({ x, y }, i) => {
      const emoji = FLOWER_EMOJI[i % FLOWER_EMOJI.length];
      const petal = this.add
        .text(x, y, emoji, { fontSize: `${20 + (i % 3) * 6}px` })
        .setOrigin(0.5)
        .setAlpha(0.22);
      this.tweens.add({
        targets: petal,
        y: y - 16,
        angle: i % 2 === 0 ? 10 : -10,
        duration: 2400 + i * 260,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: i * 180,
      });
    });
  }

  // Small flower-emoji "garland" run along one edge of a card, used four
  // times (top/bottom/left/right) to frame it -- built as one Text per edge
  // (space-separated, not letterSpacing: Phaser's letterSpacing splits the
  // string per UTF-16 code unit, which breaks these emoji's surrogate pairs
  // in half and renders tofu instead of flowers) rather than many individual
  // emoji, so a card doesn't spawn dozens of game objects every time it's shown.
  floralBand(count) {
    return Array.from({ length: count }, (_, i) => FLOWER_EMOJI[i % FLOWER_EMOJI.length]).join(' ');
  }

  // The decorative flower border for a paper card: a garland along each
  // edge plus a bigger accent bloom pinned at each corner, sized to the
  // card's own w/h so it works for both the square photo card and the wide
  // text cards.
  addFloralBorder(w, h) {
    const bandStyle = { fontSize: '14px', color: '#ffffff' };
    const topCount = Math.max(4, Math.round(w / 30));
    const sideCount = Math.max(3, Math.round(h / 30));

    const top = this.add.text(0, -h / 2, this.floralBand(topCount), bandStyle).setOrigin(0.5);
    const bottom = this.add.text(0, h / 2, this.floralBand(topCount), bandStyle).setOrigin(0.5);
    const left = this.add.text(-w / 2, 0, this.floralBand(sideCount), bandStyle).setOrigin(0.5).setAngle(90);
    const right = this.add.text(w / 2, 0, this.floralBand(sideCount), bandStyle).setOrigin(0.5).setAngle(90);

    const cornerFlowers = ['🌷', '🌸', '🌼', '🌺'];
    const cornerAngles = [-18, 18, 18, -18];
    const corners = [
      [-w / 2, -h / 2],
      [w / 2, -h / 2],
      [-w / 2, h / 2],
      [w / 2, h / 2],
    ].map(([cx, cy], i) =>
      this.add
        .text(cx, cy, cornerFlowers[i], { fontSize: '22px' })
        .setOrigin(0.5)
        .setAngle(cornerAngles[i])
    );

    return [top, bottom, left, right, ...corners];
  }

  // A photo of the two of them together, at the bottom of the room -- or,
  // until a real photoTogether is supplied, a placeholder of the two
  // avatars side by side so the spot reads clearly as "their photo goes
  // here" rather than looking broken.
  createTogetherVisual() {
    const f = this.friend;
    const cx = W / 2;
    // Centered in the actual free gap between the cards above (bottom out
    // around y=300 at most) and the "tap to continue" hint + progress dots
    // fixed near the bottom (y=494/516) -- the old cy (H-108=432) put the
    // frame's own bottom edge and caption past both of those, so most
    // portrait photos visibly overlapped the hint text/dots. This sits
    // higher, in the space that was actually free -- nudged up a little
    // further still to make room for a bigger frame below.
    const cy = H - 178;
    const togetherKey = `together-friend-${f.id}`;
    const friendColor = Phaser.Display.Color.HexStringToColor(f.color).color;

    this.togetherGroup = [];

    if (this.textures.exists(togetherKey)) {
      // Fit the frame to the photo's own aspect ratio instead of stretching
      // every photo into one fixed landscape box -- most of these are
      // portrait shots, and forcing them into a fixed landscape frame
      // squished them noticeably. Width is where there's actual room to
      // vary, so most photos (portrait or landscape) end up height-
      // constrained and simply narrower or wider as their real proportions
      // call for, instead of distorted.
      const maxW = 230;
      const maxH = 172;
      const src = this.textures.get(togetherKey).source[0];
      const aspect = src.width / src.height;
      const frameW = aspect >= maxW / maxH ? maxW : maxH * aspect;
      const frameH = aspect >= maxW / maxH ? maxW / aspect : maxH;
      const outer = this.add.rectangle(cx, cy, frameW + 8, frameH + 8, 0xffd166);
      const photo = this.add.image(cx, cy, togetherKey);
      photo.setDisplaySize(frameW, frameH);
      const caption = this.add
        .text(cx, cy + frameH / 2 + 13, `Akansha & ${f.name}`, {
          fontFamily: 'Quicksand, sans-serif',
          fontSize: '11px',
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
    // Always her solo photo up here -- the together photo (if any) has its
    // own dedicated spot at the bottom of the room (see
    // createTogetherVisual), so showing it here too was redundant.
    const photoKey = f.photoSolo ? `face-friend-${f.id}` : null;
    const textFields = [
      { icon: '🎂', label: 'Birthday Wish', text: f.message },
      { icon: '👀', label: 'First Impression', text: f.firstImpression },
      { icon: '🤝', label: 'Where We Met', text: f.firstMet },
      { icon: '😊', label: 'Impression Now', text: f.nowImpression },
      { icon: '❤️', label: 'What She Loves About Her', text: f.quality },
    ];
    // A short one-liner stays a single card; a long-form answer (some run
    // to several hundred words) splits into multiple, numbered cards
    // instead of overflowing the frame -- reusing the same tap-to-continue
    // navigation already used to move between fields, rather than a
    // separate scrolling UI.
    const textCards = textFields.flatMap(({ icon, label, text }) => {
      const pages = this.splitIntoPages(text);
      return pages.map((pageText, i) => ({
        type: 'text',
        icon,
        label: pages.length > 1 ? `${label} (${i + 1}/${pages.length})` : label,
        text: pageText,
      }));
    });
    return [{ type: 'photo', label: f.name, photoKey }, ...textCards];
  }

  // Greedily packs a long answer into as few cards as will fit, measured
  // with a real (invisible) Text object using the exact style/wordWrap the
  // card actually renders with -- accurate regardless of font/emoji-width
  // quirks, unlike guessing from character counts. Prefers to break on a
  // blank line between paragraphs; only falls back to breaking mid-
  // paragraph (on a sentence boundary) if a single paragraph alone would
  // overflow a card by itself.
  splitIntoPages(text) {
    if (!text) return [''];
    const measurer = this.add.text(0, 0, '', TEXT_STYLE).setVisible(false);
    const fits = (s) => {
      measurer.setText(s);
      return measurer.height <= TEXT_CARD_BODY_MAX_HEIGHT;
    };

    const units = [];
    text
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .forEach((para) => {
        if (fits(para)) {
          units.push(para);
          return;
        }
        const sentences = para.split(/(?<=[.!?])\s+/);
        let chunk = '';
        sentences.forEach((s) => {
          const candidate = chunk ? `${chunk} ${s}` : s;
          if (fits(candidate) || !chunk) chunk = candidate;
          else {
            units.push(chunk);
            chunk = s;
          }
        });
        if (chunk) units.push(chunk);
      });

    const pages = [];
    let current = '';
    units.forEach((unit) => {
      const candidate = current ? `${current}\n\n${unit}` : unit;
      if (fits(candidate) || !current) current = candidate;
      else {
        pages.push(current);
        current = unit;
      }
    });
    if (current) pages.push(current);

    measurer.destroy();
    return pages.length ? pages : [''];
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
      const size = 200;
      const frame = this.paperCard(size, size, paperColor, borderColor, 10);
      const border = this.addFloralBorder(size, size);
      const inner = this.add.rectangle(0, -6, size - 24, size - 24, 0x1a1035);
      let photo;
      const parts = [frame, ...border, inner];
      if (card.photoKey && this.textures.exists(card.photoKey)) {
        // setDisplaySize alone stretches width/height independently, forcing
        // every photo into an exact square regardless of its real
        // proportions -- visibly squashing or stretching anyone whose face
        // photo wasn't already square. Crop to a centered square from the
        // source first (in source-pixel space, via setCrop), *then*
        // setDisplaySize -- since the cropped region is already square, that
        // final scale is uniform on both axes, so nothing distorts. Same
        // "fill the frame, crop the overflow" look the map avatars already
        // get from CSS object-fit: cover.
        const photoSize = size - 32;
        photo = this.add.image(0, -6, card.photoKey);
        const src = this.textures.get(card.photoKey).source[0];
        const cropSize = Math.min(src.width, src.height);
        photo.setCrop((src.width - cropSize) / 2, (src.height - cropSize) / 2, cropSize, cropSize);
        photo.setDisplaySize(photoSize, photoSize);
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
      const w = TEXT_CARD_W;
      const h = TEXT_CARD_H;
      const frame = this.paperCard(w, h, paperColor, borderColor);
      const border = this.addFloralBorder(w, h);
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
      const body = this.add.text(0, 22, card.text || '', TEXT_STYLE).setOrigin(0.5);
      this.cardContainer.add([frame, ...border, sealGlow, iconText, label, rule, body, this.addTape(h, index)]);
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
