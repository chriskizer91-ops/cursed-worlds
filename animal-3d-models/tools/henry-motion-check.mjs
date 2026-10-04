// Henry in Motion's check. On a phone-sized screen it builds both Henrys (the cartoon and the realistic one) in the
// pasture and plays every move and every state, tries the pasture by day, at dusk and at night, then uses the page the
// way a person would: tapping its buttons, dragging round Henry, scrolling closer and patting him. It saves a contact
// sheet of what it saw for each Henry, and ends with "all good" when everything worked and the page threw no errors.
//   node animal-3d-models/tools/build-viewer.mjs --page henry-motion
//   node animal-3d-models/tools/henry-motion-check.mjs [--file animal-3d-models/Henry_In_Motion.html] [--out animal-3d-models/shots/motion]
import path from 'node:path';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const here = path.dirname(fileURLToPath(import.meta.url)), top = path.join(here, '..');
const opt = k => { const i = process.argv.indexOf('--' + k); return i >= 0 ? process.argv[i + 1] : null; };
const out = path.resolve(opt('out') || path.join(top, 'shots', 'motion')); fs.mkdirSync(out, {recursive: true});
const url = pathToFileURL(path.resolve(opt('file') || path.join(top, 'Henry_In_Motion.html'))).href;
const browser = await pw.chromium.launch({args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
const errors = [], fails = [];
const check = (ok, what) => { if (!ok) fails.push(what); console.log((ok ? '  ok   ' : '  FAIL ') + what); };
const watch = (page, tag) => { page.on('pageerror', e => errors.push(tag + ': ' + String(e.stack || e).slice(0, 600))); page.on('console', m => { if (m.type() === 'error') errors.push(tag + ': ' + m.text().slice(0, 600)); }); };

// a contact sheet: the pictures in a grid, each with its name under it
async function sheet(name, items) {
  const page = await browser.newPage();
  const data = items.map(i => ({label: i.label, src: 'data:image/png;base64,' + i.png.toString('base64')}));
  const png = await page.evaluate(async data => {
    const ims = await Promise.all(data.map(async d => { const im = new Image(); im.src = d.src; await im.decode(); return im; }));
    const s = 0.5, w = Math.round(ims[0].width * s), h = Math.round(ims[0].height * s), cols = Math.min(6, ims.length), rows = Math.ceil(ims.length / cols), lab = 26;
    const c = document.createElement('canvas'); c.width = cols * (w + 6) + 6; c.height = rows * (h + lab + 6) + 6;
    const g = c.getContext('2d'); g.fillStyle = '#f4efe2'; g.fillRect(0, 0, c.width, c.height); g.font = '600 16px system-ui, sans-serif'; g.textAlign = 'center';
    ims.forEach((im, i) => { const x = 6 + (i % cols) * (w + 6), y = 6 + Math.floor(i / cols) * (h + lab + 6); g.drawImage(im, x, y, w, h); g.fillStyle = '#1d1b2c'; g.fillText(data[i].label, x + w / 2, y + h + 19); });
    return c.toDataURL('image/png');
  }, data);
  fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(png.split(',')[1], 'base64'));
  await page.close();
}

// ---------- 1. every move and state in each look, stepped in time (the page's ?test mode) ----------
const SIZE = {width: 390, height: 844};
for (const look of ['cartoon', 'realistic']) {
  console.log(look + ':');
  const page = await browser.newPage({viewport: SIZE, deviceScaleFactor: 1}); watch(page, look);
  await page.goto(url + '?test' + (look === 'realistic' ? '&realistic' : ''));
  await page.waitForFunction(() => window.READY || window.ERR, null, {timeout: 180000});
  check(!(await page.evaluate(() => window.ERR)), `${look}: the page built Henry with no error`);
  const shots = [], snap = async label => shots.push({label, png: await page.screenshot()});
  const H = (fn, arg) => page.evaluate(fn, arg);
  // the realistic Henry is full detail; the cartoon is smooth and needs fewer
  const tris = await H(() => HM.henry.tris), need = look === 'realistic' ? 100000 : 50000;
  check(tris > need, `${look}: Henry has ${Math.round(tris).toLocaleString('en')} triangles (more than ${need.toLocaleString('en')})`);
  await H(() => HM.step(1));
  const cost = await H(() => HM.frame()); console.log(`  one frame: ${cost.calls} draws, ${Math.round(cost.tris / 1000)}k triangles`);
  check(cost.calls < 160, `${look}: a frame takes fewer than 160 draws`);
  await snap('standing');
  // the moves, each from standing still, caught in the middle; each must finish, and make its sounds and dust
  const moves = await H(() => HM.henry.MOVES);
  for (const m of moves) {
    await H(() => { if (HM.henry.state !== 'stand') HM.go('stand'); for (let i = 0; i < 40 && (HM.henry.state !== 'stand' || HM.henry.busy); i++) HM.step(0.25); HM.log.length = 0; });
    const dur = await H(m => ZEBU_MOVES[m].dur, m), want = await H(m => [...new Set((ZEBU_MOVES[m].ev || []).map(e => e[1]))], m);
    await H(m => { HM.go(m); HM.step(0.1); }, m);
    check(await H(m => HM.henry.moves.playing.includes(m), m), `${look}: ${m} starts`);
    await H(d => HM.step(d), dur * 0.45 - 0.1); await snap(m);
    await H(d => HM.step(d), dur * 0.55 + 0.6);
    const log = await H(() => HM.log.slice());
    check(!(await H(m => HM.henry.moves.playing.includes(m), m)), `${look}: ${m} finishes`);
    for (const e of want) check(log.includes(e), `${look}: ${m} makes its ${e}`);
  }
  // the states: grazing, lying down, asleep, and up again
  for (const [go, state, secs] of [['graze', 'graze', 3], ['stand', 'stand', 3], ['lie', 'lie', 6], ['sleep', 'sleep', 4], ['stand', 'stand', 6]]) {
    await H(go => HM.go(go), go); await H(s => HM.step(s), secs);
    check(await H(() => HM.henry.state) === state, `${look}: ${go} gets him to ${state}`);
    await snap(go === 'stand' ? 'up again' : state);
  }
  // walking and trotting round the trail, then looking at you and the close-up
  for (const g of ['walk', 'trot']) {
    const phi0 = await H(() => HM.H.phi); await H(g => HM.go(g), g); await H(() => HM.step(3));
    check(await H(() => HM.H.phi) - phi0 > 0.5, `${look}: ${g} takes him round the trail`);
    check((await H(() => HM.status())).includes(g === 'walk' ? 'walking' : 'trotting'), `${look}: the status says he is ${g === 'walk' ? 'walking' : 'trotting'}`);
    await snap(g); await H(g => { HM.go(g); HM.step(2); }, g);
  }
  await H(() => { HM.go('look'); HM.step(1.2); }); await snap('look at me');
  await H(() => { HM.go('face'); HM.step(2.5); }); check(await H(() => HM.view.face), `${look}: close up comes in to his face`); await snap('close up');
  await H(() => { HM.go('face'); HM.step(1); });
  // the pasture: drawn as the Colossus meadow draws its own, by day, at dusk and at night, with nothing left behind on a switch
  const st = await H(() => HM.place.meadow.stats);
  check(st.tufts > 8000 && st.trees > 600, `${look}: the pasture has its grass (${st.tufts} tufts) and its trees (${st.trees})`);
  check(await H(() => HM.time) === 'day', `${look}: it starts by day`);
  const mem0 = await H(() => HM.memory());
  for (const t of ['dusk', 'night', 'day']) {
    await H(t => HM.setTime(t), t); await page.waitForFunction(t => HM.ready && HM.time === t, t, {timeout: 120000}); await H(() => HM.step(1));
    check(await H(() => HM.place.time) === t, `${look}: ${t} comes`);
    if (t !== 'day') await snap(t);
  }
  const mem1 = await H(() => HM.memory());
  check(mem1.textures <= mem0.textures && mem1.geometries <= mem0.geometries, `${look}: day to dusk to night and back leaves nothing behind (${mem0.textures} pictures before, ${mem1.textures} after)`);
  await sheet(`${look}-moves`, shots);
  await page.close();
}

// ---------- 2. the page as a person uses it: running by itself, with taps, drags and the wheel ----------
{
  console.log('by hand:');
  // drawn at one pixel to the point, as headless drawing is slow; Henry's time only moves as fast as it draws, so the waits are long
  const page = await browser.newPage({viewport: SIZE, deviceScaleFactor: 1, isMobile: true, hasTouch: true}); watch(page, 'by hand');
  await page.goto(url);
  await page.waitForFunction(() => window.READY || window.ERR, null, {timeout: 180000});
  const shots = [], snap = async label => shots.push({label, png: await page.screenshot({scale: 'css'})});
  const status = () => page.evaluate(() => document.getElementById('status').textContent);
  const until = async (fn, ms = 90000, arg) => { for (let t = 0; t < ms; t += 200) { if (await page.evaluate(fn, arg)) return true; await page.waitForTimeout(200); } return false; };
  check(await until(() => HM.ready && HM.look === 'cartoon' && HM.time === 'day'), 'the page starts with the cartoon Henry, by day');
  // every button's name fits it, and the top row fits across the screen
  const cut = await page.evaluate(() => [...document.querySelectorAll('#moves button, #top button')].filter(b => b.scrollWidth > b.clientWidth + 1).map(b => b.textContent));
  check(!cut.length, 'every button shows its whole name' + (cut.length ? ' (cut short: ' + cut.join(', ') + ')' : ''));
  check(await page.evaluate(() => [...document.querySelectorAll('#top button')].every(b => { const r = b.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; })), 'the buttons at the top fit across the screen');
  await page.getByRole('button', {name: 'Moo'}).tap();
  check(await until(() => document.getElementById('status').textContent.includes('mooing')), 'tapping Moo makes him moo');
  await page.waitForTimeout(700); await snap('moo');
  await until(() => !HM.henry.busy && !HM.henry.moves.playing.length);
  await page.getByRole('button', {name: 'Walk'}).tap();
  check(await until(() => document.getElementById('status').textContent.includes('walking')), 'tapping Walk walks him round');
  await snap('walking');
  await page.getByRole('button', {name: 'Walk'}).tap();
  check(await until(() => document.getElementById('status').textContent.includes('standing')), 'tapping Walk again stops him');
  // drag to walk round him, the wheel (a pinch on a phone) to come closer
  const box = await page.locator('#view').boundingBox(), off0 = await page.evaluate(() => HM.view.off);
  await page.mouse.move(box.width * 0.75, box.height * 0.45); await page.mouse.down(); await page.mouse.move(box.width * 0.25, box.height * 0.45, {steps: 8}); await page.mouse.up();
  check(Math.abs(await page.evaluate(() => HM.view.off) - off0) > 0.5, 'dragging walks the camera round him');
  const z0 = await page.evaluate(() => HM.view.zoom); await page.mouse.move(box.width / 2, box.height / 2); await page.mouse.wheel(0, -400); await page.waitForTimeout(300);
  check(await page.evaluate(() => HM.view.zoom) < z0, 'scrolling comes closer');
  await page.waitForTimeout(1200); await snap('turned and closer');
  // patting his head: he looks at you
  const head = await page.evaluate(() => { const v = HM.henry.anchor('head', new THREE.Vector3()).project(HM.camera), r = document.getElementById('view').getBoundingClientRect(); return {x: (v.x + 1) / 2 * r.width, y: (1 - v.y) / 2 * r.height}; });
  await page.touchscreen.tap(head.x, head.y);
  check(await until(() => HM.view.lookAtMe > 0, 10000), 'patting his head makes him look at you');
  await page.waitForTimeout(500); await snap('patted');
  // the time of day, then the realistic Henry
  check((await page.locator('#timeBtn').textContent()) === 'Day', 'the time button says Day');
  await page.locator('#timeBtn').tap();
  check(await until(() => HM.ready && HM.time === 'dusk', 120000), 'tapping Day brings dusk');
  check((await page.locator('#timeBtn').textContent()) === 'Dusk', 'the time button then says Dusk');
  await page.waitForTimeout(1500); await snap('dusk');
  await page.getByRole('button', {name: 'Realistic'}).tap();
  check(await until(() => HM.ready && HM.look === 'realistic', 120000), 'tapping Realistic shows the realistic Henry');
  check(await page.evaluate(() => HM.time) === 'dusk', 'he stays at dusk');
  await page.waitForTimeout(1500); await snap('realistic');
  await page.getByRole('button', {name: 'Lie down'}).tap();
  check(await until(() => HM.henry.state === 'lie', 240000), 'tapping Lie down lays him down');
  await page.waitForTimeout(800); await snap('lying');
  await page.getByRole('button', {name: 'Cartoon'}).tap();
  check(await until(() => HM.ready && HM.look === 'cartoon', 120000), 'tapping Cartoon goes back');
  console.log('  status at the end: ' + await status());
  await sheet('by-hand', shots);
  await page.close();
}

await browser.close();
if (errors.length) console.log('errors:\n  ' + errors.join('\n  '));
if (fails.length) console.log('failed:\n  ' + fails.join('\n  '));
console.log(`contact sheets in ${path.relative(process.cwd(), out)}`);
if (errors.length || fails.length) process.exit(1);
console.log('all good');
