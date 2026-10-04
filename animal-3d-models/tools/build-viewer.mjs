// Builds a viewer page into one file that works offline (three.js, the cattle and everything else inlined).
//   node animal-3d-models/tools/build-viewer.mjs [--page henry | henry-motion] [--out file] [--artifact some/where.html]
// henry -> animal-3d-models/Henry_Three_Ways.html; henry-motion -> animal-3d-models/Henry_In_Motion.html.
// --artifact also writes the page without its outer document tags, for publishing as an artifact.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), top = path.join(here, '..'), dir = path.join(top, 'viewer');
const opt = k => { const i = process.argv.indexOf('--' + k); return i >= 0 ? process.argv[i + 1] : null; };
const page = opt('page') || 'henry', NAMES = {henry: 'Henry_Three_Ways.html', 'henry-motion': 'Henry_In_Motion.html'};
const out = path.resolve(opt('out') || path.join(top, NAMES[page] || page + '.html'));
let html = fs.readFileSync(path.join(dir, page + '.html'), 'utf8');
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, f) => '<script>\n' + fs.readFileSync(path.join(dir, f), 'utf8').replace(/<\/script/gi, '<\\/script') + '\n</script>');
fs.writeFileSync(out, html);
console.log(`${path.relative(process.cwd(), out)}: ${(fs.statSync(out).size / 1048576).toFixed(2)} MB`);
const a = opt('artifact');
if (a) { fs.writeFileSync(path.resolve(a), html.replace(/<!doctype html>\s*/i, '').replace(/<\/?html[^>]*>\s*/gi, '').replace(/<\/?head>\s*/gi, '').replace(/<\/?body[^>]*>\s*/gi, m => m.startsWith('<body') ? m.replace('<body', '<div id="hm-body"').replace(/>$/, '>') : '</div>').replace(/<meta charset="utf-8">\s*/i, '').replace(/<meta name="viewport"[^>]*>\s*/i, '')); console.log(`${a}: artifact copy`); }
