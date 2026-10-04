// Traces the ranch map (map/ranch-map.webp) into map/trace.js: where the cattle can walk, where the trails are, where each
// painted tree stands, and the places of the day's work. Read the painting's colours for the ground and the trees; the
// places, buildings, fences and the edge of the pasture are written below by hand, in map pixels of the 1024 x 1536 map
// (x across from the left, y down from the top), measured off reference/ranch-from-the-sky.png.
//   node the-ranch/tools/make-trace.mjs        then check it with   node the-ranch/tools/trace-check.mjs
//
// Walking Paths (Chris's map editing tool, building-with-assets- editing-tools/walking-paths) can change it:
//   node the-ranch/tools/make-trace.mjs --export   writes map/ranch-walking-paths.json from what is written below
// Open that file in Walking Paths, move the green walk area, the red blocks and the places (the "look" spots), save the
// maps file over map/ranch-walking-paths.json, and run make-trace.mjs again. While that file is there it decides where
// the cattle can walk and where the places are; the painting still decides the trails and the trees.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url)), top = path.join(here, '..');
const MW = 1024, MH = 1536, CELL = 4, GW = MW / CELL, GH = MH / CELL;

// ---------- by hand ----------
// the pasture: the wire fence on the west, the tree line along the railroad on the east, the road fence on the south
const RAIL = [[395, 0], [760, 768], [1010, 1408], [1024, 1440]];
const railX = y => { for (let i = 0; i < RAIL.length - 1; i++) { const [x0, y0] = RAIL[i], [x1, y1] = RAIL[i + 1]; if (y <= y1) return x0 + (x1 - x0) * (y - y0) / (y1 - y0); } return 1024; };
const PASTURE = [[207, 172], [262, 112], [322, 52], [362, 20], [380, 20]];
for (let y = 40; y <= 1416; y += 24) PASTURE.push([Math.round(railX(y) - 22), y]);
PASTURE.push([20, 1416], [18, 1160], [60, 1128], [105, 1098], [150, 1060], [180, 1010], [200, 950], [207, 880]);
// buildings: [name, x, y, width, depth, height in metres, roof colour]; x, y is the middle of the roof on the map
const BUILDINGS = [
  ['House', 93, 1290, 56, 54, 6.5, 0x3d4a66, 'house'],
  ['Shed', 163, 1200, 50, 22, 4, 0x8e979e, 'shed'],
  ['Shed', 183, 1226, 18, 22, 3, 0x9aa3aa, 'shed'],
  ['Chicken coop', 107, 1240, 18, 16, 2.8, 0x9aa3aa, 'coop'],
  ['Feed shed', 190, 1298, 24, 26, 3.5, 0xa9b0b6, 'shed'],
  ['Tack shed', 255, 1295, 30, 28, 3.8, 0x8e979e, 'shed'],
  ['Hay barn', 300, 1294, 36, 34, 4.5, 0xc7a35c, 'haybarn'],
  ['House', 545, 1162, 66, 40, 6, 0x8e979e, 'house'],
  ['Workshop', 530, 1268, 34, 30, 4, 0x8e979e, 'shed'],
  ['Barn', 853, 1332, 64, 58, 7.5, 0x8e979e, 'barn'],
  ['Shed', 885, 1268, 28, 26, 3.5, 0x8e979e, 'shed']
];
// fenced yards and the garden the cattle stay out of: [x0, y0, x1, y1]
const YARDS = [[40, 1236, 145, 1416], [128, 1136, 198, 1252], [496, 1128, 612, 1214], [505, 1240, 560, 1300], [814, 1290, 900, 1376], [862, 1246, 906, 1290]];
const POND = {x: 715, y: 1352, rx: 52, ry: 60};
// the places of the day, in the order Chris works
const PLACES = {
  hay: {x: 236, y: 1222, label: 'Hay ring'},
  troughs: {x: 104, y: 1214, label: 'Water troughs'},   // up by the house in the bottom-left corner (Chris)
  coop: {x: 110, y: 1262, label: 'Chicken coop'},       // by that house too
  pens: {x: 245, y: 1272, label: 'Bull pens'},
  salt: {x: 330, y: 1150, label: 'Salt'},
  fence: {x: 214, y: 520, label: 'Fence line'},
  pond: {x: 715, y: 1290, label: 'Pond'},
  barn: {x: 853, y: 1290, label: 'Barn'},
  house: {x: 93, y: 1240, label: 'House'}
};
// fences: lists of points; posts go every few metres along them
const FENCES = [
  {kind: 'wire', pts: [[207, 172], [207, 880], [200, 950], [180, 1010], [150, 1060], [105, 1098], [60, 1128], [18, 1160]]},
  {kind: 'wire', pts: [[207, 172], [262, 112], [322, 52], [362, 18]]},
  {kind: 'rail', pts: [[0, 1427], [1010, 1427]]},
  {kind: 'rail', pts: [[0, 1490], [1024, 1490]]},
  {kind: 'pen', pts: [[200, 1263], [292, 1263], [292, 1322]]}
];

