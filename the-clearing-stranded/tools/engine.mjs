// Loads the game's DATA and ENGINE parts out of index.html, with no browser, so the rules can be tested.
// Usage: import {load} from './engine.mjs'; const {E, D} = load();
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export function load(file){
  const html = fs.readFileSync(file || path.join(here, '..', 'index.html'), 'utf8');
  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  const part = name => {
    const b = blocks.find(x => x.includes('===== ' + name + ' ====='));
    if (!b) throw new Error('No ' + name + ' part in ' + file);
    return b;
  };
  const ctx = vm.createContext({console, Math, JSON, Object, Array, Number, String, Set, Map});
  ctx.globalThis = ctx;
  vm.runInContext(part('2. DATA'), ctx, {filename: 'DATA'});
  vm.runInContext(part('3. ENGINE'), ctx, {filename: 'ENGINE'});
  return {E: ctx.Engine, D: ctx.DATA};
}
