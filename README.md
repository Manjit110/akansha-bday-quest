# A Quest for Akansha 🐉

A small birthday platformer. She plays through 16 short levels — one per
friend — and clearing each one "rescues" that friend, revealing their
photo, a birthday message, and a shared memory/inside joke. The last
level is a dragon boss fight; beating it opens a celebration screen with
everyone together.

Built with [Phaser 3](https://phaser.io/) for the platforming and plain
HTML/CSS for the title, map, friend-reveal, and finale screens. Fully
static — no backend, progress is saved to the browser's `localStorage`
so she can close the tab and pick up where she left off.

## Setup

```bash
npm install
npm run dev
```

## Before sending her the link

- **Fill in the friends**: [src/data/friends.js](src/data/friends.js) —
  16 entries, one per level, each with a `name`, `message`, `memory`
  (inside joke), and optional `photo`. Reorder the array to change the
  level order.
- **Add photos**: drop images in [public/friends/](public/friends/) and
  point `photo` at them, e.g. `photo: '/friends/priya.jpg'`. Leave
  `photo: null` to fall back to a colored initial avatar.
- **Finale message**: `finaleNote` at the bottom of
  [src/data/friends.js](src/data/friends.js) — one closing message shown
  after the dragon fight.
- **Difficulty / level count**: levels are generated procedurally in
  [src/game/levelConfig.js](src/game/levelConfig.js) from the friends
  list, so the level count always matches however many friends are in
  the array — no separate level design needed if you add or remove
  someone.
- **Visuals**: everything is flat colored shapes right now (no sprite
  art) — intentional placeholder art so the game is playable
  immediately. Swap in real sprites later in
  [src/game/LevelScene.js](src/game/LevelScene.js) /
  [BossScene.js](src/game/BossScene.js) if you want a different look.

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
