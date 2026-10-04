// Opens the game in a phone-sized browser and plays the first quest the way a player would: walk down the trail to
// the river, tap the water's edge, drink. Then a skill moment, the field map, and every tab. Saves screenshots.
// The painted places are drawn alive (living/), so it checks that too, and a tap on the picture means the ground it shows.
//   node tools/phone-check.mjs [--out shots-folder] [--file some.html]   (Stranded.html, from tools/build-game.mjs, by default)
// Ends with "all good" when everything worked and the page threw no errors.
import path from 'node:path';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';

const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), oi = args.indexOf('--out'), fi = args.indexOf('--file');
const out = oi >= 0 ? args[oi + 1] : path.join(here, '..', 'shots');
fs.mkdirSync(out, {recursive: true});
const url = pathToFileURL(fi >= 0 ? path.resolve(args[fi + 1]) : path.join(here, '..', 'Stranded.html')).href;

const browser = await pw.chromium.launch({args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
const page = await browser.newPage({viewport: {width: 390, height: 844}, deviceScaleFactor: 2, isMobile: true, hasTouch: true});
const errors = [], fails = [];
page.on('pageerror', e => errors.push(String(e.stack || e)));
page.on('console', m => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text() + ' ' + (m.location().url || ''))) errors.push(m.text()); });
await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());   // play as if offline
const check = (ok, what) => { if (!ok) fails.push(what); };
const shot = async name => { await page.waitForTimeout(300); await page.screenshot({path: path.join(out, name + '.png')}); };
const until = async (fn, ms = 12000) => { for (let t = 0; t < ms; t += 150){ if (await page.evaluate(fn)) return true; await page.waitForTimeout(150); } return false; };
const closeSheets = async () => { for (let k = 0; k < 4 && await page.$('#scrim'); k++){ const b = await page.$('.sheet [data-close]') || await page.$('.sheet .opt'); if (!b) break; await b.click(); await page.waitForTimeout(200); } };
// tap a square of the map with a finger
const tapTile = async (x, y) => { const r = await page.evaluate(([x, y]) => { const L = World.client(x, y); if (L) return L; const V = World._v, c = V.cv.getBoundingClientRect(), Z = V.Z; return {cx: c.left + ((x + 0.5) * 16 - V.cam[0]) / Z.W * c.width, cy: c.top + ((y + 0.5) * 16 - V.cam[1]) / Z.H * c.height}; }, [x, y]); await page.touchscreen.tap(r.cx, r.cy); };

// tap a square the way a player would: if it is off the screen, first walk toward it, tapping open ground on the way
const onScreen = async (x, y) => page.evaluate(([x, y]) => { const c = World.client(x, y); if (!c) return true; const r = World._v.box.getBoundingClientRect(); return c.cx > r.left + 12 && c.cx < r.right - 12 && c.cy > r.top + 50 && c.cy < r.bottom - 12; }, [x, y]);
const tapToward = async (x, y) => {
  for (let k = 0; k < 6 && !(await onScreen(x, y)); k++){
    const q = await page.evaluate(([x, y]) => { const V = World._v, M = V.map.M, r = V.box.getBoundingClientRect(), P = V.pos; let best = null;
      for (let j = 0; j < 32; j++) for (let i = 0; i < 48; i++){ if ('gGtfsmH'.indexOf(M[j][i]) < 0) continue; const c = World.client(i, j); if (!c || c.cx < r.left + 20 || c.cx > r.right - 20 || c.cy < r.top + 60 || c.cy > r.bottom - 20) continue;
        const d = Math.hypot(i - x, (j - y) * 1.5); if (!best || d < best.d) best = {i, j, d}; } return best && [best.i, best.j]; }, [x, y]);
    if (!q) break; await tapTile(q[0], q[1]); await until(() => !World._v.auto && !World._v.moving && !World._v.path.length, 20000); await page.waitForTimeout(500);
  }
  await tapTile(x, y);
};

