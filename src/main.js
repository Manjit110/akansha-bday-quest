import Phaser from 'phaser';
import './style.css';
import { friends, finaleNote } from './data/friends.js';
import { assetUrl } from './assetPath.js';
import { loadProgress, saveProgress } from './progressStore.js';
import { playSound, stopSound } from './sound.js';
import LevelScene from './game/LevelScene.js';
import BossScene, { DRAGON_HP } from './game/BossScene.js';
import RevealRoomScene from './game/RevealRoomScene.js';

const LAST_NAME_KEY = 'akansha-quest-player-name';
const CONFETTI_COLORS = ['#ff8fab', '#ffd166', '#7fe7d6', '#c77dff', '#a0c4ff'];

// Canvas text (used throughout the Phaser scenes) doesn't wait for webfonts
// on its own -- it just silently falls back if the font isn't ready yet.
// Trigger the fetch now, as early as possible, so Caveat is loaded well
// before she reaches the memory room several screens later.
if (document.fonts) {
  document.fonts.load('600 20px Caveat').catch(() => {});
}

// Progress is per-name (see progressStore.js) so several friends can each
// play through on the same shared link and keep separate progress. `state`
// holds whoever is currently playing; `currentName` is null until a name
// has actually been submitted (e.g. before the name screen, or when a
// level was opened via the ?level= preview cheat code).
let state = { unlocked: 0, bossDefeated: false };
let currentName = null;

// --- DOM refs ---
const screens = document.querySelectorAll('.screen');
const btnStart = document.getElementById('btn-start');
const btnStoryIntroContinue = document.getElementById('btn-story-intro-continue');
const btnStoryRallyContinue = document.getElementById('btn-story-rally-continue');
const levelTitleEl = document.getElementById('level-title');
const nameForm = document.getElementById('name-form');
const nameInput = document.getElementById('name-input');
const nameError = document.getElementById('name-error');
const btnNameContinue = document.getElementById('btn-name-continue');
const mapPath = document.getElementById('map-path');
const playerNameTag = document.getElementById('player-name-tag');
const bossNodeWrap = document.getElementById('boss-node-wrap');
const heartsEl = document.getElementById('hearts');
const bossHpEl = document.getElementById('boss-hp');
const btnQuit = document.getElementById('btn-quit-level');
const btnShoot = document.getElementById('btn-shoot');
const touchMove = document.getElementById('touch-move');
const btnMoveLeft = document.getElementById('btn-move-left');
const btnMoveRight = document.getElementById('btn-move-right');
const btnJump = document.getElementById('btn-jump');
const finaleGrid = document.getElementById('finale-grid');
const finaleNoteEl = document.getElementById('finale-note');
const confettiLayer = document.getElementById('confetti-layer');
const replayModal = document.getElementById('replay-modal');
const replayModalAvatar = document.getElementById('replay-modal-avatar');
const replayModalName = document.getElementById('replay-modal-name');
const btnReplayLevel = document.getElementById('btn-replay-level');
const btnViewMessages = document.getElementById('btn-view-messages');
const btnReplayClose = document.getElementById('btn-replay-close');
const rescueModal = document.getElementById('rescue-modal');
const btnRescueContinue = document.getElementById('btn-rescue-continue');

function showScreen(id) {
  screens.forEach((s) => s.classList.toggle('active', s.id === id));
}

// One delegated listener covers every button/map-node click in the game
// (title, name entry, map, replay modal, code entry) without needing a
// playSound() call wired into each individual handler. The shoot button
// and the movement/jump controls all fire their own rapid pointerdown
// separately (held or repeatedly tapped during play) and are excluded
// here so they don't spam a click sound on every shot/step/hop.
document.addEventListener('click', (e) => {
  if (e.target.closest('#btn-shoot, #btn-jump, #touch-move')) return;
  if (e.target.closest('button, .map-node, .boss-node')) playSound('click', { volume: 0.35 });
});

// Wherever the game returns to "home" (quitting a level, finishing one,
// closing the finale) -- the map if we know who's playing, otherwise the
// name screen, since there's no per-name progress to show without one
// (e.g. she arrived via the ?level= preview cheat code with no name yet).
function goHome() {
  if (currentName) {
    renderMap();
    showScreen('screen-map');
  } else {
    showScreen('screen-name');
  }
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
  playerNameTag.textContent = currentName || '';
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
      node.addEventListener('click', () => openReplayModal(i));
    } else if (i === state.unlocked) {
      node.classList.add('current');
      node.textContent = String(i + 1);
      node.title = `Play ${friend.name}'s level`;
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
    bossNode.title = 'Defeat every monster first';
  } else if (state.bossDefeated) {
    bossNode.textContent = '🎉';
    bossNode.title = 'Relive the celebration';
    bossNode.addEventListener('click', () => openReplayModal('boss'));
  } else {
    bossNode.textContent = '🐉';
    bossNode.title = 'Face the dragon';
    bossNode.addEventListener('click', showBossRallyStory);
  }
  bossNodeWrap.appendChild(bossNode);
}

// --- replay-or-view modal, shown when clicking an already-completed friend
// or the already-defeated dragon ---
let replayIndex = null;

