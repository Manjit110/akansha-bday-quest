import Phaser from 'phaser';
import './style.css';
import { friends, finaleNote } from './data/friends.js';
import { assetUrl } from './assetPath.js';
import LevelScene from './game/LevelScene.js';
import BossScene, { DRAGON_HP } from './game/BossScene.js';
import RevealRoomScene from './game/RevealRoomScene.js';

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
const btnShoot = document.getElementById('btn-shoot');
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
      node.addEventListener('click', () => revisitFriend(i));
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
    scene: [LevelScene, BossScene, RevealRoomScene],
  });
  // Opt-in hook for scripts/check-levels.mjs: it sets this flag via
  // page.addInitScript() before the page loads, so it can drive scenes
  // directly. Never set for a real player, so this is a no-op for her.
  if (window.__EXPOSE_GAME_FOR_TESTS__) {
    window.__testGame = game;
  }
  return game;
}

function startLevel(index) {
  bossHpEl.style.display = 'none';
  btnShoot.style.display = 'flex';
  heartsEl.style.display = 'flex';
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
        game.scene.stop('RevealRoomScene');
        game.scene.stop('LevelScene');
        showScreen('screen-map');
        renderMap();
      },
    },
  });
}

// Revisiting an already-rescued friend from the map replays just the
// memory room (photo + messages), skipping the level itself.
function revisitFriend(index) {
  bossHpEl.style.display = 'none';
  btnShoot.style.display = 'none';
  showScreen('screen-game');
  ensureGame();
  game.scene.start('RevealRoomScene', {
    friend: friends[index],
    callbacks: {
      onDone: () => {
        game.scene.stop('RevealRoomScene');
        showScreen('screen-map');
        renderMap();
      },
    },
  });
}

function startBoss() {
  bossHpEl.style.display = 'flex';
  btnShoot.style.display = 'none';
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

btnShoot.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (!game) return;
  const scene = game.scene.getScene('LevelScene');
  if (scene && scene.scene.isActive() && typeof scene.requestShoot === 'function') {
    scene.requestShoot();
  }
});

btnQuit.addEventListener('click', () => {
  if (game) {
    game.scene.stop('LevelScene');
    game.scene.stop('BossScene');
    game.scene.stop('RevealRoomScene');
  }
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

// Cheat code for jumping straight to any level without playing through the
// ones before it: open the game with ?level=N (matching the number shown on
// the map, 1-19) or ?level=boss for the dragon fight. Doesn't touch saved
// progress -- completing a level this way still unlocks it normally.
function applyCheatCode() {
  const level = new URLSearchParams(window.location.search).get('level');
  if (!level) return;
  if (level.toLowerCase() === 'boss') {
    startBoss();
    return;
  }
  const idx = parseInt(level, 10) - 1;
  if (Number.isInteger(idx) && idx >= 0 && idx < friends.length) {
    startLevel(idx);
  }
}

renderMap();
applyCheatCode();
