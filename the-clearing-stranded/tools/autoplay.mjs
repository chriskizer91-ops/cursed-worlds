// Plays many games with no browser, the way a player who always follows the Next step card would,
// and checks after every move that nothing has gone wrong: no broken numbers, no dead ends, no crashes.
//
//   node tools/autoplay.mjs                 # 48 games, every start, solo and duo, real and gentler
//   node tools/autoplay.mjs --games 200 --days 400
//
// It ends with "all good" when nothing went wrong.
import {load} from './engine.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const GAMES = +opt('games', 48), MAX_DAYS = +opt('days', 365), VERBOSE = args.includes('--verbose');
const SMART = args.includes('--smart');
const FILE = opt('file'), TRACE = opt('trace'), TRIAL = args.includes('--trial'), LEVELS = (opt('levels', '') || '').split(',').filter(Boolean);

const {E, D} = load(FILE);
const problems = new Map();   // kind -> {count, example}
// how each season treats a player: days lived, deaths, and the day-by-day drain on health and food
const SEASONS = {}; for (const k of ['Spring', 'Summer', 'Fall', 'Winter']) SEASONS[k] = {days: 0, deaths: 0, hp: 0, food: 0, causes: {}};
function problem(kind, example){
  const p = problems.get(kind);
  if (p) p.count++; else problems.set(kind, {count: 1, example});
}

const num = x => typeof x === 'number' && Number.isFinite(x);
function checkState(s, where){
  const bad = [];
  for (const k of ['hp', 'hyd', 'res', 'en']) if (!num(s.body[k])) bad.push('body.' + k + '=' + s.body[k]);
  for (const k in s.inv) if (!num(s.inv[k]) || s.inv[k] < 0) bad.push('inv.' + k + '=' + s.inv[k]);
  for (const k in s.gear) if (!num(s.gear[k]) || s.gear[k] < 0) bad.push('gear.' + k + '=' + s.gear[k]);
  for (const k of ['clean', 'raw', 'risk']) if (!num(s.water[k]) || s.water[k] < 0) bad.push('water.' + k + '=' + s.water[k]);
  if (s.water.clean + s.water.raw > E._t.capacity(s) + 0.05) bad.push('water over capacity: ' + (s.water.clean + s.water.raw) + ' > ' + E._t.capacity(s));
  for (const f of s.food){
    if (!num(f.kg) || !num(f.kcal) || !num(f.exp) || f.kg < 0 || f.kcal < 0) bad.push('food ' + f.key + ' kg=' + f.kg + ' kcal=' + f.kcal + ' exp=' + f.exp);
    if (f.kg <= 0.001 && f.kcal >= 5) bad.push('food with calories but no weight: ' + f.key + ' ' + f.kcal + ' Cal');
  }
  if (!num(s.t)) bad.push('t=' + s.t);
  if (!num(s.fire.fuel) || s.fire.fuel < -0.01) bad.push('fire.fuel=' + s.fire.fuel);
  if (s.tools.snares < 0) bad.push('snares=' + s.tools.snares);
  for (const k in s.crops) if (!num(s.crops[k].ripe) || s.crops[k].ripe < 0) bad.push('crop ' + k + '=' + s.crops[k].ripe);
  for (const k in s.stock) if (!num(s.stock[k]) || s.stock[k] < 0) bad.push('stock ' + k + '=' + s.stock[k]);
  for (const id in s.proj){ const p = s.proj[id]; if (!(p.done >= 0 && p.done <= p.total + 1e-6)) bad.push('project ' + id + ' ' + p.done + '/' + p.total); }
  for (const b of bad) problem('bad number: ' + b.replace(/=.*$/, '').replace(/ \d.*$/, ''), where + ': ' + b);
  return !bad.length;
}