// ---------- from the painting ----------
// ---------- or from Walking Paths ----------
const WPF = path.join(top, 'map', 'ranch-walking-paths.json'), EXPORT = process.argv.includes('--export');
const circle = (x, y, rx, ry, n) => Array.from({length: n || 12}, (_, i) => [Math.round(x + Math.cos(i / (n || 12) * Math.PI * 2) * rx), Math.round(y + Math.sin(i / (n || 12) * Math.PI * 2) * (ry || rx))]);
const rect = ([a, b, e, f]) => [[a, b], [e, b], [e, f], [a, f]];
const BLOCKS = [...YARDS.map(rect), ...BUILDINGS.map(([, x, y, w, d]) => rect([x - w / 2 - 3, y + d * 0.18 - d / 2 - 3, x + w / 2 + 3, y + d * 0.18 + d / 2 + 3])), circle(POND.x, POND.y, POND.rx, POND.ry, 16)];
let WALK = [PASTURE], WPBLOCK = null;
if (!EXPORT && fs.existsSync(WPF)) {
  const wp = JSON.parse(fs.readFileSync(WPF, 'utf8')), m = wp.maps ? Object.values(wp.maps)[0] : Object.values(wp)[0];
  if (m.size && (m.size[0] !== MW || m.size[1] !== MH)) throw new Error(`ranch-walking-paths.json is for a ${m.size.join(' x ')} map; the ranch map is ${MW} x ${MH}`);
  WALK = m.walk; WPBLOCK = m.block;
  for (const sp of m.spots || []) { const k = sp.id || Object.keys(PLACES).find(k => PLACES[k].label === sp.label); if (k && PLACES[k] && sp.at) { PLACES[k].x = sp.at[0]; PLACES[k].y = sp.at[1]; } }
  console.log(`using Walking Paths: ${WALK.length} walk area(s), ${WPBLOCK.length} block(s), ${(m.spots || []).length} place(s)`);
}

const raw = execFileSync('convert', [path.join(top, 'map', 'ranch-map.webp'), '-resize', `${MW}x${MH}!`, 'rgb:-'], {maxBuffer: 64e6});
const px = (x, y) => { const i = (y * MW + x) * 3; return [raw[i], raw[i + 1], raw[i + 2]]; };
const dirt = ([r, g, b]) => r > 150 && r > g + 18 && b < 135;
const dark = ([r, g, b]) => r < 82 && g < 112 && g > r;
const inPoly = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
const G = new Array(GW * GH), treeMask = new Uint8Array(GW * GH);
// with a Walking Paths file, a painted tree only blocks the way where the file still has a block over it
for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
  let d = 0, k = 0;
  for (let sy = 0; sy < CELL; sy++) for (let sx = 0; sx < CELL; sx++) { const p = px(gx * CELL + sx, gy * CELL + sy); if (dirt(p)) d++; else if (dark(p)) k++; }
  const cx = gx * CELL + 2, cy = gy * CELL + 2, i = gy * GW + gx;
  treeMask[i] = k >= 9 ? 1 : 0;
  let c = k >= 9 ? 'T' : d >= 5 ? 't' : 'g';
  if (!WALK.some(P => inPoly(cx, cy, P))) c = 'o';
  else if (WPBLOCK) { if (WPBLOCK.some(P => inPoly(cx, cy, P))) c = c === 'T' ? 'T' : ((cx - POND.x) / POND.rx) ** 2 + ((cy - POND.y) / POND.ry) ** 2 < 1 ? 'w' : 'x'; else if (c === 'T') c = d >= 5 ? 't' : 'g'; }
  else if (YARDS.some(([a, b, e, f]) => cx >= a && cx <= e && cy >= b && cy <= f)) c = 'x';
  else if (BUILDINGS.some(([, x, y, w, d]) => Math.abs(cx - x) <= w / 2 + 3 && Math.abs(cy - (y + d * 0.18)) <= d / 2 + 3)) c = 'x';
  else if (((cx - POND.x) / POND.rx) ** 2 + ((cy - POND.y) / POND.ry) ** 2 < 1) c = 'w';
  G[i] = c;
}
// open the cells under the places the cattle have to reach, so a painted tree can't shut them off
for (const k of ['hay', 'troughs', 'salt']) { const p = PLACES[k]; for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const gx = (p.x >> 2) + dx, gy = (p.y >> 2) + dy; if (G[gy * GW + gx] === 'T') G[gy * GW + gx] = 'g'; } }

