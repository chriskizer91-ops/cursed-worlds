// Plays the two-person game on a phone-sized screen and checks the partner: he says what he'll do and goes, the clock
// runs while you're out walking (and stops while a card is open), you can follow him and find him at his job, tapping
// him tells you what he's doing, and what he brings back shows up in your next result. Then a four-person game: the crew
// share out the work (nobody takes a job one person covers twice over), each has a line under the place name, all three
// are drawn, and tapping one shows the crew's plan. Saves screenshots.
//   node tools/partner-check.mjs [--out shots-folder] [--file some.html]   (Stranded.html, from tools/build-game.mjs, by default)
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
await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
const check = (ok, what) => { if (!ok) fails.push(what); return ok; };
const shot = async name => { await page.waitForTimeout(250); await page.screenshot({path: path.join(out, name + '.png')}); };
const until = async (fn, ms = 12000, arg) => { for (let t = 0; t < ms; t += 150){ if (await page.evaluate(fn, arg)) return true; await page.waitForTimeout(150); } return false; };
const closeSheets = async () => { for (let k = 0; k < 4 && await page.$('#scrim'); k++){ const b = await page.$('.sheet [data-close]'); if (!b) break; await b.click(); await page.waitForTimeout(250); } };
const clock = () => page.evaluate(() => World._v.S.t);
const mate = () => page.evaluate(() => { const S = World._v.S, j = S.mates && S.mates[0].job; return j && {k: j.k, at: j.at, t1: j.t1, t2: j.t2, t3: j.t3, pos: World.matePos()}; });
const tapTile = async (x, y) => { const r = await page.evaluate(([x, y]) => World.client(x, y), [x, y]); if (r) await page.touchscreen.tap(r.cx, r.cy); };
const onScreen = async (x, y) => page.evaluate(([x, y]) => { const c = World.client(x, y); if (!c) return true; const r = World._v.box.getBoundingClientRect(); return c.cx > r.left + 12 && c.cx < r.right - 12 && c.cy > r.top + 50 && c.cy < r.bottom - 12; }, [x, y]);
const tapToward = async (x, y) => {
  for (let k = 0; k < 6 && !(await onScreen(x, y)); k++){
    const q = await page.evaluate(([x, y]) => { const V = World._v, M = V.map.M, r = V.box.getBoundingClientRect(); let best = null;
      for (let j = 0; j < 32; j++) for (let i = 0; i < 48; i++){ if ('gGtfsmH'.indexOf(M[j][i]) < 0) continue; const c = World.client(i, j); if (!c || c.cx < r.left + 20 || c.cx > r.right - 20 || c.cy < r.top + 60 || c.cy > r.bottom - 20) continue;
        const d = Math.hypot(i - x, (j - y) * 1.5); if (!best || d < best.d) best = {i, j, d}; } return best && [best.i, best.j]; }, [x, y]);
    if (!q) break; await tapTile(q[0], q[1]); await until(() => !World._v.auto && !World._v.moving && !World._v.path.length, 20000); await page.waitForTimeout(400);
  }
  await tapTile(x, y);
};
const goTo = async k => {
  let ok = false;
  for (let i = 0; i < 4 && !ok; i++){
    await closeSheets(); await page.evaluate(k => World.goTo(k), k);
    await until(k2 => (World._v.S.loc === k2 && !World._v.auto) || (!World._v.auto && !!document.querySelector('#scrim')), 60000, k);
    ok = await page.evaluate(k => World._v.S.loc === k, k);
  }
  await until(() => !!document.querySelector('#scrim'), 3000); await closeSheets(); await until(() => World.living(), 20000);
  return ok;
};
const useSpot = async (pred, job) => {
  await closeSheets();
  // (not the thing he's working at: a tap there could land on him)
  const T = await page.evaluate(pred => { const S = World._v.map.spots, j = World._v.S.mates && World._v.S.mates[0].job, his = j && j.act;
    for (const id in S){ const acts = S[id].acts || []; if (new RegExp(pred).test(acts.join(' ')) && acts.indexOf(his) < 0) return S[id].tiles; } return null; }, pred);
  if (!T) return false;
  let open = false;
  for (let k = 0; k < Math.min(4, T.length) && !open; k++){ await tapToward(T[k][0], T[k][1]); open = await until(() => World._v.menuOpen, k ? 8000 : 20000); }
  if (!open) return false;
  const i = await page.evaluate(job => [...document.querySelectorAll('.wmenu [data-wi]')].findIndex(b => b.textContent.indexOf(job) >= 0 && b.getAttribute('aria-disabled') !== 'true' && (job || !/Fish with|Hunt/.test(b.textContent))), job);
  if (i < 0) return false;
  await page.click(`.wmenu [data-wi="${i}"]`); return true;
};

