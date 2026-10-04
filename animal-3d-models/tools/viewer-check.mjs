// Opens the built Henry page on a phone-sized screen: each look, each move, turning him by finger. Saves screenshots.
//   node animal-3d-models/tools/viewer-check.mjs [--file animal-3d-models/Henry_Three_Ways.html] [--out animal-3d-models/shots/viewer]
// Ends with "all good" when everything worked and the page threw no errors.
import path from 'node:path';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const here = path.dirname(fileURLToPath(import.meta.url)), top = path.join(here, '..');
const opt = k => { const i = process.argv.indexOf('--' + k); return i >= 0 ? process.argv[i + 1] : null; };
const out = path.resolve(opt('out') || path.join(top, 'shots', 'viewer')); fs.mkdirSync(out, {recursive: true});
const url = pathToFileURL(path.resolve(opt('file') || path.join(top, 'Henry_Three_Ways.html'))).href;
const browser = await pw.chromium.launch({args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
const page = await browser.newPage({viewport: {width: 390, height: 844}, deviceScaleFactor: 2, isMobile: true, hasTouch: true});
const errors = [], fails = [];
page.on('pageerror', e => errors.push(String(e.stack || e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const check = (ok, what) => { if (!ok) fails.push(what); };
const until = async (fn, ms = 60000) => { for (let t = 0; t < ms; t += 250) { if (await page.evaluate(fn)) return true; await page.waitForTimeout(250); } return false; };
const shot = async (n, w) => { await page.waitForTimeout(w || 800); await page.screenshot({path: path.join(out, n + '.png')}); };
await page.goto(url);
check(await until(() => window.READY && document.getElementById('busy').hidden), 'the full-detail Henry was built');
check(/Henry Three Ways/.test(await page.title()), 'the page is called Henry Three Ways');
const tris = await page.evaluate(() => HENRY.cow.tris); console.log('full detail:', Math.round(tris), 'triangles,', await page.evaluate(() => HENRY.calls()), 'draws');
check(tris > 100000, 'the full-detail Henry has more than 100,000 triangles');
await shot('01-full-detail', 1500);
// turn him with a finger
const box = await page.locator('#view').boundingBox();
const yaw0 = await page.evaluate(() => HENRY.view.yaw);
await page.mouse.move(box.width * 0.7, box.height * 0.5); await page.mouse.down(); await page.mouse.move(box.width * 0.3, box.height * 0.5, {steps: 8}); await page.mouse.up();
check(Math.abs(await page.evaluate(() => HENRY.view.yaw) - yaw0) > 0.5, 'dragging turns him');
await shot('02-turned', 600);
for (const [btn, state] of [['Eat', 'eat'], ['Lie down', 'lie']]) {
  await page.locator('[data-act]', {hasText: btn}).tap();
  check(await until(state === 'lie' ? () => HENRY.cow.state === 'lie' : () => HENRY.cow.state === 'eat'), `${btn} makes him ${state === 'lie' ? 'lie down' : 'eat'}`);
  await shot('03-' + state, 200);
}
await page.locator('#faceBtn').tap(); await shot('04-face', 6000); await page.locator('#faceBtn').tap();
await page.locator('[data-act]', {hasText: 'Walk'}).tap();
check(await until(() => HENRY.cow.state === 'stand'), 'Walk gets him up and walking');
await shot('05-walking', 300);
for (const [btn, look] of [['Storybook', 'storybook'], ['Ranch game', 'game']]) {
  await page.locator('[data-look]', {hasText: btn}).tap();
  await page.waitForTimeout(500); await until(() => document.getElementById('busy').hidden);
  await page.waitForTimeout(2500);
  check(await page.evaluate(l => HENRY.look === l, look), `the ${btn} look shows`);
  await shot('06-' + look, 300);
}
await browser.close();
if (errors.length) console.log('errors:\n  ' + errors.join('\n  '));
if (fails.length) console.log('failed:\n  ' + fails.join('\n  '));
console.log(`screenshots in ${path.relative(process.cwd(), out)}`);
if (errors.length || fails.length) process.exit(1);
console.log('all good');
