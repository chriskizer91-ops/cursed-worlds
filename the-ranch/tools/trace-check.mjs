// Draws map/trace.js over the ranch map, to check by eye that it sits on the painting, and checks that the cattle can
// walk from the hay ring to everywhere they need to go.
//   node the-ranch/tools/trace-check.mjs [--out dir]
// Writes trace-check.png (the whole map) and trace-check-farmyard.png (the bottom, closer). Ends with "trace ok".
// Colours: yellow trail, green grass, dark green tree, blue water, red yard, grey outside the pasture; white circles are
// the painted trees, cyan boxes the buildings, orange lines the fences, magenta dots the places.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url)), top = path.join(here, '..');
const oi = process.argv.indexOf('--out'), out = oi >= 0 ? path.resolve(process.argv[oi + 1]) : path.join(top, 'shots');
fs.mkdirSync(out, {recursive: true});
const ctx = {window: {}}; vm.runInNewContext(fs.readFileSync(path.join(top, 'map', 'trace.js'), 'utf8'), ctx);
const T = ctx.window.RANCH_TRACE;

const C = {t: [235, 200, 40], g: [90, 200, 70], T: [20, 90, 40], w: [40, 120, 230], x: [220, 50, 50], o: [70, 70, 70]};
const buf = Buffer.alloc(T.w * T.h * 3);
for (let i = 0; i < T.w * T.h; i++) buf.set(C[T.grid[i]], i * 3);
const ppm = path.join(out, '_grid.ppm');
fs.writeFileSync(ppm, Buffer.concat([Buffer.from(`P6 ${T.w} ${T.h} 255\n`), buf]));
const draw = [];
for (const [x, y, r] of T.trees) draw.push(`circle ${x},${y} ${x + r},${y}`);
const dt = ['-fill', 'none', '-stroke', 'rgba(255,255,255,0.8)', '-strokewidth', '1', '-draw', draw.join(' ')];
const bd = T.buildings.map(([, x, y, w, d]) => `rectangle ${x - w / 2},${y - d / 2} ${x + w / 2},${y + d / 2}`).join(' ');
const fd = T.fences.map(f => 'polyline ' + f.pts.map(p => p.join(',')).join(' ')).join(' ');
const pd = Object.values(T.places).map(p => `circle ${p.x},${p.y} ${p.x + 5},${p.y}`).join(' ');
const labels = Object.values(T.places).map(p => `text ${p.x + 8},${p.y + 4} '${p.label}'`).join(' ');
const whole = path.join(out, 'trace-check.png');
execFileSync('convert', [path.join(top, 'map', 'ranch-map.webp'), '-resize', `${T.mapW}x${T.mapH}!`,
  '(', ppm, '-filter', 'point', '-resize', `${T.mapW}x${T.mapH}!`, '-alpha', 'set', '-channel', 'A', '-evaluate', 'set', '38%', '+channel', ')', '-composite',
  ...dt, '-stroke', 'cyan', '-strokewidth', '2', '-draw', bd, '-stroke', 'orange', '-strokewidth', '2', '-draw', fd,
  '-stroke', 'none', '-fill', 'magenta', '-draw', pd, '-fill', 'white', '-pointsize', '14', '-draw', labels, whole]);
execFileSync('convert', [whole, '-crop', '560x420+0+1080', '+repage', '-resize', '200%', path.join(out, 'trace-check-farmyard.png')]);
fs.unlinkSync(ppm);

// can the cattle get from the hay ring to the troughs, the salt and most of the pasture?
const open = c => c === 't' || c === 'g';
const start = (T.places.hay.y >> 2) * T.w + (T.places.hay.x >> 2), seen = new Uint8Array(T.w * T.h), q = [start]; seen[start] = 1;
for (let h = 0; h < q.length; h++) { const i = q[h], x = i % T.w, y = (i / T.w) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, j = ny * T.w + nx; if (nx >= 0 && ny >= 0 && nx < T.w && ny < T.h && !seen[j] && open(T.grid[j])) { seen[j] = 1; q.push(j); } } }
const problems = [], cellOf = p => (p.y >> 2) * T.w + (p.x >> 2);
if (!open(T.grid[start])) problems.push('the hay ring is not on open ground');
for (const k of ['troughs', 'salt']) if (!seen[cellOf(T.places[k])]) problems.push(`the ${T.places[k].label.toLowerCase()} can't be reached from the hay ring`);
const openN = [...T.grid].filter(open).length, reach = q.length;
console.log(`${reach} of ${openN} open cells reachable from the hay ring (${Math.round(reach / openN * 100)}%)`);
// the rest is grass shut in by woods, and the yards by the pond and the barn, which the cattle don't use
if (reach / openN < 0.6) problems.push('less than 60% of the open ground can be reached from the hay ring');
console.log(`pictures in ${path.relative(process.cwd(), out)}`);
if (problems.length) { console.log('problems:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('trace ok');
