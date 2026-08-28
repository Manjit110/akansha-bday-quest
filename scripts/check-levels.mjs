// A standing regression test for the two ways a level can quietly become
// unbeatable: bad procedural geometry (an unreachable platform/gap), or the
// boss fight itself not being winnable. Both have happened for real during
// development, silently, so this runs both checks against every level on
// every commit that touches gameplay -- `npm test`.
//
// Usage: npm test
//   (builds the project, serves the built output, drives it with a real
//   browser via Playwright, and tears the server down afterward)

import { spawn, execSync } from 'node:child_process';
import { chromium } from 'playwright';
import { generateLevel, GROUND_Y } from '../src/game/levelConfig.js';
import { friends } from '../src/data/friends.js';

const PORT = 5299;
const BASE_URL = `http://localhost:${PORT}/akansha-bday-quest/`;
const TOTAL_LEVELS = friends.length;

const MAX_JUMP_HEIGHT = 112; // vy=560, gravity=1400 -> vy^2/(2g)
const SAFE_MAX_HORIZONTAL = 140; // conservative single-jump horizontal reach

let failures = 0;
const fail = (msg) => {
  failures++;
  console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`);
};
const pass = (msg) => console.log(`  \x1b[32mok\x1b[0m   ${msg}`);

function checkLevelGeometry() {
  console.log('\n== Level geometry (gaps/platforms actually reachable) ==');
  for (let levelIndex = 0; levelIndex < TOTAL_LEVELS; levelIndex++) {
    const cfg = generateLevel(levelIndex, TOTAL_LEVELS);
    const segs = cfg.groundSegments;
    let levelOk = true;

    for (let i = 0; i < segs.length - 1; i++) {
      const a = segs[i];
      const b = segs[i + 1];
      const gapStart = a.x + a.width;
      const gapEnd = b.x;
      const gap = gapEnd - gapStart;
      if (gap <= 0) continue;

      const platform = cfg.platforms.find((p) => p.x > gapStart - 20 && p.x < gapEnd + 20 && p.y < GROUND_Y - 5);

      if (!platform) {
        if (gap > SAFE_MAX_HORIZONTAL) {
          fail(`level ${levelIndex + 1}: unbridged gap of ${gap.toFixed(0)}px at x=${gapStart.toFixed(0)}`);
          levelOk = false;
        }
        continue;
      }

      const platformHeight = GROUND_Y - platform.y;
      const platformLeft = platform.x - platform.width / 2;
      const platformRight = platform.x + platform.width / 2;
      const subGap1 = platformLeft - gapStart;
      const subGap2 = gapEnd - platformRight;

      if (platformHeight > MAX_JUMP_HEIGHT) {
        fail(`level ${levelIndex + 1}: platform at x=${platform.x.toFixed(0)} is ${platformHeight.toFixed(0)}px high (max ${MAX_JUMP_HEIGHT})`);
        levelOk = false;
      }
      if (subGap1 > SAFE_MAX_HORIZONTAL || subGap2 > SAFE_MAX_HORIZONTAL) {
        fail(`level ${levelIndex + 1}: sub-gaps around platform at x=${platform.x.toFixed(0)} are ${subGap1.toFixed(0)}/${subGap2.toFixed(0)}px`);
        levelOk = false;
      }
    }

    // fort/interior wall must stay inside the world bounds
    const interiorHalfWidth = 75;
    const gateX = cfg.flagX;
    const interiorX = gateX + 60;
    if (interiorX + interiorHalfWidth > cfg.width) {
      fail(`level ${levelIndex + 1}: interior wall (x=${interiorX}) overflows world bounds (width=${cfg.width})`);
      levelOk = false;
    }

    if (levelOk) pass(`level ${levelIndex + 1}`);
  }
}

function freePort(port) {
  if (process.platform !== 'win32') return;
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
    const pids = new Set(
      out
        .split('\n')
        .map((line) => line.trim().split(/\s+/).pop())
        .filter((pid) => pid && /^\d+$/.test(pid))
    );
    pids.forEach((pid) => {
      try {
        execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' });
      } catch {
        /* already gone */
      }
    });
  } catch {
    /* nothing listening on that port */
  }
}

function startPreviewServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
      shell: true,
      stdio: 'pipe',
    });
    let ready = false;
    const onData = (data) => {
      if (!ready && data.toString().includes('Local')) {
        ready = true;
        resolve(proc);
      }
    };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    proc.on('error', reject);
    setTimeout(() => {
      if (!ready) reject(new Error('preview server did not start in time'));
    }, 20000);
  });
}

// spawn(..., { shell: true }) on Windows launches vite as a grandchild of a
// cmd.exe wrapper, so proc.kill() only kills the wrapper and leaves the real
// server running (and the port held) -- confirmed this actually happened
// during testing. Kill the whole tree instead.
function killProcessTree(proc) {
  if (!proc || proc.killed) return;
  if (process.platform === 'win32') {
    try {
      execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: 'ignore' });
    } catch {
      /* already gone */
    }
  } else {
    try {
      process.kill(-proc.pid, 'SIGKILL');
    } catch {
      proc.kill('SIGKILL');
    }
  }
}

// Regression test for a real bug: LevelScene is one persistent scene
// instance reused across every scene.start('LevelScene', ...) call (Phaser
// keeps one instance per class alive, it doesn't create a fresh one per
// level), so any flag left set while finishing a level used to leak into
// the next one. Concretely: inputLocked stayed true after walking through
// a fort gate, freezing her the moment the next level loaded. This drives
// the actual finish-a-level path (defeat the boss, walk into the fort,
// click through the memory room) rather than teleporting past it, then
// confirms the next level actually responds to input.
async function checkLevelTransition(page) {
  console.log('\n== Level-to-level transition (character must not be stuck) ==');

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.click('#btn-start');
  await page.waitForSelector('.map-node.current');
  await page.click('.map-node.current');
  await page.waitForSelector('#game-container canvas');
  await page.waitForTimeout(500);

  // Defeat level 1's mini-boss for real.
  await page.evaluate(() => {
    const scene = window.__testGame.scene.getScene('LevelScene');
    const boss = scene.bossGuardian;
    scene.player.setPosition(boss.x - 40, scene.cfg.groundY - 100);
    scene.player.setFlipX(false);
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    return new Promise((resolve) => {
      const scene = window.__testGame.scene.getScene('LevelScene');
      const boss = scene.bossGuardian;
      let shots = 0;
      function tryShoot() {
        if (!boss.active || shots >= 6) {
          resolve();
          return;
        }
        scene.player.setPosition(boss.x - 40, scene.player.y);
        scene.shoot();
        shots++;
        setTimeout(tryShoot, 500);
      }
      tryShoot();
    });
  });
  await page.waitForTimeout(300);

  // Walk into the fort for real, not teleport past it, so enterFort()'s
  // inputLocked/enteringFort flags actually get exercised the way a real
  // playthrough sets them.
  await page.evaluate(() => {
    const scene = window.__testGame.scene.getScene('LevelScene');
    scene.player.setPosition(scene.flag.x, scene.flag.y);
  });
  await page.waitForTimeout(2200); // fort walk-in pan + fade + RevealRoomScene create

  const roomReached = await page.evaluate(() => {
    const room = window.__testGame.scene.getScene('RevealRoomScene');
    return !!(room && room.scene.isActive());
  });
  if (!roomReached) {
    fail('level 1: never reached the memory room after entering the fort');
    return;
  }

  // Click through every card to reach onDone -> back to the map.
  for (let i = 0; i < 8; i++) {
    const onMap = await page.evaluate(() => document.getElementById('screen-map').classList.contains('active'));
    if (onMap) break;
    await page.evaluate(() => {
      const room = window.__testGame.scene.getScene('RevealRoomScene');
      if (room && room.scene.isActive()) room.advance();
    });
    await page.waitForTimeout(300);
  }
  await page.waitForSelector('.map-node.current', { timeout: 5000 });

  // Start the next level and confirm she can actually move.
  await page.click('.map-node.current');
  await page.waitForTimeout(500);

  const inputLocked = await page.evaluate(() => window.__testGame.scene.getScene('LevelScene').inputLocked);
  if (inputLocked) {
    fail('level 2: inputLocked is still true from the previous level -- character is frozen');
    return;
  }

  const startX = await page.evaluate(() => window.__testGame.scene.getScene('LevelScene').player.x);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(400);
  await page.keyboard.up('ArrowRight');
  const endX = await page.evaluate(() => window.__testGame.scene.getScene('LevelScene').player.x);

  if (endX - startX > 15) {
    pass(`level 2: character moves normally after finishing level 1 (moved ${(endX - startX).toFixed(0)}px)`);
  } else {
    fail(`level 2: character did not move (moved ${(endX - startX).toFixed(0)}px) -- looks stuck`);
  }
}

// Regression test for a real bug: Phaser auto-starts whichever scene is
// listed *first* in a `scene: [...]` array the instant the game boots,
// before any real level/friend data exists. LevelScene was first in that
// array, so every game boot silently crashed it on undefined friend data
// and could leave the whole render loop dead -- which meant replaying an
// already-finished friend from the map (revisitFriend() starts
// RevealRoomScene directly, never LevelScene) came up blank.
async function checkRevisitAfterCompletion(page, pageErrors) {
  console.log('\n== Revisiting an already-completed friend (previous bug: blank screen) ==');

  const before = pageErrors.length;

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('akansha-quest-progress-v1', JSON.stringify({ unlocked: 19, bossDefeated: false }));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });

  await page.click('#btn-start');
  await page.waitForSelector('.map-node.done');

  // Clicking a done node opens a Play Again / View Messages choice rather
  // than jumping straight into either -- check both paths actually work.
  await page.click('.map-node.done');
  await page.waitForSelector('#replay-modal.active');

  await page.click('#btn-view-messages');
  await page.waitForTimeout(1200);

  const roomActive = await page.evaluate(() => {
    const room = window.__testGame && window.__testGame.scene.getScene('RevealRoomScene');
    return !!(room && room.scene.isActive());
  });

  if (!roomActive) {
    pageErrors.splice(before);
    fail('revisit: "View Messages" never opened the memory room -- screen is blank');
    return;
  }

  await page.click('#btn-quit-level');
  await page.waitForSelector('.map-node.done');
  await page.click('.map-node.done');
  await page.waitForSelector('#replay-modal.active');

  await page.click('#btn-replay-level');
  await page.waitForTimeout(1000);

  const levelActive = await page.evaluate(() => {
    const scene = window.__testGame && window.__testGame.scene.getScene('LevelScene');
    return !!(scene && scene.scene.isActive());
  });

  const newErrors = pageErrors.splice(before);
  if (newErrors.length) {
    newErrors.forEach((e) => fail(`revisit: console error: ${e}`));
  } else if (!levelActive) {
    fail('revisit: "Play Level Again" never started the real level -- screen is blank');
  } else {
    pass('revisit: both "View Messages" and "Play Level Again" work for an already-completed friend');
  }
}

// The same Play Again / View Messages choice, for the already-defeated
// dragon node on the map -- shares the modal and DOM ids with the
// per-friend version above, keyed by the 'boss' sentinel instead of an
// index (see openReplayModal() in main.js).
async function checkBossReplay(page, pageErrors) {
  console.log('\n== Revisiting the already-defeated dragon (Play Again / View Messages) ==');

  const before = pageErrors.length;

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate((total) => {
    localStorage.setItem('akansha-quest-progress-v1', JSON.stringify({ unlocked: total, bossDefeated: true }));
  }, TOTAL_LEVELS);
  await page.reload({ waitUntil: 'domcontentloaded' });

  await page.click('#btn-start');
  await page.waitForSelector('.boss-node');
  await page.click('.boss-node');
  await page.waitForSelector('#replay-modal.active');

  await page.click('#btn-replay-level');
  await page.waitForTimeout(800);

  const bossActive = await page.evaluate(() => {
    const scene = window.__testGame && window.__testGame.scene.getScene('BossScene');
    return !!(scene && scene.scene.isActive());
  });
  if (!bossActive) {
    pageErrors.splice(before);
    fail('boss replay: "Play Level Again" never started the dragon fight -- screen is blank');
    return;
  }

  await page.click('#btn-quit-level');
  await page.waitForSelector('.boss-node');
  await page.click('.boss-node');
  await page.waitForSelector('#replay-modal.active');

  await page.click('#btn-view-messages');
  await page.waitForTimeout(500);
  const finaleActive = await page.evaluate(() => document.getElementById('screen-finale').classList.contains('active'));

  const newErrors = pageErrors.splice(before);
  if (newErrors.length) {
    newErrors.forEach((e) => fail(`boss replay: console error: ${e}`));
  } else if (!finaleActive) {
    fail('boss replay: "View Messages" never showed the finale screen');
  } else {
    pass('boss replay: both "Play Level Again" and "View Messages" work for the defeated dragon');
  }
}

// Same root cause as above, different symptom: the dragon fight is the
// other scene that's started directly (never through LevelScene), so it
// was equally vulnerable to the auto-started LevelScene crashing the game
// loop out from under it -- "no dragon, level not passable".
async function checkDragonFight(page, pageErrors) {
  console.log('\n== Dragon boss fight (must render and be winnable) ==');

  const before = pageErrors.length;

  await page.goto(`${BASE_URL}?level=boss`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#game-container canvas');
  await page.waitForTimeout(600);

  const dragonRendered = await page.evaluate(() => {
    const scene = window.__testGame && window.__testGame.scene.getScene('BossScene');
    return !!(scene && scene.dragonGroup && scene.dragonGroup.active);
  });
  if (!dragonRendered) {
    fail('dragon fight: BossScene never rendered the dragon');
    pageErrors.splice(before);
    return;
  }

  // Drive it through the real mechanic (swoop -> shoot -> overlap), not by
  // calling tryHitDragon() directly -- that bypasses the actual hitbox
  // entirely and would pass even if the weak point were unreachable, which
  // is exactly the bug being tested for here.
  const result = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const scene = window.__testGame.scene.getScene('BossScene');
        let rounds = 0;
        function attackRound() {
          if (scene.finished || rounds >= 5) {
            resolve({ finished: scene.finished, dragonHP: scene.dragonHP, rounds });
            return;
          }
          rounds++;
          scene.player.setPosition(scene.dragonGroup.x - 30, scene.player.y);
          scene.player.setFlipX(false);
          scene.swoop();
          // swoop's down-tween is 500ms; fire several real shots once it's
          // in range and stay vulnerable (1400ms window) to land one.
          setTimeout(() => {
            let shots = 0;
            const shootTimer = setInterval(() => {
              if (scene.finished || !scene.vulnerable || shots >= 4) {
                clearInterval(shootTimer);
                setTimeout(attackRound, 1600); // let this swoop fully retract before the next
                return;
              }
              scene.player.setPosition(scene.dragonGroup.x - 30, scene.player.y);
              scene.shoot();
              shots++;
            }, 300);
          }, 550);
        }
        attackRound();
      })
  );
  await page.waitForTimeout(1200); // winFight()'s own fade-out tween before onVictory fires

  const finaleActive = await page.evaluate(() => document.getElementById('screen-finale').classList.contains('active'));

  const newErrors = pageErrors.splice(before);
  if (newErrors.length) {
    newErrors.forEach((e) => fail(`dragon fight: console error: ${e}`));
  } else if (result.finished && finaleActive) {
    pass(`dragon fight: defeated via real shots in ${result.rounds} swoop(s), finale screen shown`);
  } else {
    fail(
      `dragon fight: NOT completable via real shots (finished=${result.finished}, dragonHP=${result.dragonHP}, finale shown=${finaleActive})`
    );
  }
}

async function checkBossFightsAndCompletion(page) {
  console.log('\n== Mini-boss fights (defeatable via the shoot mechanic) ==');

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.click('#btn-start');
  await page.waitForSelector('.map-node.current');
  await page.click('.map-node.current');
  await page.waitForSelector('#game-container canvas');
  await page.waitForTimeout(500);

  for (let levelIndex = 0; levelIndex < TOTAL_LEVELS; levelIndex++) {
    await page.evaluate(
      ({ idx, total }) => {
        const game = window.__testGame;
        game.scene.stop('LevelScene');
        game.scene.start('LevelScene', {
          levelIndex: idx,
          friend: { id: 9000 + idx, name: 'Test', color: '#ff8fab', photoSolo: null },
          totalLevels: total,
          callbacks: { onHeartsChange: () => {}, onComplete: () => {} },
        });
      },
      { idx: levelIndex, total: TOTAL_LEVELS }
    );
    await page.waitForTimeout(300);

    // let the player settle to real standing height before firing --
    // firing mid-teleport (before gravity settles) previously masked a
    // real bug where the shot's spawn height missed the boss entirely
    await page.evaluate(() => {
      const scene = window.__testGame.scene.getScene('LevelScene');
      const boss = scene.bossGuardian;
      scene.player.setPosition(boss.x - 40, scene.cfg.groundY - 100);
      scene.player.setFlipX(false);
    });
    await page.waitForTimeout(400);

    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const scene = window.__testGame.scene.getScene('LevelScene');
        const boss = scene.bossGuardian;
        let shots = 0;
        const maxShots = 6;
        function tryShoot() {
          if (!boss.active || shots >= maxShots) {
            resolve({ defeated: scene.miniBossDefeated, shotsUsed: shots });
            return;
          }
          scene.player.setPosition(boss.x - 40, scene.player.y);
          scene.shoot();
          shots++;
          setTimeout(tryShoot, 500);
        }
        tryShoot();
      });
    });

    if (result.defeated) {
      pass(`level ${levelIndex + 1}: boss defeated in ${result.shotsUsed} shots`);
    } else {
      fail(`level ${levelIndex + 1}: boss NOT defeated after ${result.shotsUsed} shots`);
    }
  }
}

async function main() {
  console.log('Building...');
  await new Promise((resolve, reject) => {
    const p = spawn('npx', ['vite', 'build'], { shell: true, stdio: 'inherit' });
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('build failed'))));
  });

  checkLevelGeometry();

  freePort(PORT); // in case a previous run crashed without cleaning up

  console.log('\nStarting preview server...');
  const server = await startPreviewServer();

  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // expose the Phaser game instance for direct scene control in tests
    await page.addInitScript(() => {
      window.__EXPOSE_GAME_FOR_TESTS__ = true;
    });

    await checkLevelTransition(page);
    await checkRevisitAfterCompletion(page, pageErrors);
    await checkDragonFight(page, pageErrors);
    await checkBossReplay(page, pageErrors);
    await checkBossFightsAndCompletion(page);

    if (pageErrors.length) {
      pageErrors.forEach((e) => fail(`console error: ${e}`));
    }
  } finally {
    if (browser) await browser.close();
    killProcessTree(server);
  }

  console.log('');
  if (failures > 0) {
    console.log(`\x1b[31m${failures} check(s) failed.\x1b[0m`);
    process.exit(1);
  } else {
    console.log(`\x1b[32mAll checks passed across ${TOTAL_LEVELS} levels.\x1b[0m`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
