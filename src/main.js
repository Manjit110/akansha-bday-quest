import Phaser from 'phaser';
import './style.css';
import { friends, finaleNote } from './data/friends.js';
import { assetUrl } from './assetPath.js';
import LevelScene from './game/LevelScene.js';
import BossScene, { DRAGON_HP } from './game/BossScene.js';

const STORAGE_KEY = 'akansha-quest-progress-v1';
const CONFETTI_COLORS = ['#ff8fab', '#ffd166', '#7fe7d6', '#c77dff', '#a0c4ff'];

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    /* ignore corrupted storage */
  }
  return { unlocked: 0, bossDefeated: false };
}

const state = loadState();

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// --- DOM refs ---
const screens = document.querySelectorAll('.screen');
const btnStart = document.getElementById('btn-start');
const mapPath = document.getElementById('map-path');
const bossNodeWrap = document.getElementById('boss-node-wrap');
const heartsEl = document.getElementById('hearts');
const bossHpEl = document.getElementById('boss-hp');
const btnQuit = document.getElementById('btn-quit-level');
const revealBanner = document.getElementById('reveal-banner');
const revealAvatar = document.getElementById('reveal-avatar');
const revealName = document.getElementById('reveal-name');
const revealMessage = document.getElementById('reveal-message');
const revealFirstMet = document.getElementById('reveal-first-met');
const revealFirstImpression = document.getElementById('reveal-first-impression');
const revealNowImpression = document.getElementById('reveal-now-impression');
const revealQuality = document.getElementById('reveal-quality');
const btnRevealContinue = document.getElementById('btn-reveal-continue');
const finaleGrid = document.getElementById('finale-grid');
const finaleNoteEl = document.getElementById('finale-note');
const confettiLayer = document.getElementById('confetti-layer');

function showScreen(id) {
  screens.forEach((s) => s.classList.toggle('active', s.id === id));
}

function initialAvatar(friend, sizePx) {
  const div = document.createElement('div');
  div.style.width = '100%';
  div.style.height = '100%';
  div.style.display = 'flex';
  div.style.alignItems = 'center';
  div.style.justifyContent = 'center';
  div.style.background = friend.color;
  div.style.color = '#2b1140';
  div.style.fontWeight = '700';
  div.style.fontSize = sizePx;
  div.textContent = friend.name.trim().charAt(0).toUpperCase() || '?';
  return div;
}

// --- map screen ---
function renderMap() {
  mapPath.innerHTML = '';
  friends.forEach((friend, i) => {
    const node = document.createElement('div');
    node.className = 'map-node';
    if (i < state.unlocked) {
      node.classList.add('done');
      if (friend.photoSolo) {
        const img = document.createElement('img');
        img.src = assetUrl(friend.photoSolo);
        img.alt = friend.name;
        node.appendChild(img);
      } else {
        node.appendChild(initialAvatar(friend, '22px'));
      }
      node.title = `Revisit ${friend.name}`;
      node.addEventListener('click', () => showReveal(i));
    } else if (i === state.unlocked) {
      node.classList.add('current');
      node.textContent = String(i + 1);
      node.title = 'Play this level';
      node.addEventListener('click', () => startLevel(i));
    } else {
      node.classList.add('locked');
      node.textContent = '🔒';
    }
    mapPath.appendChild(node);
  });

  bossNodeWrap.innerHTML = '';
  const bossNode = document.createElement('div');
  bossNode.className = 'boss-node';
  const allUnlocked = state.unlocked >= friends.length;
  if (!allUnlocked) {
    bossNode.classList.add('locked');
    bossNode.textContent = '🐉';
    bossNode.title = 'Rescue every friend first';
  } else if (state.bossDefeated) {
    bossNode.textContent = '🎉';
    bossNode.title = 'Relive the celebration';
    bossNode.addEventListener('click', showFinale);
  } else {
    bossNode.textContent = '🐉';
    bossNode.title = 'Face the dragon';
    bossNode.addEventListener('click', startBoss);
  }
  bossNodeWrap.appendChild(bossNode);
}

// --- hud ---
function renderHearts(h) {
  heartsEl.textContent = '❤️'.repeat(Math.max(0, h)) + '🖤'.repeat(Math.max(0, 3 - h));
}

function renderBossHP(current) {
  bossHpEl.textContent = '🐲'.repeat(Math.max(0, current)) + '💀'.repeat(Math.max(0, DRAGON_HP - current));
}

