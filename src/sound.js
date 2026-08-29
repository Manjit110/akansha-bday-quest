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
  click: '/sounds/smb_pause.wav',
  clear: '/sounds/smb_stage_clear.wav',
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
export function playSound(key, { volume = 0.5 } = {}) {
  if (!FILES[key]) return;
  try {
    const audio = getTemplate(key).cloneNode(true);
    audio.volume = volume;
    audio.play().catch(() => {});
  } catch {
    /* ignore -- never let a sound effect break the game */
  }
}