const t0 = Date.now();
await page.goto(url);
await page.waitForSelector('#newgame');
await page.evaluate(() => localStorage.clear());
await page.reload(); await page.waitForSelector('#newgame');
check(/Stranded/.test(await page.title()), 'the page is called Stranded');
await shot('01-title');
await page.click('#newgame');
await page.waitForSelector('.sheet');
await shot('02-day1');
await page.click('.sheet [data-close]');
check(await until(() => World.living(), 20000), 'the camp is drawn alive, with the painting');
await shot('03-camp', 1200);

// the first quest: walk down the south trail, then tap its end, which walks you off it to the river
const exit = await page.evaluate(() => World._v.map.exits.find(e => e.to === 'river'));
for (let k = 0; k < 4 && !(await page.evaluate(() => World._v.S.loc === 'river')); k++){
  // the furthest square along the way that's on screen, then on from there
  const step = await page.evaluate(([ex, ey]) => { const V = World._v, r = V.box.getBoundingClientRect(); for (let y = ey; y > V.pos.y; y--){ const c = World.client(ex, y); if (!c || (c.cy < r.bottom - 10 && c.cy > r.top + 10)) return [ex, y]; } return [ex, ey]; }, [exit.x, exit.y]);
  await tapTile(step[0], step[1]);
  await until(() => !World._v.auto && !World._v.moving || World._v.S.loc === 'river', 20000);
  await page.waitForTimeout(400);
}
check(await until(() => World._v.S.loc === 'river', 20000), 'walked down the trail to the River Bank');
await page.waitForTimeout(400);
await closeSheets();
check(await until(() => World.living(), 20000), 'the River Bank is drawn alive');
await shot('04-river', 1200);
// tap the water's edge: walk up to it and get its menu
const edge = await page.evaluate(() => World._v.map.spots.edge.tiles[0]);
await tapToward(edge[0], edge[1]);
check(await until(() => World._v.menuOpen, 45000), 'tapping the water\'s edge opens its menu');
await shot('05-edge-menu');
await page.click('.wmenu [data-wi="0"]');
await page.waitForTimeout(400);
check(await page.evaluate(() => !!World._v.S.quest.done.water), 'drinking finished the first quest');
await shot('06-quest-done');
await closeSheets();

// a skill moment: the bow drill at the fire ring
await page.evaluate(() => { const S = World._v.S; S.tools.bowdrill = true; S.inv.bark = 2; S.inv.wood = 3; });
await page.evaluate(() => World.goTo('camp'));
check(await until(() => World._v.S.loc === 'camp', 40000), 'walked back to camp from the field map\'s way of going');
await page.waitForTimeout(400);
await closeSheets();
const ring = await page.evaluate(() => World._v.map.spots.ring.tiles[0]);
await tapToward(ring[0], ring[1]);
check(await until(() => World._v.menuOpen, 45000), 'tapping the fire ring opens its menu');   // (a dozen squares' walk: slow where 3D is drawn without a graphics chip)
await page.click('.wmenu [data-wi="0"]');
check(await until(() => !!document.getElementById('skill'), 3000), 'starting a fire opens the bow-drill skill moment');
await shot('07-bow-drill');
await page.click('.sk-skip');
check(await until(() => !document.getElementById('skill') && !!document.querySelector('.sheet')), 'the skill moment ends in a result');
await closeSheets();

// the field map, and every tab
await page.click('.wfield');
await page.waitForSelector('.fieldmap');
await shot('08-field-map');
await closeSheets();
for (const t of ['pack', 'craft', 'journal']){ await page.click(`[data-tab="${t}"]`); await shot('09-' + t); }
await page.click('[data-tab="here"]');
await page.evaluate(() => window.scrollTo(0, 600));
await shot('10-here');
const ms = Date.now() - t0;
await browser.close();

console.log('screenshots in', out, '(' + (ms / 1000).toFixed(1) + ' s)');
if (errors.length || fails.length){
  if (fails.length) console.log('Did not work:\n' + fails.map(e => '  ' + e).join('\n'));
  if (errors.length) console.log('Errors:\n' + [...new Set(errors)].map(e => '  ' + e).join('\n'));
  process.exit(1);
}
console.log('all good');
