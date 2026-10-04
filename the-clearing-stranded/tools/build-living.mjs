// Builds a living page into one file that works offline: its scripts, its styles and its paintings inlined.
//   node tools/build-living.mjs [living/camp-alive.html] [--out living/Stranded_Living_Camp.html] [--artifact some/where.html]
// --artifact also writes the page without its outer document tags, for publishing as an artifact.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url)), top = path.join(here, '..');
const args = process.argv.slice(2), opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : null; };
const srcFile = path.resolve(args.find(a => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--')) || path.join(top, 'living', 'camp-alive.html'));
const out = path.resolve(opt('out') || path.join(top, 'living', 'Stranded_Living_Camp.html'));
const dir = path.dirname(srcFile);
let html = fs.readFileSync(srcFile, 'utf8');

const safe = s => s.replace(/<\/script/gi, '<\\/script');
// styles
html = html.replace(/<link rel="stylesheet" href="([^"h][^"]*)">/g, (m, f) => '<style>\n' + fs.readFileSync(path.join(dir, f), 'utf8') + '</style>');
// the paintings the page's trace names
const arts = new Set();
for (const m of html.matchAll(/<script src="(traces\/[^"]+)"><\/script>/g)) {
  const src = fs.readFileSync(path.join(dir, m[1]), 'utf8'), p = src.match(/painting:\s*'([^']+)'/);
  if (p) arts.add(p[1]);
}
const art = {};
for (const a of arts) art[a] = 'data:image/webp;base64,' + fs.readFileSync(path.join(top, 'art', 'places', a + '.webp')).toString('base64');
// scripts
let first = true;
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, f) => {
  const code = fs.readFileSync(path.join(dir, f), 'utf8');
  const pre = first ? '<script>window.STRANDED_ART = ' + JSON.stringify(art) + ';</script>\n' : ''; first = false;
  return pre + '<script>\n' + safe(code) + '\n</script>';
});
fs.writeFileSync(out, html);
console.log('wrote', path.relative(process.cwd(), out), (fs.statSync(out).size / 1048576).toFixed(2) + ' MB');

const artifact = opt('artifact');
if (artifact) {
  let a = html.replace(/^<!doctype html>\s*/i, '').replace(/<html[^>]*>\s*/i, '').replace(/<\/html>\s*$/i, '').replace(/<head>\s*/i, '').replace(/<\/head>\s*/i, '').replace(/<body>\s*/i, '').replace(/<\/body>\s*/i, '');
  a = a.replace(/<meta charset="utf-8">\s*/i, '').replace(/<meta name="viewport"[^>]*>\s*/i, '');
  fs.writeFileSync(path.resolve(artifact), a);
  console.log('wrote', artifact, '(for publishing)');
}
