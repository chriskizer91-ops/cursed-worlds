// Photographs an animal from the front, both sides, the back and the three-quarter views, in each pose, so it can be laid
// next to its character sheet. Headless Chromium through Playwright, the same way Stranded's checks run.
//   node animal-3d-models/tools/turnaround.mjs [--look henry] [--out dir] [--poses stand,eat,lie] [--views front,left,...]
// Writes one PNG per pose and view, and sheet-<pose>.png with them side by side. Ends with "all good" if nothing failed.
import path from 'node:path';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';

const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const here = path.dirname(fileURLToPath(import.meta.url)), top = path.join(here, '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i >= 0 ? process.argv[i + 1] : d; };
const look = arg('look', 'henry'), out = path.resolve(arg('out', path.join(top, 'shots', look)));
const poses = arg('poses', 'stand').split(','), views = arg('views', 'front,frontleft,left,backleft,back,right,frontright').split(',');
fs.mkdirSync(out, {recursive: true});

// the camera goes round the animal: the angle is measured from straight in front of it, towards its left side
const VIEW = {front: 0, frontleft: 40, left: 90, backleft: 140, back: 180, backright: 220, right: 270, frontright: 320, top: 'top'};
const page0 = path.join(out, '_turnaround.html');
fs.writeFileSync(page0, `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#e8e6df}</style><body>
<script src="${pathToFileURL(path.join(top, 'vendor', 'three.r128.min.js')).href}"></script>
<script src="${pathToFileURL(path.join(top, 'zebu-cattle', 'zebu.js')).href}"></script>
<script>
const W = 640, H = 520, r = new THREE.WebGLRenderer({antialias: true, preserveDrawingBuffer: true}); r.setSize(W, H); r.setClearColor(0xe8e6df); document.body.appendChild(r.domElement);
const scene = new THREE.Scene(); scene.add(new THREE.HemisphereLight(0xffffff, 0x9a8f80, 0.55));
const sun = new THREE.DirectionalLight(0xffffff, 0.75); sun.position.set(2, 4, 3); scene.add(sun);
const ground = new THREE.Mesh(new THREE.CircleGeometry(2.2, 48), new THREE.MeshLambertMaterial({color: 0xd6cdb9})); ground.rotation.x = -Math.PI / 2; scene.add(ground);
const z = makeZebu('${look}'); scene.add(z.root);
const cam = new THREE.PerspectiveCamera(24, W / H, 0.1, 50);
window.shot = (pose, deg) => {
  z.pose(pose); for (let i = 0; i < 3; i++) z.animate(0.016, 0, 0);
  if (deg === 'top') { cam.position.set(0, 7, 0.01); cam.lookAt(0, 0.6, 0); }
  else { const a = deg * Math.PI / 180, d = 6.2, e = 0.14; cam.position.set(Math.sin(a) * d * Math.cos(e), 0.75 + Math.sin(e) * d, Math.cos(a) * d * Math.cos(e)); cam.lookAt(0, 0.68, 0.1); }
  r.render(scene, cam); return z.tris;
};
window.READY = true;
</script>`);
const browser = await pw.chromium.launch({args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
const page = await browser.newPage({viewport: {width: 640, height: 520}});
const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(pathToFileURL(page0).href);
await page.waitForFunction(() => window.READY || null, null, {timeout: 20000}).catch(() => errors.push('the page never got ready'));
const made = [];
if (!errors.length) for (const p of poses) for (const v of views) {
  const tris = await page.evaluate(([p, d]) => window.shot(p, d), [p, VIEW[v]]);
  const f = path.join(out, `${p}-${v}.png`); await page.locator('canvas').screenshot({path: f}); made.push(f);
  if (p === poses[0] && v === views[0]) console.log(`${look}: ${Math.round(tris)} triangles`);
}
await browser.close(); fs.unlinkSync(page0);
if (errors.length) { console.log('problems:\n  ' + errors.join('\n  ')); process.exit(1); }
console.log(`${made.length} pictures in ${path.relative(process.cwd(), out)}`);
console.log('all good');
