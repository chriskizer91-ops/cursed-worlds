// Plays the hunting and fishing games on a phone-sized screen, the way a player would: the practice range and the
// practice pond from the menu (no time may pass), then a real hour of fishing at the River Bank and a real hunt on the
// Prairie, each ending in its result, the skill points and the Journal's catch log. Saves screenshots.
//   node tools/minigames-check.mjs [--out shots-folder] [--file some.html]   (Stranded.html, from tools/build-game.mjs, by default)
// Ends with "all good" when everything worked and the page threw no errors.
import path from 'node:path';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';

const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), oi = args.indexOf('--out'), fi = args.indexOf('--file'), only = args.indexOf('--only') >= 0 ? args[args.indexOf('--only') + 1] : '';
const part = k => !only || only === k;
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
const closeSheets = async () => { for (let k = 0; k < 4 && await page.$('#scrim'); k++){ const b = await page.$('.sheet [data-close]'); if (!b) break; await b.click(); await page.waitForTimeout(200); } };
const clock = () => page.evaluate(() => World._v.S.t);
const tapTile = async (x, y) => { const r = await page.evaluate(([x, y]) => World.client(x, y), [x, y]); await page.touchscreen.tap(r.cx, r.cy); };
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
// walk to a place by the field map's way of going, and up to a spot there; open its menu and pick a job by its name
// (a trip through another place can stop there on a card, as it would for a player; close it and go on)
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
  const T = await page.evaluate(pred => { const S = World._v.map.spots; for (const id in S) if (new RegExp(pred).test((S[id].acts || []).join(' '))) return S[id].tiles; return null; }, pred);
  if (!T) return false;
  // tap the thing; if you're already beside it and the tap lands on you, tap another part of it
  let open = false;
  for (let k = 0; k < Math.min(4, T.length) && !open; k++){ await tapToward(T[k][0], T[k][1]); open = await until(() => World._v.menuOpen, k ? 8000 : 20000); }
  if (!open) return false;
  const i = await page.evaluate(job => [...document.querySelectorAll('.wmenu [data-wi]')].findIndex(b => b.textContent.indexOf(job) >= 0), job);
  if (i < 0) return false;
  await page.click(`.wmenu [data-wi="${i}"]`); return true;
};

// an angler: cast to the middle, strike when the float goes under, reel while the line is green, let go before it's red
async function angler(maxMs, deep){
  const t0 = Date.now(); let holding = false, cardShot = false;
  while (Date.now() - t0 < maxMs){
    const st = await page.evaluate(() => { const c = window.Fishing && Fishing.current; if (!c) return null; const s = c.state(); return {mode: s.mode, eng: s.engaged, ten: s.ten, bait: s.bait, n: s.caught.length, deep: c._st.deep}; });
    if (!st) return null;
    if (st.mode === 'card'){ if (holding){ await page.mouse.up(); holding = false; } return st; }
    if (st.mode === 'end') return st;
    if (st.mode === 'ready'){ if (deep && !st.deep) await page.click('.f-depth [data-d="bot"]'); await page.mouse.move(220, 560); await page.mouse.down(); await page.waitForTimeout(650); await page.mouse.up(); }
    else if (st.mode === 'out'){ if (!st.bait){ const b = await page.$('.f-reel:not([hidden])'); if (b) await b.click(); } else if (st.eng === 'bite'){ await page.mouse.move(220, 560); await page.mouse.down(); await page.mouse.up(); } }
    else if (st.mode === 'fight'){ if (!holding && st.ten < 0.55){ await page.mouse.move(220, 560); await page.mouse.down(); holding = true; } else if (holding && st.ten > 0.8){ await page.mouse.up(); holding = false; } }
    await page.waitForTimeout(30);
  }
  if (holding) await page.mouse.up();
  return null;
}
// a shooter: wait for an animal in the open, put the sights on it, hold steady a second, let go
async function shooter(){
  for (let s = 0; s < 3; s++){
    // (this machine draws 3D slowly, so give the animal time to come out; then shoot at whatever is in view)
    await until(() => { const H = window.Hunt && Hunt.current; return !H || H.state().over || H.animals.some(a => a.alive && !a.gone && (a.st === 'graze' || a.st === 'feed' || a.fly)); }, 40000);
    const tgt = await page.evaluate(() => { const H = Hunt.current; if (!H || H.state().over) return null; const a = H.animals.find(a => a.alive && !a.gone && (a.st === 'graze' || a.st === 'feed' || a.fly)) || H.animals.find(a => a.alive && !a.gone); if (!a) return null; const b = H.rectOf(a); return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; });
    if (!tgt) break;
    await page.mouse.move(tgt[0], tgt[1]); await page.mouse.down();
    for (let i = 0; i < 16; i++){ await page.waitForTimeout(60); const p = await page.evaluate(() => { const H = Hunt.current; const a = H && H.animals.find(a => a.alive && !a.gone); if (!a) return null; const b = H.rectOf(a); return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; }); if (p) await page.mouse.move(p[0], p[1]); }
    if (s === 0) await shot('m05-hunt-aim');
    await page.mouse.up(); await page.waitForTimeout(700);
    if (await page.evaluate(() => !!document.querySelector('.hunt .h-end'))) break;
  }
  return until(() => !!document.querySelector('.hunt .h-end'), 120000);
}