const t0 = Date.now();
await page.goto(url);
await page.waitForSelector('#newgame');
await page.evaluate(() => localStorage.clear());
await page.reload(); await page.waitForSelector('#newgame');
await page.click('[data-opt="party"][data-v="duo"]'); await page.waitForTimeout(300);
await page.click('#newgame');
await page.waitForSelector('.sheet');
check(await page.evaluate(() => /Your partner has ideas of his own/.test(document.querySelector('.sheet').textContent)), 'the first morning says the partner works on his own, and what he\'ll do');
await shot('p01-day1');
await page.click('.sheet [data-close]');
check(await until(() => World.living(), 20000), 'the camp is drawn alive');

// ---- he says what he'll do, in a bubble over his head, and the clock runs while you watch
check(await until(() => document.querySelector('.wbub').classList.contains('on'), 6000), 'the partner says what he\'ll do, over his head');
await shot('p02-he-says');
let m = await mate();
check(!!m && m.at !== 'camp', 'his first job takes him away from camp (' + (m && m.k + ' at ' + m.at) + ')');
let c0 = await clock(); await page.waitForTimeout(5000);
check((await clock()) - c0 >= 3 / 60, 'the clock runs while you\'re out walking');
check(await page.evaluate(() => /Your partner:/.test(document.querySelector('#mateline').textContent)), 'the line under the place name says what the partner is doing');
// ...and stops while a card is open
await page.click('[data-m="menu"]'); await page.waitForTimeout(300);
c0 = await clock(); await page.waitForTimeout(3000);
check(Math.abs((await clock()) - c0) < 1e-6, 'the clock stops while a card is open');
await closeSheets();
// he walks out of camp
check(await until(() => { const p = World.matePos(); return !p || p.doing === 'walk'; }, 30000), 'the partner sets off');
await shot('p03-he-goes');

// ---- follow him to his job, and find him there working
m = await mate();
check(await goTo(m.at), 'followed him to ' + m.at);
check(await until(() => !!World.matePos(), 40000), 'found the partner at ' + m.at);
const mp = await page.evaluate(() => World.matePos());
if (mp){
  // walk up beside him, on open ground that isn't something to use (a tap there would open its menu instead)
  const near = await page.evaluate(([mx, my]) => { const V = World._v, M = V.map.M; let best = null;
    for (let j = 0; j < 32; j++) for (let i = 0; i < 48; i++){ if ('gGtfsm'.indexOf(M[j][i]) < 0 || V.map.spotAt[j * 48 + i]) continue; const d = Math.hypot(i - mx, j - my); if (d < 1.5 || d > 4) continue; if (!best || d < best.d) best = {i, j, d}; }
    return best && [best.i, best.j]; }, [Math.round(mp.x), Math.round(mp.y)]);
  if (near) await tapToward(near[0], near[1]);
  await until(() => !World._v.auto && !World._v.moving && !World._v.path.length, 20000); await page.waitForTimeout(1200);
  if (await page.evaluate(() => World._v.menuOpen)){ await page.click('.ab [data-k="b"]'); await page.waitForTimeout(300); }
  await shot('p04-at-his-job');
  const sp = await page.evaluate(() => { const L = World._lv, S = L.S, v = S.view, r = L.cv.getBoundingClientRect(), w = L.partner.root.position.clone(); w.y = 0.9; const q = S.toPaint(w); return [r.left + (q[0] - (v.cx - v.w / 2)) / v.w * r.width, r.top + (q[1] - (v.cy - v.h / 2)) / v.h * r.height]; });
  await page.touchscreen.tap(sp[0], sp[1]);
  check(await until(() => /Your partner/.test((document.querySelector('.sheet') || {}).textContent || ''), 3000), 'tapping the partner tells you what he\'s doing');
  await shot('p05-tap-him');
  await closeSheets();
}