// --- phaser game (lazy) ---
let game = null;
function ensureGame() {
  if (game) return game;
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 960,
    height: 540,
    backgroundColor: '#1a1035',
    physics: { default: 'arcade', arcade: { gravity: { y: 1400 }, debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [LevelScene, BossScene],
  });
  return game;
}

function startLevel(index) {
  bossHpEl.style.display = 'none';
  showScreen('screen-game');
  ensureGame();
  renderHearts(3);
  game.scene.start('LevelScene', {
    levelIndex: index,
    friend: friends[index],
    totalLevels: friends.length,
    callbacks: {
      onHeartsChange: renderHearts,
      onComplete: (idx) => {
        state.unlocked = Math.max(state.unlocked, idx + 1);
        saveState();
        game.scene.stop('LevelScene');
        renderMap();
        showReveal(idx);
      },
    },
  });
}

function startBoss() {
  bossHpEl.style.display = 'flex';
  showScreen('screen-game');
  ensureGame();
  renderHearts(3);
  renderBossHP(DRAGON_HP);
  game.scene.start('BossScene', {
    callbacks: {
      onHeartsChange: renderHearts,
      onBossStart: renderBossHP,
      onDragonHit: renderBossHP,
      onVictory: () => {
        state.bossDefeated = true;
        saveState();
        game.scene.stop('BossScene');
        renderMap();
        showFinale();
      },
    },
  });
}

btnQuit.addEventListener('click', () => {
  if (game) {
    game.scene.stop('LevelScene');
    game.scene.stop('BossScene');
  }
  showScreen('screen-map');
  renderMap();
});

// --- reveal screen ---
function showReveal(index) {
  const friend = friends[index];

  // banner: photo of the two of them together, or a soft gradient placeholder
  revealBanner.innerHTML = '';
  if (friend.photoTogether) {
    revealBanner.style.backgroundImage = `url("${assetUrl(friend.photoTogether)}")`;
  } else {
    revealBanner.style.backgroundImage = '';
    const icon = document.createElement('div');
    icon.className = 'banner-placeholder-icon';
    icon.innerHTML = '🖼️<span>photo coming soon</span>';
    revealBanner.appendChild(icon);
  }

  // avatar: their solo photo, or a colored initial
  revealAvatar.textContent = '';
  revealAvatar.style.background = '';
  if (friend.photoSolo) {
    revealAvatar.style.backgroundImage = `url("${assetUrl(friend.photoSolo)}")`;
  } else {
    revealAvatar.style.backgroundImage = 'none';
    revealAvatar.style.background = friend.color;
    revealAvatar.textContent = friend.name.trim().charAt(0).toUpperCase() || '?';
  }
  revealBanner.appendChild(revealAvatar);

  revealName.textContent = friend.name;
  revealMessage.textContent = friend.message;
  revealFirstMet.textContent = friend.firstMet;
  revealFirstImpression.textContent = friend.firstImpression;
  revealNowImpression.textContent = friend.nowImpression;
  revealQuality.textContent = friend.quality;
  showScreen('screen-reveal');
}

btnRevealContinue.addEventListener('click', () => {
  showScreen('screen-map');
  renderMap();
});

// --- finale screen ---
function launchConfetti() {
  confettiLayer.innerHTML = '';
  for (let i = 0; i < 70; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + '%';
    piece.style.background = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    piece.style.animationDuration = 2.5 + Math.random() * 2.5 + 's';
    piece.style.animationDelay = Math.random() * 1.5 + 's';
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    confettiLayer.appendChild(piece);
  }
}

function showFinale() {
  finaleGrid.innerHTML = '';
  friends.forEach((friend) => {
    const node = document.createElement('div');
    node.className = 'map-node done';
    if (friend.photoSolo) {
      const img = document.createElement('img');
      img.src = assetUrl(friend.photoSolo);
      img.alt = friend.name;
      node.appendChild(img);
    } else {
      node.appendChild(initialAvatar(friend, '16px'));
    }
    node.title = friend.name;
    finaleGrid.appendChild(node);
  });
  finaleNoteEl.textContent = finaleNote;
  showScreen('screen-finale');
  launchConfetti();
}

// --- boot ---
btnStart.addEventListener('click', () => {
  showScreen('screen-map');
  renderMap();
});

renderMap();
