// Opens the game in a phone-sized browser, plays a little, and saves screenshots.
//   node tools/phone-check.mjs [--out shots-folder]
// Ends with "all good" when the page threw no errors.
import path from 'node:path';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';

const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), oi = args.indexOf('--out');
const out = oi >= 0 ? args[oi + 1] : path.join(here, '..', 'shots');
fs.mkdirSync(out, {recursive: true});
const url = pathToFileURL(path.join(here, '..', 'index.html')).href;

const browser = await pw.chromium.launch();
const page = await browser.newPage({viewport: {width: 390, height: 844}, deviceScaleFactor: 2, isMobile: true, hasTouch: true});
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text() + ' ' + (m.location().url || ''))) errors.push(m.text()); });
await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());   // play as if offline

const shot = async name => { await page.waitForTimeout(400); await page.screenshot({path: path.join(out, name + '.png')}); };
const t0 = Date.now();
await page.goto(url);
await page.waitForSelector('#newgame');
await shot('01-title');
await page.evaluate(() => localStorage.clear());
await page.click('#newgame');
await page.waitForSelector('.sheet');
await shot('02-day1');
await page.click('[data-close]');
await shot('03-here');
for (const t of ['pack', 'craft', 'journal']){ await page.click(`[data-tab="${t}"]`); await shot('04-' + t); }
await page.click('[data-tab="here"]');
// follow the Next step card a few times, the way a player would
for (let i = 0; i < 12; i++){
  // answer whatever sheet is open first: an encounter, a result, a plan
  for (let k = 0; k < 4 && await page.$('#scrim'); k++){
    const opt = await page.$('.sheet .opt');
    if (opt){ await opt.click(); await page.waitForTimeout(150); continue; }
    const close = await page.$('.sheet [data-close]');
    if (close){ await close.click(); await page.waitForTimeout(150); continue; }
    errors.push('A sheet with no way to close it: ' + (await page.$eval('.sheet', el => el.innerText.slice(0, 160))));
    break;
  }
  if (await page.$('#scrim')) break;
  const b = await page.$('.next-actions .btn.hot:not([disabled])');
  if (!b) break;
  await b.click();
  await page.waitForTimeout(150);
}
await shot('05-after-playing');
const ms = Date.now() - t0;
await browser.close();

console.log('screenshots in', out, '(' + (ms / 1000).toFixed(1) + ' s)');
if (errors.length){ console.log('Errors:\n' + [...new Set(errors)].map(e => '  ' + e).join('\n')); process.exit(1); }
console.log('all good');
