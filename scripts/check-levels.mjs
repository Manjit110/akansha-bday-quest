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
