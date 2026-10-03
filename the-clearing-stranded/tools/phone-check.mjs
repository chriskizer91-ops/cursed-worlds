// Opens the game in a phone-sized browser and plays the first quest the way a player would: walk down the trail to
// the river, tap the water's edge, drink. Then a skill moment, the field map, and every tab. Saves screenshots.
//   node tools/phone-check.mjs [--out shots-folder] [--file some.html]
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
const url = pathToFileURL(fi >= 0 ? path.resolve(args[fi + 1]) : path.join(here, '..', 'index.html')).href;

const browser = await pw.chromium.launch();
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
const tapTile = async (x, y) => { const r = await page.evaluate(([x, y]) => { const V = World._v, c = V.cv.getBoundingClientRect(), Z = V.Z; return {cx: c.left + ((x + 0.5) * 16 - V.cam[0]) / Z.W * c.width, cy: c.top + ((y + 0.5) * 16 - V.cam[1]) / Z.H * c.height}; }, [x, y]); await page.touchscreen.tap(r.cx, r.cy); };

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
await shot('03-camp');

// the first quest: walk down the south trail, then tap its end, which walks you off it to the river
const exit = await page.evaluate(() => World._v.map.exits.find(e => e.to === 'river'));
await tapTile(exit.x, exit.y - 5);
await until(() => !World._v.auto && !World._v.moving && World._v.pos.y >= World._v.map.exits.find(e => e.to === 'river').y - 6);
await page.waitForTimeout(300);
await tapTile(exit.x, exit.y);
check(await until(() => World._v.S.loc === 'river'), 'walked down the trail to the River Bank');
await page.waitForTimeout(400);
await closeSheets();
await shot('04-river');
// tap the water's edge: walk up to it and get its menu
const edge = await page.evaluate(() => World._v.map.spots.edge.tiles[0]);
await tapTile(edge[0], edge[1]);
check(await until(() => World._v.menuOpen), 'tapping the water\'s edge opens its menu');
await shot('05-edge-menu');
await page.click('.wmenu [data-wi="0"]');
await page.waitForTimeout(400);
check(await page.evaluate(() => !!World._v.S.quest.done.water), 'drinking finished the first quest');
await shot('06-quest-done');
await closeSheets();

// a skill moment: the bow drill at the fire ring
await page.evaluate(() => { const S = World._v.S; S.tools.bowdrill = true; S.inv.bark = 2; S.inv.wood = 3; });
await page.evaluate(() => World.goTo('camp'));
check(await until(() => World._v.S.loc === 'camp'), 'walked back to camp from the field map\'s way of going');
await page.waitForTimeout(400);
await closeSheets();
const ring = await page.evaluate(() => World._v.map.spots.ring.tiles[0]);
await tapTile(ring[0], ring[1]);
check(await until(() => World._v.menuOpen), 'tapping the fire ring opens its menu');
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
