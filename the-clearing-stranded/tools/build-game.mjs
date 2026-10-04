// Builds the game into one file that works offline: index.html with the living world's scripts and every painting inside.
//   node tools/build-game.mjs [--out Stranded.html] [--artifact some/where.html]
// --artifact also writes it without its outer document tags, for publishing as an artifact.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url)), top = path.join(here, '..');
const args = process.argv.slice(2), opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : null; };
const out = path.resolve(opt('out') || path.join(top, 'Stranded.html'));
let html = fs.readFileSync(path.join(top, 'index.html'), 'utf8');
const safe = s => s.replace(/<\/script/gi, '<\\/script');

// the paintings, every one in art/places, as data the page can use without the web
const art = {};
for (const f of fs.readdirSync(path.join(top, 'art', 'places')).filter(f => f.endsWith('.webp')).sort()) art[f.replace(/\.webp$/, '')] = 'data:image/webp;base64,' + fs.readFileSync(path.join(top, 'art', 'places', f)).toString('base64');
// the living world's scripts, inlined where index.html loads them; a trace that doesn't exist yet is left out
let first = true, missing = [];
html = html.replace(/<script src="(living\/[^"]+)"><\/script>\n?/g, (m, f) => {
  const file = path.join(top, f);
  if (!fs.existsSync(file)) { missing.push(f); return ''; }
  const pre = first ? '<script>window.STRANDED_ART = ' + JSON.stringify(art) + ';</script>\n' : ''; first = false;
  return pre + '<script>\n' + safe(fs.readFileSync(file, 'utf8')) + '\n</script>\n';
});
fs.writeFileSync(out, html);
console.log('wrote', path.relative(process.cwd(), out), (fs.statSync(out).size / 1048576).toFixed(2) + ' MB,', Object.keys(art).length, 'paintings' + (missing.length ? '; not found: ' + missing.join(', ') : ''));

const artifact = opt('artifact');
if (artifact) {
  let a = html.replace(/^<!doctype html>\s*/i, '').replace(/<html[^>]*>\s*/i, '').replace(/<\/html>\s*$/i, '').replace(/<head>\s*/i, '').replace(/<\/head>\s*/i, '').replace(/<body>\s*/i, '').replace(/<\/body>\s*/i, '');
  a = a.replace(/<meta charset="utf-8">\s*/i, '').replace(/<meta name="viewport"[^>]*>\s*/i, '');
  fs.writeFileSync(path.resolve(artifact), a);
  console.log('wrote', artifact, '(for publishing)');
}
