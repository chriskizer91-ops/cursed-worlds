// Checks every painted place the way the game will use it: each of the game's spots in the place is there and can be
// walked up to from the middle, and each way out leads where the game says it does and can be walked to.
//   node tools/places-check.mjs [--file some.html]
// Ends with "all good".
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';

const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), fi = args.indexOf('--file');
const url = pathToFileURL(fi >= 0 ? path.resolve(args[fi + 1]) : path.join(here, '..', 'index.html')).href;

const browser = await pw.chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e.stack || e)));
await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
await page.goto(url);
await page.waitForSelector('#newgame');
const res = await page.evaluate(() => {
  const out = [], rows = [], P = World.places, OPEN = 'gGtfsmH';
  for (const k in P) {
    if (!(window.TRACES && window.TRACES[k])) { rows.push(k + ': no trace yet (the game draws it itself)'); continue; }
    const M = World.map(k), W = 48, H = 32, open = (x, y, hid) => x >= 0 && y >= 0 && x < W && y < H && OPEN.indexOf(M.M[y][x]) >= 0 && (hid || M.M[y][x] !== 'H');
    const reach = hid => { const R = new Uint8Array(W * H), Q = [M.hub]; if (!open(M.hub[0], M.hub[1], hid)) return R; R[M.hub[1] * W + M.hub[0]] = 1; while (Q.length) { const [x, y] = Q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (open(nx, ny, hid) && !R[ny * W + nx]) { R[ny * W + nx] = 1; Q.push([nx, ny]); } } } return R; };
    const R0 = reach(false), R1 = reach(true);
    if (!open(M.hub[0], M.hub[1])) out.push(k + ': the middle of the place is not open ground');
    let n = 0;
    for (const id in P[k].spots) {
      const S = M.spots[id]; n++;
      if (!S || !S.tiles.length) { out.push(k + ': spot "' + id + '" is not in the trace'); continue; }
      const ok = S.tiles.some(([x, y]) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < W && ny < H && R0[ny * W + nx]; }));
      if (!ok) out.push(k + ': spot "' + id + '" cannot be walked up to');
    }
    const want = P[k].exits.map(e => e[0]).sort().join(','), got = M.exits.map(e => e.to).sort().join(',');
    if (want !== got) out.push(k + ': ways out are ' + got + ', the game expects ' + want);
    for (const e of M.exits) if (!(e.hidden ? R1 : R0)[e.y * W + e.x]) out.push(k + ': the way to ' + e.to + ' cannot be walked to');
    for (const e of P[k].exits) if (e[3] === 'hidden' && !M.exits.some(x => x.to === e[0] && x.hidden)) out.push(k + ': the way to ' + e[0] + ' should be hidden until found');
    let walk = 0; for (let i = 0; i < W * H; i++) if (R0[i]) walk++;
    rows.push(k + ': ' + n + ' spots, ' + M.exits.length + ' ways out, ' + walk + ' squares you can walk');
  }
  return {out, rows};
});
await browser.close();
console.log(res.rows.join('\n'));
if (res.out.length || errors.length) { console.log('Problems:\n' + res.out.concat(errors).map(p => '  ' + p).join('\n')); process.exit(1); }
console.log('all good');