// ---------- the painted trees ----------
// each crown's middle is where the dark green is deepest; a tree goes there, as wide as the crown
const dist = new Float32Array(GW * GH);
for (let i = 0; i < dist.length; i++) dist[i] = treeMask[i] ? 1e9 : 0;
const pass = (x0, x1, dx, y0, y1, dy) => { for (let y = y0; y !== y1; y += dy) for (let x = x0; x !== x1; x += dx) { const i = y * GW + x; if (!dist[i]) continue; let m = dist[i]; if (x - dx >= 0 && x - dx < GW) m = Math.min(m, dist[i - dx] + 1); if (y - dy >= 0 && y - dy < GH) m = Math.min(m, dist[i - dy * GW] + 1); if (x - dx >= 0 && x - dx < GW && y - dy >= 0 && y - dy < GH) m = Math.min(m, dist[i - dx - dy * GW] + 1.414); if (x + dx >= 0 && x + dx < GW && y - dy >= 0 && y - dy < GH) m = Math.min(m, dist[i + dx - dy * GW] + 1.414); dist[i] = m; } };
pass(0, GW, 1, 0, GH, 1); pass(GW - 1, -1, -1, GH - 1, -1, -1);
const cand = []; for (let i = 0; i < dist.length; i++) if (dist[i] >= 1.4) cand.push(i);
cand.sort((a, b) => dist[b] - dist[a]);
const trees = [];
for (const i of cand) {
  const x = (i % GW) * CELL + 2, y = Math.floor(i / GW) * CELL + 2, r = Math.min(22, dist[i] * CELL + 3);
  if (trees.some(t => (t[0] - x) ** 2 + (t[1] - y) ** 2 < ((t[2] + r) * 0.62) ** 2)) continue;
  trees.push([x, y, Math.round(r)]);
}

const out = {w: GW, h: GH, cell: CELL, mapW: MW, mapH: MH, grid: G.join(''), trees, places: PLACES, buildings: BUILDINGS, fences: FENCES, pond: POND, pasture: PASTURE, rail: RAIL};
fs.writeFileSync(path.join(top, 'map', 'trace.js'), '// The ranch map traced by tools/make-trace.mjs. Do not edit by hand: change the tool and run it again.\nwindow.RANCH_TRACE = ' + JSON.stringify(out) + ';\n');
if (EXPORT) {
  // the trees inside the pasture become blocks, so they can be moved or taken out in Walking Paths
  const treeBlocks = trees.filter(([x, y]) => inPoly(x, y, PASTURE)).map(([x, y, r]) => circle(x, y, Math.max(6, r * 0.8), null, 10));
  const pic = execFileSync('convert', [path.join(top, 'map', 'ranch-map.webp'), '-resize', `${MW}x${MH}!`, '-quality', '80', 'webp:-'], {maxBuffer: 64e6});
  const map = {name: 'The ranch', src: 'data:image/webp;base64,' + pic.toString('base64'), size: [MW, MH], walker: 8, start: [PLACES.hay.x, PLACES.hay.y + 10],
    walk: [PASTURE], block: [...BLOCKS, ...treeBlocks], front: [], exits: [], people: [],
    spots: Object.entries(PLACES).map(([id, p]) => ({kind: 'look', id, label: p.label, note: '', at: [p.x, p.y]}))};
  fs.writeFileSync(WPF, JSON.stringify({format: 'walking-paths', version: 1, about: 'The ranch map, from the-ranch/tools/make-trace.mjs --export', savedAt: new Date().toISOString(), maps: {ranch: map}}));
  console.log(`wrote ${path.relative(process.cwd(), WPF)}: ${map.block.length} blocks (${treeBlocks.length} of them trees), ${map.spots.length} places, ${(fs.statSync(WPF).size / 1024).toFixed(0)} KB`);
}
const n = c => G.filter(x => x === c).length;
console.log(`grid ${GW} x ${GH}: ${n('t')} trail, ${n('g')} grass, ${n('T')} tree, ${n('w')} water, ${n('x')} yard, ${n('o')} outside cells; ${trees.length} trees`);
