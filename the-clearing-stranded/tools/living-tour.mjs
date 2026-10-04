// A tour of the living world in the game, for screenshots: every painted place, and the camp at night, in fall, and in
// winter snow. Uses the built single file (tools/build-game.mjs) on a phone-sized screen.
//   node tools/living-tour.mjs [--file Stranded.html] [--out shots/tour]
// Ends with "all good" when every place was drawn alive and the page threw no errors.
import path from 'node:path';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';

const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), oi = args.indexOf('--out'), fi = args.indexOf('--file');
const out = oi >= 0 ? args[oi + 1] : path.join(here, '..', 'shots', 'tour');
fs.mkdirSync(out, {recursive: true});
const url = pathToFileURL(fi >= 0 ? path.resolve(args[fi + 1]) : path.join(here, '..', 'Stranded.html')).href;

const browser = await pw.chromium.launch({args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
const page = await browser.newPage({viewport: {width: 390, height: 844}, deviceScaleFactor: 2, isMobile: true, hasTouch: true});
const errors = [], fails = [];
page.on('pageerror', e => errors.push(String(e.stack || e)));
page.on('console', m => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)|ERR_FAILED/.test(m.text() + ' ' + (m.location().url || ''))) errors.push(m.text()); });
await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
const until = async (fn, ms = 15000) => { for (let t = 0; t < ms; t += 200) { if (await page.evaluate(fn)) return true; await page.waitForTimeout(200); } return false; };

await page.goto(url);
await page.waitForSelector('#newgame');
await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector('#newgame');
await page.click('#newgame'); await page.waitForSelector('.sheet'); await page.click('.sheet [data-close]');
await until(() => World.living(), 20000);

// put the survivor somewhere, at a time of year and day, in some weather, with some of the camp built
const visit = (o) => page.evaluate(o => {
  const S = World._v.S; S.loc = o.k; S.map = null;
  if (o.build) { Object.assign(S.tools, o.build.tools || {}); if (o.build.shelter != null) S.shelter = o.build.shelter; if (o.build.fire) { S.fire.st = o.build.fire; S.fire.fuel = 12; } if (o.build.wood) S.inv.wood = o.build.wood; }
  if (o.party) S.P = o.party;
  World.sync(S, Engine.hud(S), {});
  const F = World._v.F; F.month = o.m; F.dom = 15; F.hour = o.h; F.raining = !!o.rain; F.sky = o.sky || 'clear';
  if (o.at) { const V = World._v; V.pos.x = o.at[0]; V.pos.y = o.at[1]; World._lv.pos = null; World._lv.ppos = null; World._lv.snap = true; }
  window.__tour = o; return true;
}, o);
// keep the forced season and hour while the frames run (the game would put its own back on its next render)
const hold = async (ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { await page.evaluate(() => { const o = window.__tour, F = World._v.F; F.month = o.m; F.hour = o.h; F.raining = !!o.rain; F.sky = o.sky || 'clear'; }); await page.waitForTimeout(250); } };
const stops = [
  {name: '01-camp-spring', k: 'camp', m: 4, h: 10.5, at: [22, 18], build: {shelter: 1, fire: 'lit', wood: 4, tools: {rack: true}}},
  {name: '02-camp-evening', k: 'camp', m: 4, h: 20.2, at: [23, 17]},
  {name: '03-camp-night', k: 'camp', m: 4, h: 23, at: [22, 18], party: 2},
  {name: '04-camp-summer', k: 'camp', m: 7, h: 15, at: [22, 18], build: {shelter: 2, tools: {bedding: true, rain: true, hang: true}}},
  {name: '05-camp-fall', k: 'camp', m: 9, h: 11, at: [22, 18], build: {tools: {workbench: true, woodstore: true}}},
  {name: '06-camp-winter-snow', k: 'camp', m: 0, h: 12, at: [22, 18], rain: true, sky: 'snow', build: {shelter: 3, tools: {blanket: true, hearth: true, lookout: true}}},
  {name: '07-cedar', k: 'cedar', m: 4, h: 10},
  {name: '08-cedar-fall', k: 'cedar', m: 9, h: 16},
  {name: '09-oak', k: 'oak', m: 4, h: 9},
  {name: '10-prairie', k: 'prairie', m: 5, h: 17.5},
  {name: '11-berry', k: 'berry', m: 5, h: 10},
  {name: '12-river-rain', k: 'river', m: 3, h: 13, rain: true, sky: 'rain'},
  {name: '13-pond', k: 'pond', m: 6, h: 8},
  {name: '14-creek', k: 'creek', m: 9, h: 15},
  {name: '15-spring', k: 'spring', m: 4, h: 12}
];
for (const s of stops) {
  await visit(s);
  if (!s.at) await page.evaluate(() => { const V = World._v; V.pos.x = V.map.hub[0]; V.pos.y = V.map.hub[1]; World._lv.pos = null; World._lv.snap = true; });
  if (!(await until(() => World.living() && World._lv.k === World._v.S.loc, 20000))) fails.push(s.name + ': not drawn alive');
  await hold(s.rain ? 5000 : 2500);
  await page.screenshot({path: path.join(out, s.name + '.png')});
}
await browser.close();
console.log('screenshots in', out);
if (errors.length || fails.length) {
  if (fails.length) console.log('Did not work:\n' + fails.map(e => '  ' + e).join('\n'));
  if (errors.length) console.log('Errors:\n' + [...new Set(errors)].map(e => '  ' + e).join('\n'));
  process.exit(1);
}
console.log('all good');
