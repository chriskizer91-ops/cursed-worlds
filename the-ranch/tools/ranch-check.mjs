// Opens the built ranch page on a phone-sized screen and uses it the way a person would: look at the whole ranch, zoom
// down to the farmyard so things stand up, put out hay and fill the troughs, let the chickens out, and look a cow over.
// Checks the painted map is the ground (with its own grass and dirt close up), the world round it is drawn for real (3D
// trees, grass, none in the pond), the herd is the cartoon cattle, and the rancher does the jobs he is given: the hay
// with the tractor, the troughs, the chickens, and looking the herd over. Saves
// screenshots.
// A computer with no graphics chip draws the ranch only a frame or two a second, so the check moves the world on with
// RANCH.skip(seconds) where a person would simply wait.
//   node the-ranch/tools/ranch-check.mjs [--file the-ranch/The_Ranch.html] [--out the-ranch/shots/phone]
// Ends with "all good" when everything worked and the page threw no errors.
import path from 'node:path';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';

const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const here = path.dirname(fileURLToPath(import.meta.url)), top = path.join(here, '..');
const opt = k => { const i = process.argv.indexOf('--' + k); return i >= 0 ? process.argv[i + 1] : null; };
const out = path.resolve(opt('out') || path.join(top, 'shots', 'phone')); fs.mkdirSync(out, {recursive: true});
const url = pathToFileURL(path.resolve(opt('file') || path.join(top, 'The_Ranch.html'))).href;

