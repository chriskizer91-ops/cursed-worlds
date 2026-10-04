// Opens the built living camp page on a phone-sized screen and uses it the way a person would: walk somewhere, light
// the fire with the bow drill, change the hour, the season and the weather, build the shelter up. Saves screenshots.
//   node tools/living-check.mjs [--file living/Stranded_Living_Camp.html] [--out shots/living]
// Ends with "all good" when everything worked and the page threw no errors.
import path from 'node:path';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';

const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), oi = args.indexOf('--out'), fi = args.indexOf('--file');
const out = oi >= 0 ? args[oi + 1] : path.join(here, '..', 'shots', 'living');
fs.mkdirSync(out, {recursive: true});
const url = pathToFileURL(fi >= 0 ? path.resolve(args[fi + 1]) : path.join(here, '..', 'living', 'Stranded_Living_Camp.html')).href;

const browser = await pw.chromium.launch({args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
const page = await browser.newPage({viewport: {width: 390, height: 844}, deviceScaleFactor: 2, isMobile: true, hasTouch: true});
const errors = [], fails = [];
page.on('pageerror', e => errors.push(String(e.stack || e)));
page.on('console', m => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text() + ' ' + (m.location().url || ''))) errors.push(m.text()); });
await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
const check = (ok, what) => { if (!ok) fails.push(what); };
const shot = async (name, wait) => { await page.waitForTimeout(wait || 600); await page.screenshot({path: path.join(out, name + '.png')}); };
const until = async (fn, ms = 15000) => { for (let t = 0; t < ms; t += 200) { if (await page.evaluate(fn)) return true; await page.waitForTimeout(200); } return false; };
// tap a point of the painting (painting pixels)
const tapPaint = async (px, py) => { const r = await page.evaluate(([px, py]) => { const S = BENCH.S, v = S.view, c = S.renderer.domElement.getBoundingClientRect(); return {x: c.left + (px - (v.cx - v.w / 2)) / v.w * c.width, y: c.top + (py - (v.cy - v.h / 2)) / v.h * c.height}; }, [px, py]); await page.touchscreen.tap(r.x, r.y); };

const t0 = Date.now();
await page.goto(url);
check(await until(() => window.READY || window.ERR, 30000), 'the page finished loading');
const err = await page.evaluate(() => window.ERR); if (err) errors.push(err);
check(/Stranded/.test(await page.title()), 'the page is called Stranded Living Camp');
await shot('01-evening', 1500);

// walk across the camp
const before = await page.evaluate(() => BENCH.hero.root.position.toArray());
await tapPaint(560, 640);
check(await until(() => BENCH.walk.moving), 'tapping the ground starts a walk');
check(await until(() => !BENCH.walk.moving, 20000), 'the walk ends');
const after = await page.evaluate(() => BENCH.hero.root.position.toArray());
check(Math.hypot(after[0] - before[0], after[2] - before[2]) > 2, 'the survivor walked somewhere');
await shot('02-walked');

// put the fire out, then light it with the bow drill
await page.click('[data-tab="camp"]');
await page.click('#fire button:nth-child(1)');
await page.click('[data-tab="camp"]');
await tapPaint(767, 552);
check(await until(() => BENCH.seen.has('drill'), 20000), 'tapping the cold fire ring starts the bow drill');
await shot('03-bow-drill', 1500);
check(await until(() => BENCH.camp.state.fire === 'lit', 20000), 'the bow drill and blowing on the coal light the fire');
await shot('04-fire-lit', 1200);

// the woodpile, then the fire again: an armload on
await tapPaint(884, 586);
check(await until(() => BENCH.hero.carrying === 'wood', 20000), 'tapping the woodpile picks up an armload');
await tapPaint(767, 552);
check(await until(() => BENCH.camp.state.fire === 'big', 20000), 'carrying wood to the fire builds it up');

// hour, season, weather and the shelter
await page.click('[data-tab="sky"]');
await page.click('#clockRuns');
await page.evaluate(() => { const h = document.getElementById('hour'); h.value = '22.5'; h.dispatchEvent(new Event('input')); });
await page.click('[data-tab="sky"]');
await shot('05-night', 1500);
await page.click('[data-tab="sky"]');
await page.evaluate(() => { const h = document.getElementById('hour'); h.value = '11'; h.dispatchEvent(new Event('input')); });
await page.click('#season button:nth-child(3)');
await page.click('[data-tab="sky"]');
await shot('06-fall', 1500);
await page.click('[data-tab="sky"]');
await page.click('#season button:nth-child(4)');
await page.click('#weather button:nth-child(6)');
await page.click('[data-tab="sky"]');
await shot('07-winter-snow', 6000);
await page.click('[data-tab="camp"]');
await page.click('#shelter button:nth-child(4)');
check(await page.evaluate(() => BENCH.camp.state.shelter === 3), 'the walled hut can be built');
await shot('08-camp-panel', 600);
await page.click('[data-tab="camp"]');
await page.click('[data-tab="sky"]');
await page.click('#weather button:nth-child(5)');
await page.click('#season button:nth-child(1)');
await page.click('[data-tab="sky"]');
await shot('09-storm', 3000);
await page.click('[data-tab="view"]');
await page.click('#zoom button:nth-child(2)');
await page.click('[data-tab="view"]');
await page.click('[data-tab="sky"]');
await page.click('#weather button:nth-child(1)');
await page.click('[data-tab="sky"]');
await shot('10-whole-camp', 2500);
const stats = await page.evaluate(() => { const I = BENCH.S.renderer.info.render; return I.calls + ' draw calls, ' + Math.round(I.triangles / 1000) + 'k triangles'; });
const ms = Date.now() - t0;
await browser.close();

console.log('screenshots in', out, '(' + (ms / 1000).toFixed(1) + ' s); ' + stats);
if (errors.length || fails.length) {
  if (fails.length) console.log('Did not work:\n' + fails.map(e => '  ' + e).join('\n'));
  if (errors.length) console.log('Errors:\n' + [...new Set(errors)].map(e => '  ' + e).join('\n'));
  process.exit(1);
}
console.log('all good');
