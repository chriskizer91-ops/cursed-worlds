// camp-alive.js: the bench page for the living camp. Tap to walk; tap the fire ring, the shelter, the woodpile, the
// crates, the rack, the rain catcher or the food hang to use them; the sheet at the bottom sets the hour, the season,
// the weather, what is built, and what the survivor does.
(async function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const T = TRACES.camp;
  const src = (window.STRANDED_ART && window.STRANDED_ART[T.painting]) || '../art/places/' + T.painting + '.webp';
  const im = new Image(); im.src = src; await im.decode();

  const cv = $('#stage');
  const S = makeStage({canvas: cv, painting: im, trace: T, hour: 18.5, month: 4.6});
  S.renderer.setClearColor(0x0b1014);
  const camp = makeCamp(S);
  const life = makeLife(S);
  const hero = makeSurvivor(); S.scene.add(hero.root); S.shadow(hero.root, 0.3, 0.24);
  const walk = makeWalker(S, hero);
  let partner = null, pwalk = null;
  const P = (px, py) => S.toWorld(px, py);
  hero.root.position.copy(P(706, 600)); hero.root.rotation.y = 0.6;
  camp.set({fire: 'lit', shelter: 1, wood: 0.7, crates: 2, rack: true, meat: true, hang: true});
  window.BENCH = {S, camp, life, hero, walk, seen: new Set()};

  // ---------- the clock, the season, the weather ----------
  const SEASONS = [['Spring', 4.6, 'late May'], ['Summer', 7.5, 'mid August'], ['Fall', 10.35, 'early November'], ['Winter', 0.5, 'mid January']];
  const WEATHER = [['clear', 'Clear'], ['breezy', 'Breezy'], ['overcast', 'Overcast'], ['rain', 'Rain'], ['storm', 'Storm'], ['snow', 'Snow'], ['fog', 'Fog']];
  const sky = {hour: 18.5, runs: true, season: 0, weather: 'clear'};
  const fmtHour = h => { h = ((h % 24) + 24) % 24; let H = Math.floor(h), M = Math.floor((h - H) * 60); const pm = H >= 12; H = H % 12 || 12; return H + ':' + String(M).padStart(2, '0') + (pm ? ' pm' : ' am'); };
  function showClock() {
    $('#hourOut').textContent = fmtHour(sky.hour); $('#hour').value = sky.hour.toFixed(2);
    const w = WEATHER.find(x => x[0] === sky.weather)[1].toLowerCase();
    $('#clock').textContent = fmtHour(sky.hour) + ' · ' + SEASONS[sky.season][2] + ' · ' + w;
  }
  function seg(el, items, cur, on) {
    el.innerHTML = ''; for (const [v, label] of items) { const b = document.createElement('button'); b.textContent = label; b.setAttribute('aria-pressed', String(v === cur)); b.onclick = () => { for (const x of el.children) x.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-pressed', 'true'); on(v); }; el.appendChild(b); }
  }
  seg($('#season'), SEASONS.map((s, i) => [i, s[0]]), 0, i => { sky.season = i; S.setMonth(SEASONS[i][1]); if (i === 3 && sky.weather === 'clear') say('Winter: the grass is straw, the post oaks hold their brown leaves, the cedars stay green.'); showClock(); });
  seg($('#weather'), WEATHER, 'clear', w => { sky.weather = w; S.setWeather(w); showClock(); if (w === 'snow') say('Snow. It settles on the ground and on the tops of things as it falls.'); if (w === 'storm') say('A storm: wind, hard rain and lightning.'); });
  $('#hour').addEventListener('input', e => { sky.hour = +e.target.value; S.setHour(sky.hour); showClock(); });
  $('#clockRuns').onclick = e => { sky.runs = !sky.runs; e.currentTarget.setAttribute('aria-pressed', String(sky.runs)); };

  // ---------- the camp ----------
  seg($('#fire'), [['out', 'Out'], ['coals', 'Coals'], ['lit', 'Burning'], ['big', 'Roaring']], 'lit', v => { camp.set({fire: v}); if (v === 'big') camp.stoke(); });
  seg($('#shelter'), [[0, 'None'], [1, 'Lean-to'], [2, 'Roofed boulders'], [3, 'Walled hut']], 1, v => camp.set({shelter: v}));
  const BUILDS = [['bed', 'Grass bed'], ['blanket', 'Hide blanket'], ['rack', 'Drying rack'], ['meat', 'Meat drying'], ['wood', 'Woodpile'], ['rain', 'Rain catcher'], ['hang', 'Food hang'], ['crates', 'Crates']];
  for (const [k, label] of BUILDS) {
    const b = document.createElement('button'); b.textContent = label;
    const on = () => k === 'wood' ? camp.state.wood > 0 : k === 'crates' ? camp.state.crates > 0 : !!camp.state[k];
    b.setAttribute('aria-pressed', String(on()));
    b.onclick = () => { const v = !on(); camp.set({[k]: k === 'wood' ? (v ? 0.7 : 0) : k === 'crates' ? (v ? 2 : 0) : v}); if (k === 'meat' && v) camp.set({rack: true}); syncBuilds(); };
    b.dataset.k = k; $('#builds').appendChild(b);
  }
  function syncBuilds() { for (const b of $('#builds').children) { const k = b.dataset.k; b.setAttribute('aria-pressed', String(k === 'wood' ? camp.state.wood > 0 : k === 'crates' ? camp.state.crates > 0 : !!camp.state[k])); } }

  // ---------- what the survivor does: a few steps one after another ----------
  let plan = [], step = null, stepT = 0;
  function run(steps) { plan = steps.slice(); step = null; hero.stop(); hero.carry(hero.carrying || null); next(); }
  function next() {
    step = plan.shift() || null; stepT = 0; if (!step) return;
    const [k, a, b] = step;
    if (k === 'walk') { if (!walk.goTo(a.x, a.z, () => { step = null; next(); }, b)) { step = null; next(); } }
    else if (k === 'hold') hero.hold(a);
    else if (k === 'play') hero.play(a);
    else if (k === 'do') { a(); step = null; next(); }
    else if (k === 'say') { say(a); step = null; next(); }
  }
  function tickPlan(dt) {
    if (!step) return; const [k, a, b] = step; stepT += dt;
    if ((k === 'hold' || k === 'play') && stepT >= (b || hero.MOVES[a].dur)) { if (k === 'hold' && plan.length) hero.hold(null); step = null; next(); }
  }
  let sayTimer = 0;
  function say(t, secs) { const el = $('#say'); el.textContent = t; el.removeAttribute('data-off'); sayTimer = secs || 4.5; }

  // the things you can tap in the camp, where each meets the ground, and what doing it looks like
  const ringC = P(T.ring[0], T.ring[1]);
  const besideRing = () => { const d = hero.root.position.clone().sub(ringC).setY(0); if (d.length() < 0.01) d.set(0, 0, 1); d.normalize().multiplyScalar(0.95); return ringC.clone().add(d); };
  const SPOTS = [
    {id: 'ring', at: [T.ring[0], T.ring[1]], r: 55, go() {
      const f = camp.state.fire, to = besideRing(), face = {faceTo: ringC};
      if (f === 'out') run([['walk', to, face], ['say', 'A bow drill: saw the bow until the spindle smokes and drops a coal.'], ['hold', 'drill', 4], ['do', () => { camp.set({fire: 'coals'}); syncSeg('#fire', 'coals'); }], ['say', 'A coal. Into the tinder bundle, and blow it into flame.'], ['hold', 'blow', 3], ['do', () => { camp.set({fire: 'lit'}); syncSeg('#fire', 'lit'); camp.stoke(); }], ['say', 'Fire.']]);
      else if (f === 'coals') run([['walk', to, face], ['hold', 'blow', 3], ['do', () => { camp.set({fire: 'lit'}); syncSeg('#fire', 'lit'); camp.stoke(); }], ['say', 'The coals catch again.']]);
      else if (hero.carrying) run([['walk', to, face], ['hold', 'work', 1.6], ['do', () => { hero.carry(null); hero.carrying = null; camp.set({fire: 'big'}); syncSeg('#fire', 'big'); camp.stoke(); }], ['say', 'An armload on the fire.']]);
      else run([['walk', to, face], ['hold', 'sit', 6], ['say', 'Warm hands, a moment to rest.']]);
    }},
    {id: 'shelter', at: [784, 372], r: 70, go() {
      const night = S.light.night > 0.5, inside = P(784, camp.state.shelter === 1 ? 352 : 372);
      run([['walk', inside, {faceTo: ringC}], ['hold', night ? 'sleep' : 'sit', night ? 14 : 6], ['say', night ? 'Asleep in the shelter, the fire ticking down.' : 'Out of the sun between the boulders.']]);
    }},
    {id: 'wood', at: T.sites.wood, r: 50, ok: () => camp.state.wood > 0, go() {
      const c = P(T.sites.wood[0], T.sites.wood[1]);
      run([['walk', c.clone().add(new THREE.Vector3(-0.2, 0, 0.75)), {faceTo: c}], ['play', 'gather'], ['do', () => { hero.carry('wood'); hero.carrying = 'wood'; }], ['say', 'An armload of wood. Tap the fire to put it on.']]);
    }},
    {id: 'crates', at: T.sites.crate, r: 45, ok: () => camp.state.crates > 0, go() { const c = P(T.sites.crate[0], T.sites.crate[1]); run([['walk', c.clone().add(new THREE.Vector3(0.2, 0, 0.8)), {faceTo: c}], ['hold', 'work', 2.5], ['say', 'The crates: the only critter-proof box in camp.']]); }},
    {id: 'rack', at: T.sites.rack, r: 50, ok: () => camp.state.rack, go() { const c = P(T.sites.rack[0], T.sites.rack[1]); run([['walk', c.clone().add(new THREE.Vector3(0, 0, 0.85)), {faceTo: c}], ['play', 'gather'], ['say', 'Strips of meat drying in the smoke.']]); }},
    {id: 'rain', at: T.sites.rain, r: 45, ok: () => camp.state.rain, go() { const c = P(T.sites.rain[0], T.sites.rain[1]); run([['walk', c.clone().add(new THREE.Vector3(0, 0, 0.9)), {faceTo: c}], ['hold', 'drink', 5.2], ['say', 'Rainwater: safe to drink without boiling.']]); }},
    {id: 'hang', at: T.sites.hang, r: 50, ok: () => camp.state.hang, go() { const c = P(T.sites.hang[0], T.sites.hang[1]); run([['walk', c.clone().add(new THREE.Vector3(0.3, 0, 0.7)), {faceTo: c}], ['play', 'look'], ['say', 'The food hangs high, out of reach of raccoons and coyotes.']]); }}
  ];
  function syncSeg(sel, v) { for (const b of $(sel).children) b.setAttribute('aria-pressed', String(b.textContent === {out: 'Out', coals: 'Coals', lit: 'Burning', big: 'Roaring'}[v])); }

  // ---------- moves on demand ----------
  const MOVES = [['drill', 'Bow drill', 'hold', 5], ['blow', 'Blow on coals', 'hold', 4], ['work', 'Work the ground', 'hold', 4], ['gather', 'Pick up'], ['snap', 'Snap a stick'], ['drink', 'Drink'], ['sit', 'Sit', 'hold', 8],
    ['sleep', 'Sleep', 'hold', 10], ['wave', 'Wave'], ['look', 'Look out'], ['wipe', 'Wipe brow'], ['stretch', 'Stretch']];
  for (const [k, label, kind, secs] of MOVES) { const b = document.createElement('button'); b.className = 'act'; b.textContent = label; b.onclick = () => { walk.stop(); run([[kind === 'hold' || hero.MOVES[k].hold ? 'hold' : 'play', k, secs]]); }; $('#moves').appendChild(b); }
  const feelB = (label, get, set) => { const b = document.createElement('button'); b.textContent = label; b.setAttribute('aria-pressed', String(get())); b.onclick = () => { set(!get()); b.setAttribute('aria-pressed', String(get())); }; $('#feel').appendChild(b); };
  feelB('Carrying wood', () => !!hero.carrying, v => { hero.carrying = v ? 'wood' : null; hero.carry(hero.carrying); });
  feelB('Cold (shivering)', () => hero.state.cold > 0.5, v => { hero.state.cold = v ? 1 : 0; });
  feelB('Worn out', () => hero.state.tired > 0.5, v => { hero.state.tired = v ? 1 : 0; });

  // ---------- the view ----------
  const view = {mode: 'close', follow: true, cx: 706, cy: 560, drag: null};
  seg($('#zoom'), [['close', 'Close'], ['whole', 'Whole camp']], 'close', v => { view.mode = v; view.follow = v === 'close'; });
  const whoB = (label, get, set) => { const b = document.createElement('button'); b.textContent = label; b.setAttribute('aria-pressed', String(get())); b.onclick = () => { set(!get()); b.setAttribute('aria-pressed', String(get())); }; $('#who').appendChild(b); };
  whoB('The partner', () => !!partner, v => {
    if (v && !partner) { partner = makeSurvivor({partner: true}); partner.root.position.copy(hero.root.position).add(new THREE.Vector3(1.2, 0, 0.4)); S.scene.add(partner.root); S.shadow(partner.root, 0.3, 0.24); pwalk = makeWalker(S, partner); }
    if (!v && partner) { partner.root.visible = false; S.scene.remove(partner.root); partner = null; pwalk = null; }
  });
  let dbg = false; const dbgB = document.createElement('button'); dbgB.textContent = 'Show what stands where'; dbgB.setAttribute('aria-pressed', 'false'); dbgB.onclick = () => { dbg = !dbg; S.setDebug(dbg); dbgB.setAttribute('aria-pressed', String(dbg)); }; $('#debug').appendChild(dbgB);

  // ---------- tabs ----------
  for (const t of document.querySelectorAll('.tabs button')) t.onclick = () => {
    const open = t.getAttribute('aria-selected') !== 'true';
    for (const u of document.querySelectorAll('.tabs button')) u.setAttribute('aria-selected', 'false');
    for (const p of document.querySelectorAll('.panel')) p.hidden = true;
    if (open) { t.setAttribute('aria-selected', 'true'); $('#p-' + t.dataset.tab).hidden = false; }
  };

  // ---------- tapping and dragging the picture ----------
  let down = null;
  cv.addEventListener('pointerdown', e => { down = {x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy, moved: false}; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => {
    if (!down) return; const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (Math.hypot(dx, dy) > 10) down.moved = true;
    if (down.moved) { const k = S.view.w / cv.clientWidth; view.follow = false; view.cx = down.cx - dx * k; view.cy = down.cy - dy * k; }
  });
  cv.addEventListener('pointerup', e => {
    const d = down; down = null; if (!d || d.moved) return;
    const [px, py] = S.paintAt(e.clientX, e.clientY), [gx, gy] = S.groundAt(px, py);
    // the survivor: a wave
    const hp = S.toPaint(hero.root.position);
    if (Math.abs(px - hp[0]) < 26 && py < hp[1] + 6 && py > hp[1] - 90) { run([['play', 'wave']]); return; }
    for (const s of SPOTS) if ((!s.ok || s.ok()) && Math.hypot(gx - s.at[0], (gy - s.at[1]) * 1.4) < s.r) { view.follow = view.mode === 'close'; s.go(); return; }
    view.follow = view.mode === 'close';
    hero.stop(); run([['walk', S.toWorld(gx, gy)]]);
  });

  // ---------- sizing ----------
  function size() {
    const w = cv.clientWidth, h = cv.clientHeight; S.resize(w, h);
    view.aspect = w / h;
    // close: the survivor about 70 pixels tall on a phone, larger on a big screen
    view.closeW = Math.min(T.size[0], Math.max(380, w / (w < 700 ? 0.86 : 1.05)));
  }
  window.addEventListener('resize', size); size();

  // ---------- every frame ----------
  let last = performance.now(), t = 0, acc = 0, frames = 0, fpsT = 0, fps = 0;
  const hold = 1 / 30;
  S.setHour(sky.hour); S.settle(); showClock();
  $('#loading').hidden = true;
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = Math.min(0.1, (now - last) / 1000); last = now; acc += dt;
    if (acc < hold * 0.95) return; dt = Math.min(0.1, acc); acc = 0;
    t += dt;
    if (sky.runs) { sky.hour = (sky.hour + dt * 24 / 360) % 24; S.setHour(sky.hour); if ((t * 4 | 0) !== ((t - dt) * 4 | 0)) showClock(); }
    const sp = walk.update(dt); hero.animate(dt, t, sp); if (hero.action) BENCH.seen.add(hero.action);
    // the cold of a winter night or a soaking reaches the survivor, unless they are by the fire
    const nearFire = camp.state.fire !== 'out' && hero.root.position.distanceTo(ringC) < 3;
    if (!hero.userCold) hero.state.cold = Math.max(hero.state.cold > 0.9 ? 1 : 0, (S.month < 2 || S.month > 11 || sky.weather === 'snow') && S.light.night > 0.5 && !nearFire ? 0.8 : 0);
    if (partner) {
      // the partner keeps near the survivor and joins in by the fire
      const d = partner.root.position.distanceTo(hero.root.position);
      if (d > 2.4 && !pwalk.moving) pwalk.goTo(hero.root.position.x + 1.1, hero.root.position.z + 0.5);
      if (d < 1.5 && !pwalk.moving && hero.action === 'sit' && partner.action !== 'sit') partner.hold('sit');
      if (pwalk.moving && partner.action) partner.hold(null);
      partner.animate(dt, t, pwalk.update(dt));
    }
    tickPlan(dt);
    camp.update(t, dt);
    life.update(t, dt, partner ? [hero.root.position, partner.root.position] : [hero.root.position]);
    // the camera follows the survivor, or shows the whole place
    const vw = view.mode === 'whole' ? Math.max(T.size[0], T.size[1] * view.aspect) : view.closeW;
    if (view.mode === 'whole' && view.follow) { view.cx = T.size[0] / 2; view.cy = T.size[1] / 2; }
    else if (view.follow) { const hp = S.toPaint(hero.root.position); const k = 1 - Math.exp(-dt * 3); view.cx += (hp[0] - view.cx) * k; view.cy += (hp[1] - 50 - view.cy) * k; }
    S.setView(view.cx, view.cy, vw, vw / view.aspect);
    view.cx = S.view.cx; view.cy = S.view.cy;
    S.update(t, dt);
    S.render();
    if (sayTimer > 0) { sayTimer -= dt; if (sayTimer <= 0) $('#say').setAttribute('data-off', ''); }
    frames++; fpsT += dt; if (fpsT > 1) { fps = frames / fpsT; frames = 0; fpsT = 0; const I = S.renderer.info.render; $('#stats').textContent = Math.round(fps) + ' frames a second · ' + I.calls + ' draw calls · ' + Math.round(I.triangles / 1000) + 'k triangles'; }
  }
  say('Tap the ground to walk. Tap the fire ring, the shelter, the woodpile or the crates to use them.', 7);
  requestAnimationFrame(frame);
  window.READY = true;
})().catch(e => { window.ERR = String(e && e.stack || e); const l = document.getElementById('loading'); if (l) { l.hidden = false; l.textContent = 'Could not paint the camp: ' + (e && e.message || e); } });