const browser = await pw.chromium.launch({args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
const page = await browser.newPage({viewport: {width: 390, height: 844}, deviceScaleFactor: 2, isMobile: true, hasTouch: true});
const errors = [], fails = [];
page.on('pageerror', e => errors.push(String(e.stack || e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const check = (ok, what) => { if (!ok) fails.push(what); };
const shot = async (name, wait) => { await page.waitForTimeout(wait || 800); await page.screenshot({path: path.join(out, name + '.png')}); };
const until = async (fn, ms = 20000) => { for (let t = 0; t < ms; t += 200) { if (await page.evaluate(fn)) return true; await page.waitForTimeout(200); } return false; };
const info = async () => page.evaluate(() => ({calls: RANCH.calls(), tris: RANCH.tris()}));

await page.goto(url);
check(await until(() => window.READY || window.ERR, 40000), 'the page finished loading');
const err = await page.evaluate(() => window.ERR); if (err) errors.push(err);
check(await until(() => RANCH.tilesLoaded === 6), 'all six pieces of the map loaded');
check(/The Ranch/.test(await page.title()), 'the page is called The Ranch');
await page.evaluate(() => RANCH.skip(0.2));
check(await page.evaluate(() => RANCH.land.painted), "the land takes its colors from the painting");
check(await page.evaluate(() => RANCH.HERD.every(c => c.z.style === 'storybook' && c.z.tris > 5000)), 'Henry and the herd are the cartoon cattle');
await shot('01-whole-ranch', 1500);
console.log('whole ranch:', JSON.stringify(await info()));

// zoom down over the farmyard: the trees, buildings and signs stand up
await page.evaluate(() => { RANCH.flyTo(RANCH.PL.hay.x + 10, RANCH.PL.hay.z - 25, 120, 0.2); RANCH.skip(3); });
await shot('02-farmyard-from-above', 2500);
check(await page.evaluate(() => RANCH.land.stats().trees > 100), 'the trees stand up as 3D trees round the farmyard');
check(await page.evaluate(() => RANCH.land.mapDetail), "close up, the painted map keeps its own grass and dirt");
const signs = await page.evaluate(() => [...document.querySelectorAll('.sign:not(.off)')].map(b => b.textContent));
check(signs.includes('Hay ring'), 'the Hay ring sign pops up near the farmyard');
console.log('farmyard:', JSON.stringify(await info()), 'signs:', signs.join(', '));

// no 3D tree stands in the pond
await page.evaluate(() => { const p = RANCH.land.toW(715, 1352); RANCH.flyTo(p.x, p.z + 20, 45, 0); RANCH.skip(3); });
check(await page.evaluate(() => RANCH.pondTrees() === 0), 'no 3D tree stands in the pond');
await shot('02b-pond', 1500);

// hay: tap the Hay ring sign and ask the rancher; he fetches a bale from the hay barn on the tractor's spear
await page.evaluate(() => { RANCH.flyTo(RANCH.PL.hay.x + 10, RANCH.PL.hay.z - 25, 120, 0.2); RANCH.skip(3); });
await page.waitForTimeout(1500);
await page.locator('.sign', {hasText: 'Hay ring'}).first().tap();
check(await until(() => !document.getElementById('sheet').hidden), 'tapping the Hay ring sign opens its sheet');
await page.locator('#sheetBtns button', {hasText: 'Ask the rancher to bring a bale'}).tap();
check(await page.evaluate(() => RANCH.orders.busyWith('hay')), 'the rancher takes the job');
const runUntil = async (fn, most) => { for (let s = 0; s < most; s += 4) { const r = await page.evaluate(fn); if (r) return true; await page.evaluate(() => RANCH.skip(4)); } return false; };
check(await runUntil(() => RANCH.tractor.bale, 400) && await page.evaluate(() => RANCH.crew.onTractor), 'the rancher gets on the tractor and spears a bale');
await page.evaluate(() => { RANCH.watchCrew(); RANCH.skip(1.5); document.getElementById('sheet').hidden = true; });
await shot('03-tractor-with-a-bale', 2500);
check(await runUntil(() => RANCH.hayLeft > 0 && RANCH.done.hay, 300), 'he drops the bale in the hay ring, and the job is ticked off');
// the herd heads for the hay as soon as it's in the ring: speed time up and wait for them to walk in
await page.locator('#speedBtn').tap();
const startD = await page.evaluate(() => RANCH.HERD.map(c => Math.hypot(c.x - RANCH.PL.hay.x, c.zz - RANCH.PL.hay.z)));
await page.evaluate(() => RANCH.skip(12));
const endD = await page.evaluate(() => RANCH.HERD.map(c => Math.hypot(c.x - RANCH.PL.hay.x, c.zz - RANCH.PL.hay.z)));
const closer = endD.filter((d, i) => d < startD[i] - 3 || d < 4).length;
console.log('herd distance to the hay (m):', startD.map(Math.round).join(' '), '->', endD.map(Math.round).join(' '));
check(closer >= 4, 'most of the herd walks toward the hay');
await page.evaluate(() => { document.getElementById('sheet').hidden = true; RANCH.flyTo(RANCH.PL.hay.x, RANCH.PL.hay.z + 6, 45, 0.3); RANCH.skip(2); });
await shot('05-herd-at-the-hay', 1500);
check(await runUntil(() => RANCH.orders.idle && !RANCH.crew.onTractor, 300), 'he parks the tractor and climbs off');

// the troughs and the chickens: three jobs given at once from the rancher's own sheet; he does them in turn
await page.locator('#crewBtn').tap();
check(await until(() => document.getElementById('sheetTitle').textContent === 'Rancher'), 'the Rancher button opens his sheet');
for (const job of ['Fill the water troughs', 'Let the chickens out', 'Feed the chickens']) await page.locator('#sheetBtns button', {hasText: job}).tap();
check(await page.evaluate(() => RANCH.orders.queue.length + (RANCH.orders.job ? 1 : 0) === 3), 'he keeps all three jobs in his list');
check(await runUntil(() => RANCH.done.water && RANCH.done.chickens, 500), 'he fills the troughs, lets the chickens out and feeds them');
check(await page.evaluate(() => RANCH.troughs.every(t => t.level > 0.5) && RANCH.chickensOut), 'the troughs are full and the chickens are out');
await page.evaluate(() => { RANCH.watchCrew(); RANCH.skip(2); });
await shot('04-rancher-at-the-coop', 2500);
await page.evaluate(() => { document.getElementById('sheet').hidden = true; });


// look Henry over: tap his name, then make him lie down and get up
await page.evaluate(() => { RANCH.lookAt(RANCH.HERD[0]); RANCH.skip(3); });
await shot('06-henry-close', 2500);
check(await page.evaluate(() => RANCH.land.grassGrows > 0.5), 'grass grows round Henry close up');
check(await page.evaluate(() => document.getElementById('sheetTitle').textContent === 'Henry'), "tapping Henry opens his sheet");
await page.locator('#sheetBtns button', {hasText: 'Lie down'}).tap();
check(await until(() => { RANCH.skip(0.5); return RANCH.HERD[0].z.state === 'lie'; }, 40000), 'Henry lies down');
await shot('07-henry-lying', 600);
await page.locator('#sheetBtns button', {hasText: 'Stand'}).tap();
check(await until(() => { RANCH.skip(0.5); return RANCH.HERD[0].z.state === 'stand'; }, 40000), 'Henry gets up again');
console.log('close up:', JSON.stringify(await info()));
await page.locator('#sheetBtns button', {hasText: 'Back to the map'}).tap();
await page.locator('#crewBtn').tap();
await page.locator('#sheetBtns button', {hasText: 'Look the herd over'}).tap();
check(await runUntil(() => RANCH.done.look, 900), 'the rancher looks the whole herd over');
await page.evaluate(() => { RANCH.watchCrew(); RANCH.skip(1); });
await shot('08-rancher-looking-the-herd-over', 2500);
await page.locator('#sheetBtns button', {hasText: 'Back to the map'}).tap();
await page.locator('#homeBtn').tap();
await page.evaluate(() => RANCH.skip(2));
await shot('09-back-out', 2500);

await browser.close();
if (errors.length) console.log('errors:\n  ' + errors.join('\n  '));
if (fails.length) console.log('failed:\n  ' + fails.join('\n  '));
console.log(`screenshots in ${path.relative(process.cwd(), out)}`);
if (errors.length || fails.length) process.exit(1);
console.log('all good');
