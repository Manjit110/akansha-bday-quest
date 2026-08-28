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
about her — tapped through at her own pace, with a photo of the two of
them together at the bottom of the room throughout. The last level is
a full dragon boss fight — it swoops down and throws fire to dodge, and
she shoots back with the same wand from the regular levels while its
belly is exposed; beating it opens a celebration screen with everyone
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
- **Level environments**: each level's background is one of five
  themes — hills, mountains, city, night forest, desert — cycling by
  level index ([src/game/levelThemes.js](src/game/levelThemes.js), add
  more to `LEVEL_THEMES` for more variety than the current five). Each
  theme paints a real sky gradient (not a flat fill), a glowing moon or
  sun, drifting clouds, and a soft haze where the terrain meets the
  horizon, and jitters every hill/peak/building/tree/dune's size and
  position a little so nothing repeats identically — a flat color with
  perfectly evenly-spaced shapes is what reads as mechanical rather than
  like a place. The fort gate at each level's end is the same structure
  everywhere (stone-coursed towers, an arched doorway, torches, a
  friend-colored pennant) but its stone tint comes from the level's
  theme, so it belongs to its surroundings instead of looking pasted on.
- **The memory room**: [src/game/RevealRoomScene.js](src/game/RevealRoomScene.js)
  — the card order/labels (Birthday Wish, First Impression, etc.) live
  in `buildCards()` there if you want to reorder, rename, or add one.
  Clicking an already-rescued friend on the map replays just this room
  (no need to replay the level) via the same scene. The "together" photo
  at the bottom uses `photoTogether` once you add one; until then it
  shows a placeholder (two colored initials + a heart) so the spot never
  looks broken. Cards are rounded, cream-colored paper with a soft
  layered shadow and a tinted border (not a flat sharp-cornered UI
  panel), tilted and taped like something actually pinned up, with a
  small icon, an accent-colored rule under the label, and the birthday
  message/impressions rendered in dark ink in a handwritten font
  (Caveat) instead of the game's usual sans-serif on a dark background —
  closer to an actual handwritten note than a dialog box.
- **Per-friend color theming**: each level's sky/hills and the memory
  room's backdrop are subtly tinted toward that friend's own `color`
  ([src/game/color.js](src/game/color.js)'s `mixColors`), so nothing
  looks like one generic backdrop reused 19 times. Ambient sparkles
  ([src/game/particles.js](src/game/particles.js)) drift through both,
  deliberately kept to a fixed warm palette rather than tinted the same
  way — a sparkle the same hue as its background disappears.

## Testing

`npm test` builds the project, serves it, and drives it with a real
headless browser to check the ways this has actually broken before: bad
procedural geometry (a gap or platform that's physically out of jump
range), a mini-boss fight that isn't actually winnable, level state
leaking into the next level and leaving her stuck (`LevelScene` is one
persistent scene instance Phaser reuses for every level, not a fresh one
per level, so anything left set when one level finishes can freeze the
next), revisiting an already-finished friend from the map, and the
dragon fight itself — both of which came up blank/unplayable from the
same root cause: Phaser auto-starts whichever scene is listed *first* in
a `scene: [...]` array the moment the game boots, before any real data
exists, silently crashing it and taking the whole render loop down with
it. The dragon fight check drives it through the *real* mechanic (swoop,
then several real shots), not by calling the hit-handler directly, which
is what caught the sneakiest bug so far: `physics.add.overlap(group,
singleObject, cb)` that destroys the group member inside `cb` landed
exactly one hit, ever, then silently stopped firing for the rest of the
fight, even though every later shot spawned in the exact right place —
swapping the argument order to `overlap(singleObject, group, cb)` fixed
it outright. All of these have happened for real during development —
this is meant to run after any change that touches level generation,
physics, the boss fight, or scene setup, not just once. See
[scripts/check-levels.mjs](scripts/check-levels.mjs).

## Playing out of order

Progression is normally locked level-by-level, but you can jump straight
to any level (or the dragon fight) without playing the ones before it —
useful for previewing or testing. Open the game with `?level=N` in the
URL (N is the number shown on the map, 1 through however many friends
there are) or `?level=boss`, e.g.:

```
https://<username>.github.io/<repo-name>/?level=7
https://<username>.github.io/<repo-name>/?level=boss
```

This doesn't touch her saved progress — it's just a different starting
point, not a shortcut through a level's own content.

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
