// Gates play on a phone-sized screen behind a shared access code --
// desktop/laptop is always open, no code needed (see isPhoneSizedDevice
// below, which is deliberately orientation-independent: unlike
// isShortLandscapePhone in deviceMode.js, this has to catch a phone
// *before* it's been rotated to landscape, i.e. while .rotate-block is
// still telling her to turn it sideways -- gating only after rotation
// would let her see and act on that prompt before ever hitting the code
// screen). Not real security (the code lives in this file, shipped to
// every visitor) -- just a soft "ask whoever sent you this" gate for a
// private birthday link, not meant to withstand anyone actually trying
// to get past it.
const ACCESS_CODE = 'AKANSHA26';
const UNLOCK_KEY = 'akansha-quest-mobile-unlocked';

function isPhoneSizedDevice() {
  return Math.min(window.innerWidth, window.innerHeight) <= 500;
}

// Called once at boot, before anything else renders. If this device
// doesn't need the gate (desktop) or already passed it (remembered via
// localStorage so she isn't re-prompted every visit), this is a no-op --
// #mobile-gate stays hidden (its default CSS state) and the game boots
// exactly as it always has.
export function initMobileGate() {
  if (!isPhoneSizedDevice()) return;
  try {
    if (localStorage.getItem(UNLOCK_KEY) === '1') return;
  } catch {
    /* storage unavailable -- fall through and just ask every time */
  }

  const gate = document.getElementById('mobile-gate');
  gate.classList.add('active');

  const form = document.getElementById('mobile-gate-form');
  const input = document.getElementById('mobile-gate-input');
  const error = document.getElementById('mobile-gate-error');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (input.value.trim().toUpperCase() === ACCESS_CODE) {
      try {
        localStorage.setItem(UNLOCK_KEY, '1');
      } catch {
        /* nothing to persist to -- she'll just be asked again next visit */
      }
      gate.classList.remove('active');
    } else {
      error.textContent = "That code isn't right — ask whoever sent you this link, or play on a laptop/desktop instead.";
      input.value = '';
      input.focus();
    }
  });
}