// ---- your own work, while he finishes his: the result says what he brought back
let said = false;
for (let k = 0; k < 4 && !said; k++){
  const where = await page.evaluate(() => World._v.S.loc);
  if (!(await useSpot(where === 'camp' ? 'firestart|cook' : 'forage_|explore_|wood[A-Z]|fill_|drink_', ''))) { await page.evaluate(() => World._v.S.t); break; }
  await until(() => !!document.querySelector('.sheet'), 6000);
  said = await page.evaluate(() => /Your partner is back|Your partner:/.test((document.querySelector('.matenews') || {}).textContent || ''));
  if (said) await shot('p06-meanwhile');
  await closeSheets();
}
check(said, 'a result tells you what the partner said or brought back meanwhile');
await page.evaluate(() => window.scrollTo(0, 420)); await shot('p07-his-line');

// ---- a crew of four: three partners who plan together
await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector('#newgame');
await page.click('[data-opt="party"][data-v="four"]'); await page.waitForTimeout(300);
await page.click('#newgame'); await page.waitForSelector('.sheet');
check(await page.evaluate(() => /Your crew: Wade, June and Abe/.test(document.querySelector('.sheet').textContent)), 'the first morning names the crew and what each is best at');
await shot('p08-crew-day1');
await page.click('.sheet [data-close]');
check(await until(() => World.living(), 20000), 'the camp is drawn alive for the crew');
const plan = await page.evaluate(() => World._v.S.mates.map(M => M.job && {k: M.job.k, at: M.job.at, say: M.job.say}));
const one = plan.filter(j => j && ['water', 'boil', 'fire', 'snares', 'trap'].indexOf(j.k) >= 0).map(j => j.k);
check(plan.length === 3 && plan.every(Boolean), 'all three partners have a job on the first morning');
check(new Set(one).size === one.length, 'no two partners take the same one-person job (' + plan.map(j => j && j.k).join(', ') + ')');
check(plan.some(j => / so |Since |covered/.test(j.say)), 'a partner says how their job fits the others\' ("' + plan.map(j => j && j.say).join('" / "') + '")');
check(await page.evaluate(() => document.querySelectorAll('#mateline .ml').length === 3), 'a line for each partner under the place name');
await page.waitForTimeout(1500);
const seen = await page.evaluate(() => [0, 1, 2].filter(i => !!World.matePos(i)).length);
check(seen >= 2, 'the crew are drawn at camp as they set off (' + seen + ' of 3 in sight)');
await shot('p09-crew-camp');
const who = await page.evaluate(() => { const L = World._lv; for (let i = 0; i < 3; i++){ const P = L.partners[i]; if (!P.root.visible) continue; const S = L.S, v = S.view, r = L.cv.getBoundingClientRect(), w = P.root.position.clone(); w.y = 0.9; const q = S.toPaint(w); return [r.left + (q[0] - (v.cx - v.w / 2)) / v.w * r.width, r.top + (q[1] - (v.cy - v.h / 2)) / v.h * r.height]; } return null; });
if (who) await page.touchscreen.tap(who[0], who[1]);
check(!!who && await until(() => /The crew's plan/.test((document.querySelector('.sheet') || {}).textContent || '') && document.querySelectorAll('.sheet .crew').length === 3, 3000), 'tapping a partner shows the crew\'s plan, all three');
await shot('p10-crew-plan');
await closeSheets();
const ms = Date.now() - t0;
await browser.close();

console.log('screenshots in', out, '(' + (ms / 1000).toFixed(1) + ' s)');
if (errors.length || fails.length){
  if (fails.length) console.log('Did not work:\n' + fails.map(e => '  ' + e).join('\n'));
  if (errors.length) console.log('Errors:\n' + [...new Set(errors)].map(e => '  ' + e).join('\n'));
  process.exit(1);
}
console.log('all good');
