# A Quest for Akansha 🐉

A small birthday platformer. She plays through one short level per
friend, wearing that friend's own face as she runs and jumps through
it. Each level ends in a short boss fight against a small mythical
creature (snake/dog/wolf/lion/griffin/minotaur/yeti/bat, cycling by
level) that throws fireballs to dodge — she wields a little wand and
can shoot back (F key, or the 🔮 button on screen) or jump on it —
before a small fort's gate unlocks. Walking through it, she vanishes
through the doorway and reappears in a grand memory room with a high
ceiling, where a sequence of framed pictures reveals that friend to
her one at a time — a photo, then their birthday wish, first
impression, where they met, impression now, and a quality she loves
about her — tapped through at her own pace. The last level is a full
dragon boss fight; beating it opens a celebration screen with everyone
together.

Built with [Phaser 3](https://phaser.io/) for the platforming, the fort/
gate, and the memory room, with plain HTML/CSS for the title, map, and
finale screens. Fully static — no backend, progress is saved to the
browser's `localStorage` so she can close the tab and pick up where she
left off.

## Setup

```bash
npm install
npm run dev
```

## Before sending her the link

- **Fill in the friends**: [src/data/friends.js](src/data/friends.js) —
  one entry per level, each with `name`, `message`, `firstMet`,
  `firstImpression`, `nowImpression`, `quality`, and two optional
  photos. Matches what's being collected from each friend: a photo of
  them + Akansha together, a solo photo, a birthday message, where they
  first met her, their first impression, their impression now, and a
  quality they appreciate about her. Reorder the array to change the
  level order.
- **Add photos**: drop images in [public/friends/](public/friends/) and
  point `photoTogether` / `photoSolo` at them, e.g.
  `photoTogether: '/friends/priya-together.jpg'`. Leave either `null` to
  fall back to a colored placeholder/initial. `photoSolo` also becomes
  that friend's face in-game (see below), so it pulls double duty.
- **Akansha's own photo**: [src/data/player.js](src/data/player.js) —
  set `facePhoto` to a solo photo of her and it becomes her face during
  the dragon boss fight (the one level that isn't about a specific
  friend). Leave `null` to keep the drawn placeholder face. During the
  regular levels the character you control instead wears *that level's
  friend's* face.
- **Finale message**: `finaleNote` at the bottom of
  [src/data/friends.js](src/data/friends.js) — one closing message shown
  after the dragon fight.
- **Difficulty / level count**: levels are generated procedurally in
  [src/game/levelConfig.js](src/game/levelConfig.js) from the friends
  list, so the level count always matches however many friends are in
  the array — no separate level design needed if you add or remove
  someone.
- **Visuals**: the player and enemies are small procedurally-drawn
  humanoid figures ([src/game/humanoid.js](src/game/humanoid.js)) — no
  image assets needed. Any friend with a `photoSolo` automatically gets
  their real face circle-cropped onto the player character for that
  level, enlarged so it's easy to make out at gameplay scale
  ([src/game/faceOverlay.js](src/game/faceOverlay.js)); square-ish
  photos work best since they're fit into a circle. The mini-boss
  creature guarding each level's fort gate is drawn in
  [src/game/animals.js](src/game/animals.js) — add more types to
  `ANIMAL_TYPES` there for more variety than the current eight.
- **The memory room**: [src/game/RevealRoomScene.js](src/game/RevealRoomScene.js)
  — the card order/labels (Birthday Wish, First Impression, etc.) live
  in `buildCards()` there if you want to reorder, rename, or add one.
  Clicking an already-rescued friend on the map replays just this room
  (no need to replay the level) via the same scene.

## Deploy to GitHub Pages

A GitHub Actions workflow ([.github/workflows/deploy.yml](.github/workflows/deploy.yml))
builds and deploys automatically on every push to `main`.

1. Push this repo to GitHub
2. In the repo's **Settings → Pages**, set **Source** to **GitHub
   Actions**
3. If the repo name isn't `akansha-bday-quest`, update `base` in
   [vite.config.js](vite.config.js) to match
4. Your game will be live at `https://<username>.github.io/<repo-name>/`

**Note:** GitHub Pages on the free plan only serves *public* repos.
Keep this repo private while you're filling in content, and flip it to
public only when you're ready to send her the link — otherwise the
surprise (and everyone's messages) are visible to anyone who finds the
repo.