function openReplayModal(index) {
  replayIndex = index;
  replayModalAvatar.innerHTML = '';
  replayModalAvatar.classList.toggle('boss', index === 'boss');
  if (index === 'boss') {
    replayModalAvatar.textContent = '🐉';
    replayModalName.textContent = 'The Dragon';
  } else {
    const friend = friends[index];
    if (friend.photoSolo) {
      const img = document.createElement('img');
      img.src = assetUrl(friend.photoSolo);
      img.alt = friend.name;
      replayModalAvatar.appendChild(img);
    } else {
      replayModalAvatar.appendChild(initialAvatar(friend, '26px'));
    }
    replayModalName.textContent = friend.name;
  }
  replayModal.classList.add('active');
}

function closeReplayModal() {
  replayModal.classList.remove('active');
  replayIndex = null;
}

btnReplayLevel.addEventListener('click', () => {
  const index = replayIndex;
  closeReplayModal();
  if (index === 'boss') startBoss();
  else if (index !== null) startLevel(index);
});

btnViewMessages.addEventListener('click', () => {
  const index = replayIndex;
  closeReplayModal();
  if (index === 'boss') showFinale();
  else if (index !== null) revisitFriend(index);
});

btnReplayClose.addEventListener('click', closeReplayModal);

replayModal.addEventListener('click', (e) => {
  if (e.target === replayModal) closeReplayModal();
});

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
    // Landscape is the only orientation the game runs in now (see
    // .rotate-block in style.css/index.html, which blocks portrait
    // outright), so this is shaped to actually fill a landscape phone
    // screen -- 1280x480 (2.667:1), much wider-and-shorter than the old
    // 960x540/960x702, which were both closer to desktop-monitor shapes
    // and left a landscape phone's screen mostly empty on the sides.
    // Every absolute position in BossScene.js/levelConfig.js was
    // recalculated for this shape (not just shifted -- 480 is shorter
    // than even the original 540, so it's a real re-layout, not a
    // shift); RevealRoomScene.js's own layout is written in W/H-relative
    // terms so most of it adapted automatically, except the
    // together-photo card's own max size, which needed shrinking to
    // still fit the shorter canvas.
    width: 1280,
    height: 480,
    backgroundColor: '#1a1035',
    physics: { default: 'arcade', arcade: { gravity: { y: 1400 }, debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    // Scenes are registered below via scene.add(), not listed here. Phaser
    // auto-starts whichever scene is *first* in a `scene: [...]` array the
    // instant the game boots -- before any real level/friend data exists --
    // which crashed LevelScene.create() on undefined friend data and could
    // leave the whole game loop dead. That's why replaying an already-
    // finished level, or the dragon fight, could come up blank: whichever
    // scene actually needed to run got starved by the auto-started one
    // crashing first.
  });
  game.scene.add('LevelScene', LevelScene);
  game.scene.add('BossScene', BossScene);
  game.scene.add('RevealRoomScene', RevealRoomScene);
  // Opt-in hook for scripts/check-levels.mjs: it sets this flag via
  // page.addInitScript() before the page loads, so it can drive scenes
  // directly. Never set for a real player, so this is a no-op for her.
  if (window.__EXPOSE_GAME_FOR_TESTS__) {
    window.__testGame = game;
  }
  return game;
}

// Only persists if someone has actually been identified -- playing a
// level via the raw ?level= preview cheat code with no name chosen yet
// intentionally doesn't touch anyone's saved progress.
function persistProgress() {
  if (currentName) saveProgress(currentName, state);
}

function startLevel(index) {
  // The level-clear jingle can still be playing out from the level she just
  // finished if she taps straight into the next one from the map -- cut it
  // off rather than letting it bleed into the new level's own opening.
  stopSound('clear');
  bossHpEl.style.display = 'none';
  btnShoot.style.display = 'flex';
  touchMove.style.display = 'flex';
  btnJump.style.display = 'flex';
  heartsEl.style.display = 'flex';
  levelTitleEl.textContent = friends[index].name;
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
        playSound('clear');
        state.unlocked = Math.max(state.unlocked, idx + 1);
        persistProgress();
        game.scene.stop('RevealRoomScene');
        game.scene.stop('LevelScene');
        goHome();
      },
    },
  });
}

// Revisiting an already-completed friend from the map replays just the
// memory room (photo + messages), skipping the level itself.
function revisitFriend(index) {
  stopSound('clear');
  bossHpEl.style.display = 'none';
  btnShoot.style.display = 'none';
  touchMove.style.display = 'none';
  btnJump.style.display = 'none';
  levelTitleEl.textContent = friends[index].name;
  showScreen('screen-game');
  ensureGame();
  game.scene.start('RevealRoomScene', {
    friend: friends[index],
    callbacks: {
      onDone: () => {
        game.scene.stop('RevealRoomScene');
        goHome();
      },
    },
  });
}