// Every view the screen asks for must work in every state.
function checkViews(s, where){
  const views = ['hud', 'campInfo', 'locInfo', 'foodList', 'water', 'guideList', 'guideCount', 'ecoList', 'summary', 'progression', 'recipes', 'actions', 'travelList', 'advice', 'pendingView'];
  for (const v of views){
    try { const out = E[v](s); JSON.stringify(out); }
    catch (e){ problem('view crashed: ' + v, where + ': ' + e.message); }
  }
  try { for (const r of D.RECIPES) E.plan(s, r.id); } catch (e){ problem('plan crashed', where + ': ' + e.message); }
  const text = JSON.stringify([E.hud(s), E.campInfo(s), E.locInfo(s), E.foodList(s).map(f => f.name), E.recipes(s).map(r => r.why), E.actions(s).map(a => [a.sub, a.why])]);
  if (/NaN|undefined|Infinity|\[object/.test(text)) problem('text shows NaN/undefined', where + ': ' + text.match(/.{0,60}(NaN|undefined|Infinity|\[object).{0,30}/)[0]);
}

function bestFood(s){
  // what a sensible player eats first: whatever spoils soonest, cooked or safe raw, never bitter acorns or rack food
  const L = E.foodList(s).filter(f => !f.rack && !f.bitter && !f.raw);
  return L.length ? L[0] : null;
}

function choosePending(s){
  const pv = E.pendingView(s), ks = pv.opts.map(o => o.k);
  if (s.pending.type === 'hunt'){
    if (ks.includes('arrow')) return 'arrow';
    if (ks.includes('shoot') && s.gear.rounds > 5) return 'shoot';
    return ks.includes('wait') ? 'wait' : 'pass';
  }
  return 'back';
}

// one move: what a player following the card would do now
function move(s, ctx){
  if (s.pending) return {kind: 'choose', R: E.choose(s, choosePending(s))};
  // eat and drink like a person, not only when the card shouts
  const h = E.hud(s);
  if (h.hyd < 70 && s.water.clean > 0.3) { const R = E.drink(s, 'clean'); if (R && !R.err) return {kind: 'drink', R}; }
  if (h.food < 75 && s.day.kcal < 4000){
    const f = bestFood(s);
    if (f){ const R = E.eat(s, f.id); if (R && !R.err) return {kind: 'eat', R}; }
    if (h.food < 60 && s.gear.bars >= 5 * s.P){ const R = E.eatBars(s, 5); if (R && !R.err) return {kind: 'bars', R}; }
    if (h.food < 60 && s.gear.bars >= s.P){ const R = E.eatBars(s, 1); if (R && !R.err) return {kind: 'bars', R}; }
  }
  // a sensible player also looks after what they caught: cook it, smoke the surplus, eat what's about to turn
  if (SMART){
    const ok = id => { const a = E.actions(s).find(x => x.id === id); return a && a.ok; };
    if (s.loc === 'camp' && s.fire.st === 'lit'){
      const raw = s.food.filter(f => f.st === 'raw' && !f.rack && D.FOODS[f.key].cook);
      const meat = raw.filter(f => D.FOODS[f.key].meat).reduce((a, f) => a + f.kcal, 0);
      if (meat >= 1200 * s.P && ok('rack')) return {kind: 'act', R: E.run(s, 'rack')};
      if (raw.length && ok('cook')) return {kind: 'act', R: E.run(s, 'cook')};
      if (s.water.raw >= 1 && s.water.clean < 3 && ok('boil')) return {kind: 'act', R: E.run(s, 'boil')};
      if (E.isEvening(s) && s.fire.fuel < 9 && s.inv.wood >= 2 && ok('stock')) return {kind: 'act', R: E.run(s, 'stock')};
    }
    const turning = E.foodList(s).filter(f => !f.rack && !f.bitter && !f.raw && f.hrs < 14);
    if (turning.length && h.food < 96 && s.day.kcal < 4300){ const R = E.eat(s, turning[0].id); if (R && !R.err) return {kind: 'eat', R}; }
  }
  const A = E.advice(s);
  if (!A) return {kind: 'none', R: null};
  let step = A;
  if (A.recipe && !s.pin) step = E.plan(s, A.recipe) || A;
  ctx.lastAdvice = A.text + ' | ' + (step.text || '');
  if (step.drink) return {kind: 'drink', R: E.drink(s, step.drink), step};
  if (step.tab === 'pack'){
    const f = bestFood(s);
    if (f) return {kind: 'eat', R: E.eat(s, f.id), step};
    return {kind: 'bars', R: E.eatBars(s, Math.min(5, Math.floor(s.gear.bars / s.P)) || 1), step};
  }
  if (step.craft) return {kind: 'craft', R: E.craft(s, step.craft), step};
  if (step.go && step.go !== s.loc) return {kind: 'travel', R: E.travel(s, step.go), step};
  if (step.act) return {kind: 'act', R: E.run(s, step.act), step};
  if (step.tab === 'journal' || A.idle || step.wait){
    // nothing on the list: keep busy the way a player would
    const acts = E.actions(s).filter(a => a.ok);
    const sleep = acts.find(a => a.id === 'sleep');
    if (sleep && (E.isDark(s) || s.body.en < 40)) return {kind: 'idle', R: E.run(s, 'sleep'), step};
    const busy = acts.find(a => /^(wood|forage|pick|hunt|trapcheck|snarecheck|cattail|grass|yucca|poles|vines)/.test(a.id));
    if (busy) return {kind: 'idle', R: E.run(s, busy.id), step};
    if (s.loc !== 'camp' && E.isEvening(s)) return {kind: 'idle', R: E.travel(s, 'camp'), step};
    return {kind: 'idle', R: E.run(s, sleep ? 'sleep' : 'rest'), step};
  }
  if (step.go === s.loc && !step.act) return {kind: 'nothing', R: null, step};
  return {kind: 'unknown', R: null, step};
}

// The same mid-game camp for every season trial: a roof, a bed, a rack, a fish trap, a bowl, a little food, no bars.
function kit(s){
  s.shelter = 2; Object.assign(s.tools, {bowdrill: true, spear: true, fishtrap: true, rack: true, bowl: true, bags: 2, hang: true, bedding: true, snares: 6});
  Object.assign(s.inv, {wood: 6, bark: 3, fiber: 3, cord: 2, stones: 4, grubs: 4, poles: 2, vines: 3});
  s.gear.bars = 0; s.water.clean = 6; s.fire = {st: 'lit', fuel: 6, at: s.t, wet: false};
  s.stats.fires = 1; s.skill.fireOK = 4; s.skill.spear = 6;
  s.visited = {camp: true, cedar: true, oak: true, prairie: true, berry: true, river: true, pond: true, creek: true};
  s.food.push({id: s.nid++, key: 'venison', kg: 3, kcal: 3600, st: 'smoked', exp: s.t + 24 * 25, rack: null});
}
function play(seed, start, party, diff){
  const s = E.newGame({seed, start, party, diff});
  if (TRIAL) kit(s);
  const tag = `seed ${seed} ${start} ${party} ${diff}`;
  const ctx = {}, food = {gathered: 0, spoiled: 0, raided: 0};
  let day = Math.floor(s.t / 24), dayHp = s.body.hp, dayRes = s.body.res;
  let moves = 0, still = 0, lastT = s.t, errs = 0;
  while (!s.dead && (s.t - s.t0) / 24 < MAX_DAYS && moves < 40000){
    moves++;
    const where = tag + ' day ' + Math.floor(s.t / 24 + 1) + ' at ' + s.loc;
    let m;
    try { m = move(s, ctx); }
    catch (e){ problem('crash: ' + e.message.split('\n')[0], where + '\n' + e.stack.split('\n').slice(0, 4).join('\n')); return {s, tag, crashed: true}; }
    if (TRACE && String(seed) === TRACE) console.log(`d${Math.floor(s.t / 24 + 1)} ${E.clock(s.t % 24).padStart(8)} ${s.loc.padEnd(7)} ${m.kind.padEnd(6)} ${(m.R ? (m.R.err ? 'REFUSED ' + m.R.lines[0] : m.R.title) : '-').slice(0, 40).padEnd(40)} hp${Math.round(s.body.hp)} w${Math.round(s.body.hyd)} f${Math.round(s.body.res / 300)} e${Math.round(s.body.en)} bars${s.gear.bars} | ${(ctx.lastAdvice || '').slice(0, 110)}`);
    if (m.R && !m.R.err){
      for (const g of m.R.gains) if (g.food) food.gathered += g.kcal;
      for (const l of m.R.lines){
        const sp = l.match(/spoiled: (\d+) Calories/); if (sp) food.spoiled += +sp[1];
        if (/got away with/.test(l)) for (const x of l.matchAll(/\((\d+) Cal\)/g)) food.raided += +x[1];
      }
    }
    if (m.R && m.R.err){
      errs++;
      // the card promises its button is something the game will allow
      if (m.step && m.kind !== 'eat' && m.kind !== 'bars' && m.kind !== 'drink') problem('the Next step card pointed at something the game refused', where + ': "' + ctx.lastAdvice + '" -> ' + m.kind + ' refused: ' + m.R.lines[0]);
    }
    if (m.kind === 'unknown' || m.kind === 'nothing') problem('the Next step card had no button to press', where + ': ' + JSON.stringify(m.step).slice(0, 200));
    if (s.t > lastT + 1e-9){ lastT = s.t; still = 0; }
    else if (++still > 30){
      problem('stuck: 30 moves in a row and the clock never moved', where + ': last advice "' + ctx.lastAdvice + '"');
      // get unstuck the blunt way so the rest of the game still gets tested
      E.run(s, E.isEvening(s) ? 'sleep' : 'rest'); still = 0; lastT = s.t;
    }
    if (Math.floor(s.t / 24) !== day || s.dead){
      const season = E.hud(s).season, S = SEASONS[season];
      if (s.dead){ S.deaths++; S.causes[s.cause] = (S.causes[s.cause] || 0) + 1; }
      else { S.days++; S.hp += s.body.hp - dayHp; S.food += s.body.res - dayRes; }
      day = Math.floor(s.t / 24); dayHp = s.body.hp; dayRes = s.body.res;
    }
    if (moves % 5 === 0) checkState(s, where);
    if (moves % 50 === 0){
      checkViews(s, where);
      const back = E.load(E.save(s));
      if (!back) problem('a saved game would not load again', where);
    }
  }
  checkState(s, tag + ' end'); checkViews(s, tag + ' end');
  if (moves >= 40000) problem('a game ran 40,000 moves without ending', tag);
  return {s, tag, errs, moves, food};
}

const STARTS = Object.keys(D.STARTS), PARTIES = ['solo', 'duo'], DIFFS = LEVELS.length ? LEVELS : (D.LEVELS ? Object.keys(D.LEVELS) : ['real', 'easy']);
const results = [];
for (let g = 0; g < GAMES; g++){
  const start = STARTS[g % 4], party = TRIAL ? 'solo' : PARTIES[(g >> 2) % 2], diff = DIFFS[Math.floor(g / (TRIAL ? 4 : 8)) % DIFFS.length];
  const r = play(1000 + g, start, party, diff);
  const m = E.summary(r.s);
  results.push({start, party, diff, days: m.days + m.hours / 24, cause: r.s.dead ? r.s.cause : 'alive', bars: r.s.gear.bars, built: Object.keys(r.s.tools).filter(k => r.s.tools[k] === true).length, shelter: r.s.shelter, badges: m.ach});
  if (VERBOSE) console.log(r.tag.padEnd(34), (r.s.dead ? 'died day ' + m.days + ' (' + r.s.cause + ')' : 'alive after ' + m.days + ' days').padEnd(32), 'shelter', r.s.shelter, 'badges', m.ach,
    r.food ? `| wild food: ${Math.round(r.food.gathered / 1000)}k Cal gathered, ${Math.round(r.food.spoiled / 1000)}k spoiled, ${Math.round(r.food.raided / 1000)}k raided; eaten ${Math.round(r.s.stats.kcal / 1000)}k, ${r.s.stats.fish} fish, ${r.s.stats.game} game, ${r.s.gear.rounds} rounds left` : '');
}

// how the games went
const by = (key) => { const o = {}; for (const r of results){ const k = r[key]; (o[k] = o[k] || []).push(r); } return o; };
const avg = L => (L.reduce((a, r) => a + r.days, 0) / L.length).toFixed(0);
console.log(`\n${results.length} ${TRIAL ? 'season trials (mid-game camp, no bars)' : 'games'}, up to ${MAX_DAYS} days each, following the Next step card.`);
if (TRIAL){
  console.log('  survived ' + MAX_DAYS + ' days, by level and season:');
  for (const lv of DIFFS){ const L = results.filter(r => r.diff === lv); console.log('   ', lv.padEnd(7), STARTS.map(st => { const R = L.filter(r => r.start === st); return st + ' ' + R.filter(r => r.cause === 'alive').length + '/' + R.length + ' (' + avg(R) + 'd)'; }).join('   ')); }
}
for (const key of ['start', 'party', 'diff']){
  const o = by(key);
  console.log('  ' + key.padEnd(6), Object.keys(o).map(k => `${k}: ${avg(o[k])} days avg, ${o[k].filter(r => r.cause === 'alive').length}/${o[k].length} alive`).join('   '));
}
const causes = by('cause');
console.log('  endings', Object.keys(causes).map(k => k + ' ' + causes[k].length).join(', '));
console.log('  by season (days lived there, deaths per 100 days, health and food change per day, causes):');
for (const k in SEASONS){ const S = SEASONS[k]; if (!S.days) continue;
  console.log('   ', k.padEnd(7), String(S.days).padStart(6), 'days', (S.deaths / S.days * 100).toFixed(2).padStart(6), 'deaths/100d', (S.hp / S.days).toFixed(2).padStart(7), 'hp/day', String(Math.round(S.food / S.days)).padStart(6), 'Cal/day', ' ', Object.keys(S.causes).map(c => c + ' ' + S.causes[c]).join(', ')); }

if (!problems.size){ console.log('\nall good'); process.exit(0); }
console.log('\nProblems:');
for (const [k, p] of [...problems].sort((a, b) => b[1].count - a[1].count)) console.log(`\n- ${k} (${p.count}x)\n    ${p.example.replace(/\n/g, '\n    ')}`);
process.exit(1);
