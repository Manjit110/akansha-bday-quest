import { mulberry32 } from './rng.js';

export const GROUND_Y = 460;

// Procedurally lays out one level. `levelIndex` is 0-based, `total` is the
// friend count, so difficulty ramps smoothly from the first level to the last.
export function generateLevel(levelIndex, total) {
  const difficulty = total > 1 ? levelIndex / (total - 1) : 0;
  const rand = mulberry32(2026 + levelIndex * 97);

  const width = 1800 + Math.round(difficulty * 1400); // 1800 -> 3200
  const SAFE_START = 380;
  const SAFE_END = 320;

  const groundSegments = [];
  const platforms = [];
  const enemies = [];

  let x = SAFE_START;
  groundSegments.push({ x: 0, width: SAFE_START });

  const gapChance = 0.15 + difficulty * 0.35;
  const maxGap = 70 + difficulty * 90;

  while (x < width - SAFE_END) {
    const segWidth = 220 + rand() * 220;
    let gap = 0;
    if (rand() < gapChance) {
      gap = 70 + rand() * maxGap;
      // A floating platform helps bridge wider gaps.
      if (gap > 110) {
        platforms.push({
          x: x + gap / 2,
          y: GROUND_Y - 90 - rand() * 60,
          width: 90,
        });
      }
    }
    groundSegments.push({ x: x + gap, width: Math.min(segWidth, width - SAFE_END - (x + gap)) });
    x += gap + segWidth;
  }
  groundSegments.push({ x: width - SAFE_END, width: SAFE_END });

  // A few extra floating platforms purely for verticality / fun, more as difficulty rises.
  const bonusPlatforms = 1 + Math.floor(difficulty * 3);
  for (let i = 0; i < bonusPlatforms; i++) {
    const px = SAFE_START + 200 + rand() * (width - SAFE_START - SAFE_END - 400);
    platforms.push({ x: px, y: GROUND_Y - 130 - rand() * 70, width: 110 });
  }

  // Enemies, placed on solid ground segments away from the very start/end
  // (the first/last entries are the SAFE_START/SAFE_END zones themselves).
  const enemyCount = Math.round(1 + difficulty * 5);
  const solidSegs = groundSegments.slice(1, -1).filter((s) => s.width > 160);
  for (let i = 0; i < enemyCount && solidSegs.length; i++) {
    const seg = solidSegs[Math.floor(rand() * solidSegs.length)];
    const margin = 50;
    const patrolWidth = Math.max(40, seg.width - margin * 2);
    enemies.push({
      x: seg.x + margin + rand() * patrolWidth * 0.5,
      range: patrolWidth * 0.5,
      speed: 55 + difficulty * 55,
    });
  }

  return {
    width,
    height: 540,
    groundY: GROUND_Y,
    groundSegments,
    platforms,
    enemies,
    flagX: width - SAFE_END / 2,
    spawnX: 80,
  };
}
