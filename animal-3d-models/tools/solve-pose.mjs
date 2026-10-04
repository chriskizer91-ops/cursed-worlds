// Finds the joint angles that put full-detail Henry's joints where a held pose wants them (lying down: knees and
// fetlocks on the ground, hooves planted), by turning each joint a little each way in turn and keeping whatever helps,
// with smaller and smaller turns. It prints the angles to copy into the pose in zebu-cattle/zebu-moves.js.
//   node animal-3d-models/tools/solve-pose.mjs animal-3d-models/tools/poses/lie.json
// A job (tools/poses/*.json) names the pose, the channels it may turn ("chans"), where they start ("start"), and where
// joints should end up ("targets": bone names, or "mouth"), in metres, with Henry standing at the middle facing +z.
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const top = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const jobFile = process.argv[2]; if (!jobFile) { console.log('usage: node solve-pose.mjs <job.json>'); process.exit(1); }
const job = JSON.parse(fs.readFileSync(jobFile, 'utf8'));
const html = path.join(os.tmpdir(), 'solve-pose.html');
fs.writeFileSync(html, '<body>' + ['vendor/three.r128.min.js', 'zebu-cattle/zebu.js', 'zebu-cattle/zebu-moves.js', 'zebu-cattle/zebu-hd.js'].map(f => `<script src="${pathToFileURL(path.join(top, f)).href}"></script>`).join(''));
const browser = await pw.chromium.launch({args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
const page = await browser.newPage(); page.on('pageerror', e => console.log('error:', String(e)));
await page.goto(pathToFileURL(html).href);
await page.waitForFunction(() => window.makeZebuHD);
const res = await page.evaluate(job => {
  const z = makeZebuHD('henry', {detail: 0.3}), v = new THREE.Vector3(), B = {};
  for (const b of z.skeleton.bones) B[b.name] = b;
  const cur = Object.assign({}, job.start); for (const k of job.chans) if (cur[k] == null) cur[k] = 0;
  const where = n => (n === 'mouth' ? z.anchor('mouth', v) : B[n].getWorldPosition(v));
  // how far the joints are from where they should be, plus a little for every turn, so it never turns more than it needs
  const err = () => {
    z.setPose(job.pose, cur); z.pose(job.pose); z.animate(0.0001, 0, 0); z.root.updateMatrixWorld(true);
    let e = 0; for (const [n, t] of Object.entries(job.targets)) e += where(n).distanceToSquared(new THREE.Vector3(...t));
    for (const k of job.chans) e += 0.0004 * (cur[k] || 0) ** 2; return e;
  };
  let best = err(); const first = best;
  for (let step = 0.4; step > 0.002; step *= 0.6) for (let it = 0; it < 12; it++) {
    let moved = false;
    for (const k of job.chans) for (const d of [step, -step]) { const old = cur[k] || 0; cur[k] = old + d; const e = err(); if (e < best - 1e-9) { best = e; moved = true; } else cur[k] = old; }
    if (!moved) break;
  }
  err();
  const pos = {}; for (const n of Object.keys(job.targets)) pos[n] = where(n).toArray().map(x => +x.toFixed(3));
  const angles = {}; for (const k of Object.keys(cur)) angles[k] = +(+cur[k]).toFixed(2);
  return {angles, before: +first.toFixed(5), after: +best.toFixed(5), joints: pos};
}, job);
console.log(`${job.pose}: off by ${res.before} before, ${res.after} after (squared metres, all joints together)`);
console.log('angles:', JSON.stringify(res.angles));
console.log('joints:', JSON.stringify(res.joints));
await browser.close();
