// Short sound effects (public/sounds/, classic SMB SFX), played via plain
// HTMLAudioElements rather than through Phaser's own audio system -- some
// of these fire from DOM button clicks before any Phaser game even exists
// (the name/title screens), and the rest are simple one-shots that don't
// need Phaser's mixer.
import { assetUrl } from './assetPath.js';

const FILES = {
  jump: '/sounds/smb_jump-small.wav',
  hit: '/sounds/smb_mariodie.wav',
  reset: '/sounds/smb_gameover.wav',
  bossFire: '/sounds/smb_bowserfire.wav',
  impact: '/sounds/smb_breakblock.wav',
  click: '/sounds/in-game-click.wav',
  clear: '/sounds/smb_stage_clear.wav',
};

const MUSIC_FILES = {
  levelBackground: '/sounds/background-music.mp3',
};

const cache = {};

function getTemplate(key) {
  if (!cache[key]) {
    const audio = new Audio(assetUrl(FILES[key]));
    audio.preload = 'auto';
    cache[key] = audio;
  }
  return cache[key];
}

// Clones the cached element per play so rapid repeats (jumping, the
// squad's own volley) overlap instead of cutting each other off. Browsers
// can refuse autoplay before any user interaction -- that's expected on
// the very first click, so failures are swallowed rather than surfaced.
// The clone played most recently for each key is kept in lastPlayed so a
// long one (like the level-clear jingle) can be cut off with stopSound()
// if she jumps straight into the next level before it's finished playing
// on its own.
const lastPlayed = {};

export function playSound(key, { volume = 0.5 } = {}) {
  if (!FILES[key]) return;
  try {
    const audio = getTemplate(key).cloneNode(true);
    audio.volume = volume;
    audio.play().catch(() => {});
    lastPlayed[key] = audio;
  } catch {
    /* ignore -- never let a sound effect break the game */
  }
}

export function stopSound(key) {
  const audio = lastPlayed[key];
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
    delete lastPlayed[key];
  }
}

// A single looping background track, kept subtle under the SFX above --
// only one plays at a time, so starting a new one (or the same one again)
// always stops whatever's currently playing first rather than layering.
// LevelScene starts this on create() and stops it on its own 'shutdown'
// event, so it plays through every regular level and falls silent the
// moment she leaves one -- the memory room, the map, and the dragon fight
// (BossScene) never call playMusic() at all, so it's just quiet there.
let currentMusic = null;
let currentMusicKey = null;

export function playMusic(key, { volume = 0.5 } = {}) {
  if (!MUSIC_FILES[key]) return;
  if (currentMusicKey === key && currentMusic && !currentMusic.paused) return;
  stopMusic();
  try {
    const audio = new Audio(assetUrl(MUSIC_FILES[key]));
    audio.loop = true;
    audio.volume = volume;
    audio.play().catch(() => {});
    currentMusic = audio;
    currentMusicKey = key;
  } catch {
    /* ignore -- never let background music break the game */
  }
}

export function stopMusic() {
  if (currentMusic) {
    currentMusic.pause();
    currentMusic.currentTime = 0;
  }
  currentMusic = null;
  currentMusicKey = null;
}
