import { assetUrl } from './assetPath.js';
import { isShortLandscapePhone } from './deviceMode.js';

// Below the short-landscape-phone boundary (see deviceMode.js),
// RevealRoomScene's Phaser cards -- text baked into the same canvas
// gameplay uses, which shrinks to fit a short phone screen (see
// #game-container's short-viewport override) -- become too small to
// comfortably read. Real HTML text has no such ceiling, so the memory
// room renders as a normal scrollable screen instead on these devices,
// leaving the canvas reserved for actual gameplay. Both entry points
// (main.js's revisitFriend, and RevealRoomScene.create() for finishing a
// level the first time) check this the same way.
export function isMobileReveal() {
  return isShortLandscapePhone();
}

function initialAvatarHTML(friend) {
  const div = document.createElement('div');
  div.style.width = '100%';
  div.style.height = '100%';
  div.style.display = 'flex';
  div.style.alignItems = 'center';
  div.style.justifyContent = 'center';
  div.style.background = friend.color;
  div.style.color = '#2b1140';
  div.style.fontWeight = '700';
  div.style.fontSize = '30px';
  div.textContent = friend.name.trim().charAt(0).toUpperCase() || '?';
  return div;
}

const FIELDS = [
  { icon: '🎂', label: 'Birthday Wish', key: 'message' },
  { icon: '👀', label: 'First Impression', key: 'firstImpression' },
  { icon: '🤝', label: 'Where We Met', key: 'firstMet' },
  { icon: '😊', label: 'Impression Now', key: 'nowImpression' },
  { icon: '❤️', label: 'What She Loves About Her', key: 'quality' },
];

// Populates and shows #screen-reveal with this friend's photo(s) and
// messages, calling onDone when she taps Continue. Not routed through
// main.js's own showScreen() (which lives in that module, not this one)
// to avoid a circular import -- RevealRoomScene.js needs this module too,
// and main.js already imports RevealRoomScene.js.
export function showRevealHtml(friend, onDone) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === 'screen-reveal'));

  const soloWrap = document.getElementById('reveal-photo-solo');
  soloWrap.innerHTML = '';
  if (friend.photoSolo) {
    const img = document.createElement('img');
    img.src = assetUrl(friend.photoSolo);
    img.alt = friend.name;
    soloWrap.appendChild(img);
  } else {
    soloWrap.appendChild(initialAvatarHTML(friend));
  }

  const togetherImg = document.getElementById('reveal-photo-together');
  if (friend.photoTogether) {
    togetherImg.src = assetUrl(friend.photoTogether);
    togetherImg.alt = `Akansha & ${friend.name}`;
    togetherImg.style.display = 'block';
  } else {
    togetherImg.removeAttribute('src');
    togetherImg.style.display = 'none';
  }

  document.getElementById('reveal-name').textContent = friend.name;

  const fieldsEl = document.getElementById('reveal-fields');
  fieldsEl.innerHTML = '';
  FIELDS.forEach(({ icon, label, key }) => {
    const text = friend[key];
    if (!text) return;
    const field = document.createElement('div');
    field.className = 'reveal-field';
    const labelEl = document.createElement('div');
    labelEl.className = 'reveal-field-label';
    labelEl.textContent = `${icon} ${label}`;
    const textEl = document.createElement('p');
    textEl.className = 'reveal-field-text';
    textEl.textContent = text;
    field.append(labelEl, textEl);
    fieldsEl.appendChild(field);
  });

  document.getElementById('btn-reveal-continue').onclick = () => onDone();

  document.getElementById('screen-reveal').scrollTop = 0;
}
