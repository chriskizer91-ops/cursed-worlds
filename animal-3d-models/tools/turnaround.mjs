// Photographs an animal from the front, both sides, the back and the three-quarter views, in each pose, so it can be laid
// next to its character sheet. Headless Chromium through Playwright, the same way Stranded's checks run.
//   node animal-3d-models/tools/turnaround.mjs [--look henry] [--model game|hd|storybook] [--detail 1]
//        [--out dir] [--poses stand,eat,lie] [--views front,left,...] [--size 640x520] [--close]
// game: zebu.js (the ranch's cartoon cattle). hd: zebu-hd.js, full detail, with daylight, soft shadows and film-like
// colour. storybook: makeZebuStorybook in zebu.js, the What the Map Forgot look. --close frames the head.
// Writes one PNG per pose and view. Prints the triangle and draw counts; ends with "all good" if nothing failed.
import path from 'node:path';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';

const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const here = path.dirname(fileURLToPath(import.meta.url)), top = path.join(here, '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i >= 0 ? process.argv[i + 1] : d; };
const look = arg('look', 'henry'), model = arg('model', 'game'), detail = +arg('detail', 1), close = process.argv.includes('--close'), hstyle = arg('style', 'envoi');
const out = path.resolve(arg('out', path.join(top, 'shots', look + (model === 'game' ? '' : '-' + model + (model === 'hd' ? '-' + hstyle : '')))));
const poses = arg('poses', 'stand').split(','), views = arg('views', 'front,frontleft,left,backleft,back,right,frontright').split(',');
const [W, H] = arg('size', '640x520').split('x').map(Number);
fs.mkdirSync(out, {recursive: true});

// the camera goes round the animal: the angle is measured from straight in front of it, towards its left side
const VIEW = {front: 0, frontleft: 40, left: 90, backleft: 140, back: 180, backright: 220, right: 270, frontright: 320, top: 'top'};
const src = f => pathToFileURL(path.join(top, f)).href;
const scripts = ['vendor/three.r128.min.js', 'zebu-cattle/zebu.js'].concat(model === 'hd' ? ['zebu-cattle/zebu-moves.js', 'zebu-cattle/zebu-hd.js'] : []);
const make = model === 'hd' ? `makeZebuHD('${look}', {detail: ${detail}, style: '${hstyle}'})` : model === 'storybook' ? `makeZebuStorybook('${look}')` : `makeZebu('${look}')`;
const page0 = path.join(out, '_turnaround.html');
fs.writeFileSync(page0, `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#ddd}</style><body>
${scripts.map(s => `<script src="${src(s)}"></script>`).join('\n')}
<script>
const W = ${W}, H = ${H}, MODEL = '${model}' === 'hd' && '${hstyle}' === 'storybook' ? 'storybook' : '${model}';
const r = new THREE.WebGLRenderer({antialias: true, preserveDrawingBuffer: true}); r.setSize(W, H); document.body.appendChild(r.domElement);
const scene = new THREE.Scene();
if (MODEL === 'hd') {
  // daylight: a sky to reflect, the sun with soft shadows, film-like colour
  r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 0.85;
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.physicallyCorrectLights = false;
  const sky = new THREE.Scene(), sg = new THREE.SphereGeometry(10, 32, 16), cols = [], top = new THREE.Color(0x6f9fd8).convertSRGBToLinear(), hor = new THREE.Color(0xe8ecef).convertSRGBToLinear(), gr = new THREE.Color(0x6d6a52).convertSRGBToLinear();
  for (let i = 0; i < sg.attributes.position.count; i++) { const y = sg.attributes.position.getY(i) / 10, c = y > 0 ? hor.clone().lerp(top, Math.pow(y, 0.6)) : hor.clone().lerp(gr, Math.min(1, -y * 4)); cols.push(c.r, c.g, c.b); }
  sg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); sky.add(new THREE.Mesh(sg, new THREE.MeshBasicMaterial({vertexColors: true, side: THREE.BackSide})));
  const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 8), new THREE.MeshBasicMaterial({color: new THREE.Color(14, 13, 11)})); sunDisc.position.set(4, 6, 5); sky.add(sunDisc);
  const pm = new THREE.PMREMGenerator(r); scene.environment = pm.fromScene(sky, 0.02).texture;
  scene.background = new THREE.Color(0xc9d6df).convertSRGBToLinear();
  scene.add(new THREE.HemisphereLight(new THREE.Color(0xbcd4ff).convertSRGBToLinear(), new THREE.Color(0x5a5236).convertSRGBToLinear(), 0.25));
  const sun = new THREE.DirectionalLight(new THREE.Color(0xfff0dc).convertSRGBToLinear(), 2.3); sun.position.set(3, 5, 4); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = sun.shadow.camera.bottom = -2; sun.shadow.camera.right = sun.shadow.camera.top = 2; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; scene.add(sun);
  const rim = new THREE.DirectionalLight(new THREE.Color(0xc8dcff).convertSRGBToLinear(), 0.6); rim.position.set(-3, 2.5, -4); scene.add(rim);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(3, 64), new THREE.MeshStandardMaterial({color: new THREE.Color(0x8a8160).convertSRGBToLinear(), roughness: 1})); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
} else {
  scene.background = new THREE.Color(MODEL === 'storybook' ? 0xd9d2bf : 0xe8e6df);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9a8f80, MODEL === 'storybook' ? 0.75 : 0.55));
  const sun = new THREE.DirectionalLight(MODEL === 'storybook' ? 0xfff4e0 : 0xffffff, MODEL === 'storybook' ? 0.65 : 0.75); sun.position.set(2, 4, 3); scene.add(sun);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(2.2, 48), new THREE.MeshLambertMaterial({color: MODEL === 'storybook' ? 0xcfc4a6 : 0xd6cdb9})); ground.rotation.x = -Math.PI / 2; scene.add(ground);
}
const z = ${make}; scene.add(z.root);
z.root.traverse(o => { if (o.isMesh && MODEL === 'hd') { o.castShadow = o.castShadow !== false; } });
const cam = new THREE.PerspectiveCamera(${close ? 14 : 24}, W / H, 0.1, 50);
window.shot = (pose, deg) => {
  z.pose(pose); for (let i = 0; i < 3; i++) z.animate(0.016, 0, 0);
  const aim = ${close ? 'z.anchor("head")' : 'new THREE.Vector3(0, 0.7, 0.1)'};
  if (deg === 'top') { cam.position.set(0, 7, 0.01); cam.lookAt(0, 0.6, 0); }
  else { const a = deg * Math.PI / 180, d = ${close ? 3.4 : 6.2}, e = 0.14; cam.position.set(aim.x + Math.sin(a) * d * Math.cos(e), aim.y + 0.05 + Math.sin(e) * d, aim.z + Math.cos(a) * d * Math.cos(e)); cam.lookAt(aim); }
  r.render(scene, cam); return {tris: z.tris, calls: r.info.render.calls};
};
window.READY = true;
</script>`);
const browser = await pw.chromium.launch({args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
const page = await browser.newPage({viewport: {width: W, height: H}});
const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const t0 = Date.now();
await page.goto(pathToFileURL(page0).href);
await page.waitForFunction(() => window.READY || null, null, {timeout: 120000}).catch(() => errors.push('the page never got ready'));
const made = [];
if (!errors.length) for (const p of poses) for (const v of views) {
  const info = await page.evaluate(([p, d]) => window.shot(p, d), [p, VIEW[v]]);
  const f = path.join(out, `${p}-${v}${close ? '-close' : ''}.png`); await page.locator('canvas').screenshot({path: f}); made.push(f);
  if (made.length === 1) console.log(`${look} (${model}): ${Math.round(info.tris)} triangles, ${info.calls} draws, built and lit in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
await browser.close(); fs.unlinkSync(page0);
if (errors.length) { console.log('problems:\n  ' + errors.join('\n  ')); process.exit(1); }
console.log(`${made.length} pictures in ${path.relative(process.cwd(), out)}`);
console.log('all good');