function startBoss() {
  stopSound('clear');
  bossHpEl.style.display = 'flex';
  // No controllable player character in this fight -- the whole rescued
  // squad fires on its own (see BossScene.js) -- so the shoot/move/jump
  // controls and hearts HUD, all player-only controls, stay hidden here.
  btnShoot.style.display = 'none';
  touchMove.style.display = 'none';
  btnJump.style.display = 'none';
  heartsEl.style.display = 'none';
  levelTitleEl.textContent = '';
  showScreen('screen-game');
  ensureGame();
  renderBossHP(DRAGON_HP);
  game.scene.start('BossScene', {
    callbacks: {
      onBossStart: renderBossHP,
      onDragonHit: renderBossHP,
      onVictory: () => {
        playSound('clear', { volume: 0.7 });
        state.bossDefeated = true;
        persistProgress();
        game.scene.stop('BossScene');
        showRescueModal();
      },
    },
  });
}

btnShoot.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (!game) return;
  // Whichever of these is actually running gets the shot -- LevelScene
  // during a regular level, BossScene during the dragon fight.
  const scene = game.scene.getScene('LevelScene').scene.isActive()
    ? game.scene.getScene('LevelScene')
    : game.scene.getScene('BossScene');
  if (scene && scene.scene.isActive() && typeof scene.requestShoot === 'function') {
    scene.requestShoot();
  }
});

// On-screen movement/jump -- LevelScene only (no player character to move
// during the dragon fight, see startBoss's comment). Held down, not a
// single tap, so this tracks press/release like a real d-pad rather than
// firing once like the shoot button above: pointerdown sets the direction
// active, and every way a press can end (a clean release, or a thumb
// sliding off the button) clears it again -- missing any of those would
// leave her walking on her own with no way to stop.
function activeLevelScene() {
  if (!game) return null;
  const scene = game.scene.getScene('LevelScene');
  return scene && scene.scene.isActive() ? scene : null;
}

function bindHold(el, onStart, onEnd) {
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    onStart();
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((evt) => el.addEventListener(evt, onEnd));
}

bindHold(
  btnMoveLeft,
  () => activeLevelScene()?.setTouchMove('left', true),
  () => activeLevelScene()?.setTouchMove('left', false)
);
bindHold(
  btnMoveRight,
  () => activeLevelScene()?.setTouchMove('right', true),
  () => activeLevelScene()?.setTouchMove('right', false)
);
bindHold(
  btnJump,
  () => activeLevelScene()?.setTouchJump(true),
  () => activeLevelScene()?.setTouchJump(false)
);

btnQuit.addEventListener('click', () => {
  if (game) {
    game.scene.stop('LevelScene');
    game.scene.stop('BossScene');
    game.scene.stop('RevealRoomScene');
  }
  goHome();
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

// A one-time celebration shown the moment the dragon actually falls, before
// the finale screen's grid of everyone's messages -- a revisit of an
// already-defeated dragon ("View Messages" in the replay modal) skips
// straight to showFinale() instead, since the rescue already happened.
function showRescueModal() {
  rescueModal.classList.add('active');
}

function closeRescueModal() {
  rescueModal.classList.remove('active');
  showFinale();
}

btnRescueContinue.addEventListener('click', closeRescueModal);
rescueModal.addEventListener('click', (e) => {
  if (e.target === rescueModal) closeRescueModal();
});

// --- name entry ---
// Loading progress is async (Supabase, when configured), so the button
// shows a brief loading state rather than the screen just sitting there.
async function submitName(rawName) {
  const name = rawName.trim();
  if (!name) {
    playSound('hit', { volume: 0.4 });
    nameError.textContent = 'Please type your name.';
    return;
  }
  nameError.textContent = '';
  btnNameContinue.disabled = true;
  btnNameContinue.textContent = 'Loading…';
  try {
    localStorage.setItem(LAST_NAME_KEY, name);
  } catch {
    /* ignore storage errors, name still works for this session */
  }
  currentName = name;
  state = await loadProgress(name);
  renderMap();
  showScreen('screen-map');
  btnNameContinue.disabled = false;
  btnNameContinue.textContent = 'Continue';
}

nameForm.addEventListener('submit', (e) => {
  e.preventDefault();
  submitName(nameInput.value);
});

// --- boot ---
btnStart.addEventListener('click', () => {
  showScreen('screen-story-intro');
});

btnStoryIntroContinue.addEventListener('click', () => {
  let lastName = '';
  try {
    lastName = localStorage.getItem(LAST_NAME_KEY) || '';
  } catch {
    /* ignore */
  }
  nameInput.value = lastName;
  nameError.textContent = '';
  showScreen('screen-name');
  nameInput.focus();
});

// Shown once before the first real dragon attempt (not on a replay of an
// already-defeated dragon, which skips straight to startBoss()).
function showBossRallyStory() {
  showScreen('screen-story-rally');
}

btnStoryRallyContinue.addEventListener('click', startBoss);

// Cheat code for jumping straight to any level without playing through the
// ones before it, or typing a name first: open the game with ?level=N
// (matching the number shown on the map, 1-19) or ?level=boss for the
// dragon fight. No name is set for this path, so finishing a level this
// way doesn't save progress under anyone's name (see persistProgress).
function applyUrlPreviewCode() {
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

applyUrlPreviewCode();