const t0 = Date.now();
await page.goto(url);
await page.waitForSelector('#newgame');
await page.evaluate(() => localStorage.clear());
await page.reload(); await page.waitForSelector('#newgame');
await page.click('#newgame');
await page.waitForSelector('.sheet');
await page.click('.sheet [data-close]');
check(await until(() => World.living(), 20000), 'the camp is drawn alive');

// ---- the practice pond: a fish caught and let go, and no time passes
let c0 = await clock(), st = null;
if (part('practice')){
await page.click('[data-m="menu"]'); await page.click('[data-m="pfish"]');
check(await until(() => !!document.getElementById('fishing'), 8000), 'Practice fishing opens the fishing game');
await shot('m01-practice-pond');
st = await angler(90000, false);
check(st && st.mode === 'card', 'a fish was landed at the practice pond');
if (st && st.mode === 'card'){ await shot('m02-practice-catch'); await page.click('.f-card button'); }
await page.click('.f-quit'); await page.waitForSelector('.f-card button'); await page.click('.f-card button');
check(await until(() => !document.getElementById('fishing'), 4000), 'the practice pond closes');
check(Math.abs((await clock()) - c0) < 1e-6, 'no time passed at the practice pond');

// ---- the practice range: shots at a few animals, and no time passes
await page.click('[data-m="menu"]'); await page.click('[data-m="phunt"]');
check(await until(() => !!document.getElementById('hunt'), 15000), 'Practice shooting opens the hunting game');
await page.waitForTimeout(1500);
await shot('m03-practice-range');
check(await shooter(), 'a practice round ends');
await shot('m04-practice-end');
await page.click('.hunt .h-end [data-k="done"]');
check(await until(() => !document.getElementById('hunt'), 4000), 'the practice range closes');
check(Math.abs((await clock()) - c0) < 1e-6, 'no time passed on the practice range');
}

// ---- an hour of fishing at the River Bank, with bait on the bottom for the catfish
if (part('fish')){
check(await goTo('river'), 'walked to the River Bank');
await page.evaluate(() => { World._v.S.inv.grubs = 4; });
c0 = await clock();
check(await useSpot('fish_river', 'Fish'), 'the water\'s edge offers fishing');
check(await until(() => !!document.getElementById('fishing'), 8000), 'fishing opens the fishing game');
await page.waitForTimeout(400);
await shot('m06-fishing');
st = await angler(70000, true);
if (st && st.mode === 'card'){ await shot('m07-catch-card'); await page.click('.f-card button'); }
if (await page.$('.f-quit')) await page.click('.f-quit').catch(() => {});
await page.waitForSelector('.fishing .f-card ul, .fishing .f-card b'); await shot('m08-hour-done');
await page.click('.fishing .f-card button');
check(await until(() => !document.getElementById('fishing') && !!document.querySelector('.sheet'), 6000), 'the hour of fishing ends in its result');
check((await clock()) - c0 > 0.99, 'an hour passed fishing');
check(await page.evaluate(() => /Fishing|fish/i.test(document.querySelector('.sheet').textContent)), 'the result talks about the fishing');
await shot('m09-fishing-result');
await closeSheets();
}

// ---- a hunt on the Prairie: shoot, and the result
if (part('hunt')){
check(await goTo('prairie'), 'walked to the Prairie');
let hunted = false;
for (let k = 0; k < 6 && !hunted; k++){
  await closeSheets();
  if (!(await useSpot('hunt_', 'Hunt'))) break;
  const shoot = await until(() => !!document.querySelector('.sheet [data-choose="shoot"]'), 6000);
  if (!shoot){ await closeSheets(); continue; }
  await shot('m10-hunt-found');
  await page.click('.sheet [data-choose="shoot"]');
  check(await until(() => !!document.getElementById('hunt'), 15000), 'Shoot opens the hunting game');
  await page.waitForTimeout(1200);
  check(await shooter(), 'the hunt ends');
  await shot('m11-hunt-end');
  await page.click('.hunt .h-end [data-k="done"]');
  check(await until(() => !document.getElementById('hunt') && !!document.querySelector('.sheet'), 6000), 'the hunt ends in its result');
  await shot('m12-hunt-result');
  hunted = true;
}
check(hunted, 'found something to hunt on the Prairie');
await closeSheets();
}

// ---- the Journal: skills and catches
await page.click('[data-tab="journal"]');
await page.click('[data-j="skills"]'); await shot('m13-skills');
check(await page.evaluate(() => document.querySelectorAll('.skl').length === 8), 'the Journal lists the eight skills');
await page.click('[data-j="catch"]'); await shot('m14-catches');
check(await page.evaluate(() => document.querySelectorAll('.ccard canvas').length >= 15), 'the Journal draws every fish in the catch log');
const ms = Date.now() - t0;
await browser.close();

console.log('screenshots in', out, '(' + (ms / 1000).toFixed(1) + ' s)');
if (errors.length || fails.length){
  if (fails.length) console.log('Did not work:\n' + fails.map(e => '  ' + e).join('\n'));
  if (errors.length) console.log('Errors:\n' + [...new Set(errors)].map(e => '  ' + e).join('\n'));
  process.exit(1);
}
console.log('all good');
