// Draws a place's trace over its painting, to check it by eye:
//   node tools/trace-check.mjs camp [--out folder]
// walk.png: the walk grid (red: woods and trees, orange: rock, blue: tallgrass, yellow: trail, purple: the fire ring),
// with the exits and sites. depth.png: what stands up out of the ground, colored by where it meets the ground, with
// the outline and ground line of each thing.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const here = path.dirname(fileURLToPath(import.meta.url)), top = path.join(here, '..');
const args = process.argv.slice(2), place = args[0] || 'camp', oi = args.indexOf('--out');
const out = oi >= 0 ? args[oi + 1] : path.join(top, 'shots');
fs.mkdirSync(out, {recursive: true});

const traceSrc = fs.readFileSync(path.join(top, 'living', 'trace.js'), 'utf8');
const placeSrc = fs.readFileSync(path.join(top, 'living', 'traces', place + '.js'), 'utf8');
const T0 = (() => { const w = {}; new Function('window', placeSrc)(w); return w.TRACES[place]; })();
const img = fs.readFileSync(path.join(top, 'art', 'places', T0.painting + '.webp')).toString('base64');

const browser = await pw.chromium.launch();
const page = await browser.newPage();
const res = await page.evaluate(async ([traceSrc, placeSrc, place, img]) => {
  new Function(traceSrc)(); new Function(placeSrc)();
  const T = window.TRACES[place], B = Trace.build(T), Dp = Trace.depth(T);
  const im = new Image(); im.src = 'data:image/webp;base64,' + img; await im.decode();
  const W = T.size[0], H = T.size[1], sx = W / 48, sy = H / 32;
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.drawImage(im, 0, 0); return [c, g]; };
  const [c1, g1] = mk(), COL = {F: 'rgba(230,40,40,.42)', L: 'rgba(255,150,0,.5)', G: 'rgba(60,120,255,.32)', t: 'rgba(255,230,0,.35)', r: 'rgba(170,60,255,.6)'};
  for (let y = 0; y < 32; y++) for (let x = 0; x < 48; x++) { const c = B.M[y][x]; if (COL[c]) { g1.fillStyle = COL[c]; g1.fillRect(x * sx, y * sy, sx, sy); } }
  g1.strokeStyle = 'rgba(255,255,255,.18)'; for (let x = 0; x <= 48; x++) { g1.beginPath(); g1.moveTo(x * sx, 0); g1.lineTo(x * sx, H); g1.stroke(); } for (let y = 0; y <= 32; y++) { g1.beginPath(); g1.moveTo(0, y * sy); g1.lineTo(W, y * sy); g1.stroke(); }
  g1.font = 'bold 16px sans-serif';
  for (const e of B.exits) { g1.fillStyle = '#0ff'; g1.fillRect(e.x * sx, e.y * sy, sx, sy); g1.fillStyle = '#000'; g1.fillText(e.to, e.x * sx + 2, e.y * sy + 20); }
  for (const k in B.spots) for (const t of B.spots[k]) { g1.strokeStyle = '#fff'; g1.lineWidth = 3; g1.strokeRect(t[0] * sx + 2, t[1] * sy + 2, sx - 4, sy - 4); g1.fillStyle = '#fff'; g1.fillText(k, t[0] * sx, t[1] * sy - 3); }
  const [c2, g2] = mk(), id = g2.getImageData(0, 0, W, H), a = id.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const v = Dp.D[((y / Dp.scale) | 0) * Dp.W + ((x / Dp.scale) | 0)]; if (!v) continue; const k = (y * W + x) * 4, h = (v * 4) / H;
    const r = 255 * Math.max(0, Math.min(1, Math.abs(h * 6 - 3) - 1)), gg = 255 * Math.max(0, Math.min(1, 2 - Math.abs(h * 6 - 2))), b = 255 * Math.max(0, Math.min(1, 2 - Math.abs(h * 6 - 4)));
    a[k] = a[k] * .45 + r * .55; a[k + 1] = a[k + 1] * .45 + gg * .55; a[k + 2] = a[k + 2] * .45 + b * .55; }
  g2.putImageData(id, 0, 0);
  g2.lineWidth = 2;
  for (const s of T.stand) { g2.strokeStyle = s.kind === 'rock' ? '#fa0' : s.kind === 'tree' ? '#f0f' : '#fff'; g2.beginPath(); s.pts.forEach((p, i) => i ? g2.lineTo(p[0], p[1]) : g2.moveTo(p[0], p[1])); g2.closePath(); g2.stroke();
    if (s.base !== 'col') { g2.strokeStyle = '#0f0'; g2.lineWidth = 4; g2.beginPath(); const xs = s.pts.map(p => p[0]); g2.moveTo(Math.min(...xs), s.base); g2.lineTo(Math.max(...xs), s.base); g2.stroke(); g2.lineWidth = 2; }
    g2.fillStyle = '#fff'; g2.font = 'bold 15px sans-serif'; g2.fillText(s.id, s.pts[0][0] + 4, s.pts[0][1] + 18); }
  for (const t of T.trails) { g2.strokeStyle = 'rgba(255,255,0,.8)'; g2.beginPath(); t.slice(1).forEach((p, i) => i ? g2.lineTo(p[0], p[1]) : g2.moveTo(p[0], p[1])); g2.stroke(); }
  return {walk: c1.toDataURL('image/png').split(',')[1], depth: c2.toDataURL('image/png').split(',')[1], rows: B.M.map(r => r.join(''))};
}, [traceSrc, placeSrc, place, img]);
fs.writeFileSync(path.join(out, place + '-walk.png'), Buffer.from(res.walk, 'base64'));
fs.writeFileSync(path.join(out, place + '-depth.png'), Buffer.from(res.depth, 'base64'));
console.log(res.rows.map((r, i) => String(i).padStart(2) + ' ' + r).join('\n'));
await browser.close();
