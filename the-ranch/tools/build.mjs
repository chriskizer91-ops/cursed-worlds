// Builds the ranch page into one file that works offline: its styles, its scripts (three.js and the cattle included) and
// the six pieces of the map inlined.
//   node the-ranch/tools/build.mjs [--out the-ranch/The_Ranch.html] [--artifact some/where.html]
// --artifact also writes the page without its outer document tags, for publishing as an artifact.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url)), top = path.join(here, '..');
const opt = k => { const i = process.argv.indexOf('--' + k); return i >= 0 ? process.argv[i + 1] : null; };
const out = path.resolve(opt('out') || path.join(top, 'The_Ranch.html'));
let html = fs.readFileSync(path.join(top, 'ranch.html'), 'utf8');
const safe = s => s.replace(/<\/script/gi, '<\\/script');
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (m, f) => '<style>\n' + fs.readFileSync(path.join(top, f), 'utf8') + '</style>');
const art = {};
for (let i = 0; i < 6; i++) art['tile' + i] = 'data:image/webp;base64,' + fs.readFileSync(path.join(top, 'map', 'tiles', i + '.webp')).toString('base64');
let first = true;
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, f) => {
  const pre = first ? '<script>window.RANCH_ART = ' + JSON.stringify(art) + ';</script>\n' : ''; first = false;
  return pre + '<script>\n' + safe(fs.readFileSync(path.join(top, f), 'utf8')) + '\n</script>';
});
fs.writeFileSync(out, html);
console.log(`${path.relative(process.cwd(), out)}: ${(fs.statSync(out).size / 1048576).toFixed(2)} MB`);
const a = opt('artifact');
if (a) {
  const body = html.replace(/<!doctype html>\s*/i, '').replace(/<\/?html[^>]*>\s*/gi, '').replace(/<\/?head>\s*/gi, '').replace(/<\/?body>\s*/gi, '').replace(/<meta charset="utf-8">\s*/i, '').replace(/<meta name="viewport"[^>]*>\s*/i, '');
  fs.writeFileSync(path.resolve(a), body); console.log(`${a}: artifact copy`);
}
