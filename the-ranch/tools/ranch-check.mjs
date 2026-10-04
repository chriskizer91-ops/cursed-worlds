// Opens the built ranch page on a phone-sized screen and uses it the way a person would: look at the whole ranch, zoom
// down to the farmyard so things stand up, put out hay and fill the troughs, let the chickens out, and look a cow over.
// Saves screenshots.
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
await shot('01-whole-ranch', 1500);
console.log('whole ranch:', JSON.stringify(await info()));

// zoom down over the farmyard: the trees, buildings and signs stand up
await page.evaluate(() => RANCH.flyTo(RANCH.PL.hay.x + 10, RANCH.PL.hay.z - 25, 120, 0.2));
await shot('02-farmyard-from-above', 3200);
const signs = await page.evaluate(() => [...document.querySelectorAll('.sign:not(.off)')].map(b => b.textContent));
check(signs.includes('Hay ring'), 'the Hay ring sign pops up near the farmyard');
console.log('farmyard:', JSON.stringify(await info()), 'signs:', signs.join(', '));

// put out hay: tap the sign, then the button
await page.locator('.sign', {hasText: 'Hay ring'}).first().tap();
check(await until(() => !document.getElementById('sheet').hidden), 'tapping the Hay ring sign opens its sheet');
await page.locator('#sheetBtns button', {hasText: 'Put out a bale'}).tap();
check(await page.evaluate(() => RANCH.hayLeft > 0 && RANCH.done.hay), 'putting out a bale puts hay in the ring and ticks the job off');
await page.locator('#sheetBtns button', {hasText: 'Hay is out'}).waitFor({timeout: 3000}).catch(() => fails.push('the sheet says the hay is out'));
// fill the troughs
await page.evaluate(() => RANCH.openPlace('troughs'));
await page.locator('#sheetBtns button', {hasText: 'Fill the troughs'}).tap();
check(await page.evaluate(() => RANCH.done.water), 'filling the troughs ticks the job off');
// the chickens
await page.evaluate(() => RANCH.openPlace('coop'));
await page.locator('#sheetBtns button', {hasText: 'Let them out'}).tap();
await page.waitForTimeout(2500);
await page.locator('#sheetBtns button', {hasText: 'Scatter feed'}).tap();
check(await page.evaluate(() => RANCH.done.chickens), 'letting the chickens out and feeding them ticks the job off');
await shot('03-chickens-and-hay', 2500);

// the herd heads for the hay: speed time up and wait for them to walk in
await page.locator('#speedBtn').tap();
await page.evaluate(() => RANCH.flyTo(RANCH.PL.hay.x, RANCH.PL.hay.z + 6, 45, 0.3));
const startD = await page.evaluate(() => RANCH.HERD.map(c => Math.hypot(c.x - RANCH.PL.hay.x, c.zz - RANCH.PL.hay.z)));
await page.waitForTimeout(12000);
const endD = await page.evaluate(() => RANCH.HERD.map(c => Math.hypot(c.x - RANCH.PL.hay.x, c.zz - RANCH.PL.hay.z)));
const closer = endD.filter((d, i) => d < startD[i] - 3 || d < 4).length;
console.log('herd distance to the hay (m):', startD.map(Math.round).join(' '), '->', endD.map(Math.round).join(' '));
check(closer >= 4, 'most of the herd walks toward the hay');
await shot('04-herd-coming-to-hay', 400);

// look Henry over: tap his name, then make him lie down and get up
await page.evaluate(() => RANCH.lookAt(RANCH.HERD[0]));
await shot('05-henry-close', 5000);
check(await page.evaluate(() => document.getElementById('sheetTitle').textContent === 'Henry'), "tapping Henry opens his sheet");
await page.locator('#sheetBtns button', {hasText: 'Lie down'}).tap();
check(await until(() => RANCH.HERD[0].z.state === 'lie', 15000), 'Henry lies down');
await shot('06-henry-lying', 600);
await page.locator('#sheetBtns button', {hasText: 'Stand'}).tap();
check(await until(() => RANCH.HERD[0].z.state === 'stand', 15000), 'Henry gets up again');
console.log('close up:', JSON.stringify(await info()));
await page.locator('#sheetBtns button', {hasText: 'Back to the map'}).tap();
await page.locator('#homeBtn').tap();
await shot('07-back-out', 2500);

await browser.close();
if (errors.length) console.log('errors:\n  ' + errors.join('\n  '));
if (fails.length) console.log('failed:\n  ' + fails.join('\n  '));
console.log(`screenshots in ${path.relative(process.cwd(), out)}`);
if (errors.length || fails.length) process.exit(1);
console.log('all good');
