// ranch.js: the ranch seen from the sky, in 3D. three.js r128 (global THREE), the cartoon cattle (zebu.js, zebu-moves.js,
// zebu-hd.js), the land (ranch-land.js, through animal-3d-models/viewer/land-kit.js and cinema.js) and map/trace.js.
//
// The painted map lies flat as the ground. Zoomed out you look straight down at it, just as it was painted; zoom in and the
// view tips over, the painting turns into real ground (turf, dirt, furrows, gravel, water, with grass growing round where
// you look), and the trees, buildings, fences, the railroad and the things of the day's work stand up out of it around you
// (the way the towns stand up off the world map in What the Map Forgot). The land is drawn for real, the way envoi's
// Colossus in the Meadow draws its meadow; Henry, the herd and the chickens are soft cartoons (Chris, October 4, 2026). The
// herd walks the cow trails, grazes, lies down, and comes to the hay ring and the troughs when you put out hay and fill them.
//
// Map pixels are those of the 1024 x 1536 map (x across, y down); 1 map pixel is 0.3 m. In the world, x is east, z is
// south, y is up. window.RANCH is the page's handle for the checks (tools/ranch-check.mjs).
(function () {
  'use strict';
  const T = window.RANCH_TRACE, MPP = 0.3, PI = Math.PI, TAU = PI * 2;
  const WX = (T.mapW / 2) * MPP, WZ = (T.mapH / 2) * MPP;
  const toW = (mx, my) => ({x: (mx - T.mapW / 2) * MPP, z: (my - T.mapH / 2) * MPP});
  const toM = (x, z) => ({x: x / MPP + T.mapW / 2, y: z / MPP + T.mapH / 2});
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v), lerp = (a, b, t) => a + (b - a) * t, ease = t => t * t * (3 - 2 * t);
  const sstep = (a, b, x) => ease(cl((x - a) / (b - a), 0, 1));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const $ = id => document.getElementById(id);

  // ---------- renderer, scene, and the land ----------
  const canvas = $('view');
  const renderer = new THREE.WebGLRenderer({canvas, antialias: false, powerPreference: 'high-performance'});   // the film camera does its own smoothing
  renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
  const scene = new THREE.Scene();
  const land = makeRanchLand(renderer, scene, T);
  renderer.info.autoReset = false;   // a frame is several passes through the film camera; count them all
  const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 4000);

  // ---------- the painted ground ----------
  // six pieces, each 512 map pixels square
  const art = window.RANCH_ART || {};
  const loader = new THREE.TextureLoader();
  let tilesLoaded = 0;
  const tileTex = [];
  for (let i = 0; i < 6; i++) { const tex = loader.load(art['tile' + i] || `map/tiles/${i}.webp`, () => { tilesLoaded++; }); tileTex.push(tex); land.groundTile(i, tex); }

  // a soft round shadow on the ground, under the animals (the sun's own shadows are sharp only near where you look)
  const blobTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 2, 32, 32, 31); r.addColorStop(0, 'rgba(14,16,8,0.5)'); r.addColorStop(1, 'rgba(14,16,8,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const blobMat = new THREE.MeshBasicMaterial({map: blobTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2});
  function blob(w, l) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), blobMat); m.rotation.x = -PI / 2; m.position.y = 0.03; m.renderOrder = 2; return m; }

  // ---------- things that pop up ----------
  // Each pops up out of the ground when the view is close enough and near it, and sinks back when you pull away.
  const POPS = [];
  function popper(obj, x, z, opt) { opt = opt || {}; const p = {obj, x, z, r: opt.r || 0, s: 0, v: 0, on: false, always: !!opt.always, delay: 0}; obj.scale.set(1, 0.001, 1); obj.visible = false; scene.add(obj); POPS.push(p); return p; }
  function stepPops(dt, near, cx, cz, radius) {
    for (const p of POPS) {
      const d = Math.hypot(p.x - cx, p.z - cz), want = p.always || (near && d < radius && !(p.r && view.follow && inTheWay(p)));
      if (want !== p.on) { p.on = want; p.delay = want ? d / radius * 0.45 + Math.random() * 0.08 : Math.random() * 0.1; }
      if (p.delay > 0) { p.delay -= dt; continue; }
      const goal = p.on ? 1 : 0;
      p.v += ((goal - p.s) * 120 - p.v * 13) * dt; p.s += p.v * dt;     // a springy pop with a little overshoot
      if (!p.on && p.s < 0.02) { p.s = 0; p.v = 0; }
      p.obj.visible = p.s > 0.01; p.obj.scale.set(cl(0.35 + p.s * 0.65, 0, 1.2), Math.max(0.001, p.s), cl(0.35 + p.s * 0.65, 0, 1.2));
    }
  }

  // ---------- the painted trees, standing up ----------
  // each a tree of leaves on branches, its green taken from the painting under it (ranch-land.js)
  const TREES = land.trees.list;
  // close in, trees between the camera and the animal (or the spot you are looking at) step out of the way
  function inTheWay(t) {
    if (!view.follow && view.d > 80) return false;
    const ax = camera.position.x, az = camera.position.z, bx = view.follow ? view.follow.x : view.x, bz = view.follow ? view.follow.zz : view.z, dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz || 1;
    const u = cl(((t.x - ax) * dx + (t.z - az) * dz) / L, 0, 1); return Math.hypot(ax + dx * u - t.x, az + dz * u - t.z) < (t.r || 0) + 1.5;
  }
  function stepTrees(dt, near, cx, cz, radius) {
    land.trees.begin();
    for (let i = 0; i < TREES.length; i++) {
      const t = TREES[i], d = Math.hypot(t.x - cx, t.z - cz), want = near && d < radius && !inTheWay(t);
      if (want !== t.on) { t.on = want; t.delay = want ? d / radius * 0.5 + t.seed * 0.12 : t.seed * 0.15; }
      if (t.delay > 0) { t.delay -= dt; if (t.s === 0) continue; }
      else if (t.s !== 0 || t.v !== 0 || t.on) {
        const goal = t.on ? 1 : 0; t.v += ((goal - t.s) * 110 - t.v * 12) * dt; t.s += t.v * dt;
        if (!t.on && t.s < 0.02) { t.s = 0; t.v = 0; }
        if (t.on && Math.abs(t.s - 1) < 0.002 && Math.abs(t.v) < 0.01) { t.s = 1; t.v = 0; }
      }
      if (t.s > 0) land.trees.put(t, t.s, camera.position);
    }
    land.trees.end();
  }

  // ---------- buildings, fences and the railroad (ranch-land.js) ----------
  T.buildings.forEach((b, i) => { const B = land.building(b, i); popper(B.group, B.x, B.z, {r: B.r}); });
  T.fences.forEach(f => land.fence(f).forEach(c => popper(c.group, c.x, c.z)));
  land.railroad().forEach(c => popper(c.group, c.x, c.z));

  // ---------- the day's work: the hay ring, the troughs, the salt, the coop ----------
  const PL = {}; for (const k in T.places) { const p = T.places[k], w = toW(p.x, p.y); PL[k] = {label: p.label, mx: p.x, my: p.y, x: w.x, z: w.z}; }
  // the hay ring: a round bale stood on end inside a steel ring feeder
  const HR = land.hayRing(), hayRing = HR.group, bale = HR.bale; hayRing.position.set(PL.hay.x, 0, PL.hay.z);
  popper(hayRing, PL.hay.x, PL.hay.z);
  // two round galvanized stock tanks
  const troughs = [];
  for (let i = 0; i < 2; i++) {
    const tr = land.trough(), g = tr.group, x = PL.troughs.x + (i ? 2.6 : -0.4), z = PL.troughs.z + (i ? 0.6 : -0.6); g.position.set(x, 0, z);
    popper(g, x, z); troughs.push({g, water: tr.water, x, z, level: 0.15});
  }
  // a salt block on a stump of post
  const salt = land.salt().group; salt.position.set(PL.salt.x, 0, PL.salt.z);
  const saltPop = popper(salt, PL.salt.x, PL.salt.z); salt.userData.out = false;

  // ---------- the chickens ----------
  function makeChicken(hen) { const c = land.chicken(hen); c.root.add(blob(0.35, 0.4)); return c; }
  const CHICKENS = [];
  for (let i = 0; i < 7; i++) { const c = makeChicken(i % 3 === 0); c.root.visible = false; scene.add(c.root); CHICKENS.push(Object.assign(c, {x: PL.coop.x, z: PL.coop.z, h: rnd(0, TAU), tx: 0, tz: 0, t: rnd(0, 2), mode: 'in', ph: rnd(0, TAU)})); }
  let feed = null;

  // ---------- walking: the trace's grid and A* over it ----------
  const GW = T.w, GH = T.h, open = c => c === 't' || c === 'g';
  const cellOf = (x, z) => { const m = toM(x, z); return cl(Math.floor(m.y / T.cell), 0, GH - 1) * GW + cl(Math.floor(m.x / T.cell), 0, GW - 1); };
  const cellW = i => toW((i % GW) * T.cell + T.cell / 2, ((i / GW) | 0) * T.cell + T.cell / 2);
  function nearestOpen(i) { if (open(T.grid[i])) return i; const seen = new Set([i]), q = [i]; for (let h = 0; h < q.length && h < 4000; h++) { const c = q[h], x = c % GW, y = (c / GW) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, j = ny * GW + nx; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH || seen.has(j)) continue; if (open(T.grid[j])) return j; seen.add(j); q.push(j); } } return i; }
  // the open ground the herd can reach from the hay ring
  const herdLand = new Uint8Array(GW * GH);
  { const s = nearestOpen(cellOf(PL.hay.x, PL.hay.z)), q = [s]; herdLand[s] = 1; for (let h = 0; h < q.length; h++) { const c = q[h], x = c % GW, y = (c / GW) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, j = ny * GW + nx; if (nx >= 0 && ny >= 0 && nx < GW && ny < GH && !herdLand[j] && open(T.grid[j])) { herdLand[j] = 1; q.push(j); } } } }
  const herdCells = []; for (let i = 0; i < herdLand.length; i++) if (herdLand[i]) herdCells.push(i);
  const COST = {t: 1, g: 1.7};
  function route(from, to) {
    from = nearestOpen(from); to = nearestOpen(to);
    const g = new Float32Array(GW * GH).fill(Infinity), came = new Int32Array(GW * GH).fill(-1), heap = [], tx = to % GW, ty = (to / GW) | 0;
    const hfn = i => { const dx = Math.abs(i % GW - tx), dy = Math.abs(((i / GW) | 0) - ty); return (Math.max(dx, dy) + 0.414 * Math.min(dx, dy)); };
    const push = (i, f) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
    g[from] = 0; push(from, hfn(from)); let n = 0;
    while (heap.length && n++ < 60000) {
      const [, c] = pop(); if (c === to) break;
      const x = c % GW, y = (c / GW) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
        const j = ny * GW + nx, cj = T.grid[j]; if (!open(cj)) continue;
        if (dx && dy && (!open(T.grid[y * GW + nx]) || !open(T.grid[ny * GW + x]))) continue;
        const ng = g[c] + COST[cj] * (dx && dy ? 1.414 : 1); if (ng < g[j]) { g[j] = ng; came[j] = c; push(j, ng + hfn(j)); }
      }
    }
    if (came[to] < 0 && to !== from) return null;
    const path = []; for (let c = to; c >= 0 && c !== from; c = came[c]) path.push(cellW(c)); path.reverse();
    // smooth the steps into a gentle line
    for (let k = 0; k < 2; k++) for (let i = 1; i < path.length - 1; i++) { path[i] = {x: (path[i - 1].x + path[i].x * 2 + path[i + 1].x) / 4, z: (path[i - 1].z + path[i].z * 2 + path[i + 1].z) / 4}; }
    return path;
  }

  // ---------- the herd ----------
  const ABOUT = {
    henry: 'The white Zebu bull, the head of the herd: where he goes, the others follow. His left horn is whole; his right horn is broken off short.',
    'tan-cow': 'A tan cow with long horns that sweep up.',
    'black-cow': 'A black cow. She likes the shade.',
    'red-brown-cow': 'A red-brown cow with short, curved horns.',
    'speckled-cow': 'A cow speckled tan and white, with long curved horns.',
    calf: 'A young black calf. She stays near the herd.'
  };
  const HERD = [];
  const startCells = herdCells.filter(i => { const w = cellW(i); return Math.hypot(w.x - PL.hay.x, w.z - PL.hay.z) < 85 && Math.hypot(w.x - PL.hay.x, w.z - PL.hay.z) > 22; });
  for (const k of ['henry', 'tan-cow', 'black-cow', 'red-brown-cow', 'speckled-cow', 'calf']) {
    // the soft cartoon look (zebu-hd.js), light enough for the whole herd
    const z = makeZebuHD(k, {style: 'storybook', shade: 'soft', detail: 0.45}), w = cellW(startCells[(Math.random() * startCells.length) | 0]);
    z.root.traverse(m => { if (m.isMesh) m.castShadow = true; });
    const shadow = blob(1.6, 2.9); z.root.add(shadow);
    scene.add(z.root);
    const cow = {key: k, name: z.look.name, z, x: w.x, zz: w.z, h: rnd(0, TAU), turn: 0, path: null, pi: 0, speed: 0, want: 0, mode: 'graze', timer: rnd(3, 20), goal: null, slot: 0, thirst: rnd(0.3, 1), held: 0, seen: false, fidget: rnd(4, 20)};
    z.act('graze'); HERD.push(cow);
  }
  // the calf keeps near the black cow, as a calf does with its mother
  const mother = HERD.find(c => c.key === 'black-cow'), calf = HERD.find(c => c.key === 'calf'), leader = HERD[0];
  // the herd starts out round Henry
  HERD.forEach((c, i) => { if (i) { const w = cellW(nearestOpen(cellOf(leader.x + rnd(-10, 10), leader.zz + rnd(-10, 10)))); c.x = w.x; c.zz = w.z; } });
  calf.x = mother.x + 3; calf.zz = mother.zz + 2;
  function goTo(cow, x, z, speed) {
    const p = route(cellOf(cow.x, cow.zz), cellOf(x, z)); if (!p || !p.length) return false;
    p.push({x, z}); cow.path = p; cow.pi = 0; cow.want = speed || 1.1; if (cow.z.state !== 'stand') cow.z.act('stand'); return true;
  }
  // Henry leads: he picks where to go, and the others graze their way after him (the calf stays by its mother)
  function wander(cow, far) {
    const lead = cow === calf ? mother : cow === leader ? null : leader;
    let cx = cow.x, cz = cow.zz, R = far || 30;
    if (lead) { const g = lead.path ? lead.path[lead.path.length - 1] : {x: lead.x, z: lead.zz}; cx = g.x; cz = g.z; R = cow === calf ? 5 : 14; }
    else if (!far && Math.random() < 0.35) R = 55;   // now and then Henry sets off somewhere new
    const near = herdCells.filter(i => { const w = cellW(i), d = Math.hypot(w.x - cx, w.z - cz), m = Math.hypot(w.x - cow.x, w.z - cow.zz); return d < R && (lead ? d > 3 : d > 6) && m > 3 && (T.grid[i] === 'g' || Math.random() < 0.3); });
    if (!near.length) return; const w = cellW(near[(Math.random() * near.length) | 0]);
    const dist = Math.hypot(w.x - cow.x, w.z - cow.zz);
    goTo(cow, w.x, w.z, far || dist > 20 ? 1.1 : 0.55);
    if (cow === leader) cow.led = 0;
  }
  let hayLeft = 0, waterOn = false;
  function slotAround(x, z, n, r) { return {x: x + Math.cos(n) * r, z: z + Math.sin(n) * r}; }
  // things a cow does now and then while she stands about or grazes
  const FIDGETS = ['swat', 'swat', 'shake', 'lick', 'lick', 'moo', 'stretch'];
  function stepCow(cow, dt) {
    const Z = cow.z, h0 = cow.h, free = Z.state === 'stand';   // she walks only once she is up and standing
    if (cow.held > 0) cow.held -= dt;
    if (cow.path) {
      const p = cow.path[cow.pi], dx = p.x - cow.x, dz = p.z - cow.zz, d = Math.hypot(dx, dz);
      if (d < (cow.pi === cow.path.length - 1 ? 0.35 : 1.4)) { cow.pi++; if (cow.pi >= cow.path.length) { cow.path = null; cow.want = 0; arrive(cow); } }
      else {
        const want = Math.atan2(dx, dz); let dh = ((want - cow.h + PI) % TAU + TAU) % TAU - PI;
        if (free) cow.h += cl(dh, -1.6 * dt, 1.6 * dt);
        const turnSlow = 1 - cl(Math.abs(dh) / 1.6, 0, 0.85);
        cow.speed += ((free ? cow.want * turnSlow : 0) - cow.speed) * Math.min(1, dt * 2);
      }
    } else cow.speed += (0 - cow.speed) * Math.min(1, dt * 3);
    cow.x += Math.sin(cow.h) * cow.speed * dt; cow.zz += Math.cos(cow.h) * cow.speed * dt;
    // keep a little room between animals
    for (const o of HERD) if (o !== cow) { const dx = cow.x - o.x, dz = cow.zz - o.zz, d = Math.hypot(dx, dz), m = (cow.z.look.size + o.z.look.size) * 1.1; if (d < m && d > 0.01) { const k = (m - d) * 0.5 * Math.min(1, dt * 4); cow.x += dx / d * k; cow.zz += dz / d * k; } }
    if (cow !== leader && !cow.path && cow.held <= 0 && (cow.mode === 'graze' || cow.mode === 'walk') && !/lie|sleep|lying|getting/.test(cow.z.state)) {
      const lead = cow === calf ? mother : leader;
      if (Math.hypot(lead.x - cow.x, lead.zz - cow.zz) > (cow === calf ? 8 : 22)) { wander(cow); cow.timer = rnd(6, 14); }
    }
    if (!cow.path && cow.held <= 0) {
      cow.timer -= dt;
      if (cow.mode === 'hay') { if (hayLeft <= 0) { cow.mode = 'graze'; cow.timer = rnd(2, 8); Z.act('stand'); } else { faceTo(cow, PL.hay.x, PL.hay.z, dt); hayLeft -= dt * 0.0016; } }
      else if (cow.mode === 'drink') { faceTo(cow, cow.goal.x, cow.goal.z, dt); cow.thirst -= dt * 0.08; if (cow.thirst <= 0) { cow.mode = 'graze'; cow.timer = rnd(2, 6); Z.act('stand'); } }
      else if (cow.timer <= 0) {
        if (hayLeft > 0 && Math.random() < 0.9) callToHay(cow);
        else if (waterOn && cow.thirst > 0.5) callToWater(cow);
        else if (Z.state === 'lie') { Z.act('graze'); cow.timer = rnd(20, 50); }
        else if (Math.random() < 0.12 && cow !== calf) { Z.act('lie'); cow.timer = rnd(40, 90); }
        else if (Math.random() < 0.55) { wander(cow); cow.timer = rnd(8, 25); }
        else { Z.act(Math.random() < 0.8 ? 'graze' : 'stand'); cow.timer = rnd(6, 18); }
      }
    }
    cow.thirst = Math.min(1, cow.thirst + dt * 0.004);
    // now and then she swats a fly, shakes her head, licks her nose or moos
    cow.fidget -= dt;
    if (cow.fidget <= 0) { cow.fidget = rnd(8, 30); if (!cow.path && !Z.busy && (Z.state === 'stand' || Z.state === 'graze')) Z.play(FIDGETS[(Math.random() * FIDGETS.length) | 0]); }
    cow.turn = dt > 0 ? (((cow.h - h0 + PI) % TAU + TAU) % TAU - PI) / dt : 0;
    Z.root.position.set(cow.x, 0, cow.zz); Z.root.rotation.y = cow.h;
    Z.update(dt, clock, {speed: cow.speed, turn: cl(cow.turn, -2, 2)});
    Z.events.length = 0;   // steps, moos and thumps, for sounds the ranch doesn't make yet
  }
  function faceTo(cow, x, z, dt) { const want = Math.atan2(x - cow.x, z - cow.zz); let dh = ((want - cow.h + PI) % TAU + TAU) % TAU - PI; cow.h += cl(dh, -0.8 * dt, 0.8 * dt); }
  function arrive(cow) {
    if (cow.goal === 'hay' && hayLeft > 0) { cow.mode = 'hay'; cow.z.act('graze'); }
    else if (cow.goal && cow.goal.trough) { cow.mode = 'drink'; cow.z.act('graze'); }
    else { cow.mode = 'graze'; cow.z.act(Math.random() < 0.7 ? 'graze' : 'stand'); cow.timer = rnd(6, 16); }
    cow.goal = null;
  }
  function callToHay(cow, i) {
    i = i == null ? HERD.indexOf(cow) : i; const s = slotAround(PL.hay.x, PL.hay.z, i / HERD.length * TAU + 0.4, cow === calf ? 2.9 : 2.25);
    if (goTo(cow, s.x, s.z, 1.15)) { cow.goal = 'hay'; cow.mode = 'walk'; }
  }
  function callToWater(cow) {
    const t = troughs[(Math.random() * 2) | 0], s = slotAround(t.x, t.z, rnd(0, TAU), 1.9);
    if (goTo(cow, s.x, s.z, 1.0)) { cow.goal = {trough: true, x: t.x, z: t.z}; cow.mode = 'walk'; }
  }

  // ---------- the chickens' day ----------
  function stepChickens(dt) {
    for (const c of CHICKENS) {
      if (c.mode === 'in') continue;
      if (c.wait > 0) { c.wait -= dt; continue; }
      c.root.visible = true;
      c.t -= dt; const dx = c.tx - c.x, dz = c.tz - c.z, d = Math.hypot(dx, dz), moving = d > 0.15;
      if (c.t <= 0 || !moving) {
        if (c.t <= 0) { const cx = feed ? feed.x : PL.coop.x, cz = feed ? feed.z : PL.coop.z + 2.5, r = feed ? 1.3 : 6; c.tx = cx + rnd(-r, r); c.tz = cz + rnd(-r * 0.6, r); c.t = rnd(1.5, 5); }
      }
      if (moving) { c.h = Math.atan2(dx, dz); const sp = Math.min(d * 2, 1.1); c.x += Math.sin(c.h) * sp * dt; c.z += Math.cos(c.h) * sp * dt; c.ph += dt * 18; }
      c.root.position.set(c.x, 0, c.z); c.root.rotation.y = c.h;
      c.body.position.y = 0.22 + (moving ? Math.abs(Math.sin(c.ph)) * 0.03 : 0);
      c.legs[0].rotation.x = moving ? Math.sin(c.ph) * 0.6 : 0; c.legs[1].rotation.x = moving ? -Math.sin(c.ph) * 0.6 : 0;
      const peck = !moving ? Math.max(0, Math.sin(clock * 6 + c.ph)) : 0;
      c.head.position.set(0, 0.13 - peck * 0.15, 0.11 + peck * 0.06); c.head.rotation.x = peck * 1.1;
    }
  }

  // ---------- the camera ----------
  // Zoomed out it looks straight down; closer in, it tips over to look across the ground.
  const view = {x: 0, z: 0, d: 900, yaw: 0, follow: null};
  let FAR = 980; const NEAR_MAP = 22, NEAR_COW = 5.5;
  // far enough out to see the whole ranch on this screen
  function fitAll() { const t = Math.tan(camera.fov / 2 * PI / 180); return Math.max(WX / (t * camera.aspect), WZ / t) * 1.06; }
  let fly = null;
  function pitchFor(d) { return view.follow ? lerp(0.32, 0.95, sstep(5, 45, d)) : lerp(0.72, 1.5, sstep(40, FAR * 0.75, d)); }
  function placeCamera() {
    const p = pitchFor(view.d), h = Math.sin(p) * view.d, back = Math.cos(p) * view.d, ty = view.follow ? 0.9 : 0;
    camera.position.set(view.x + Math.sin(view.yaw) * back, ty + h, view.z + Math.cos(view.yaw) * back);
    camera.up.set(-Math.sin(view.yaw), 0, -Math.cos(view.yaw)).lerp(new THREE.Vector3(0, 1, 0), p < 1.45 ? 1 : 0);
    camera.lookAt(view.x, ty, view.z);
    camera.near = Math.max(0.2, view.d * 0.02); camera.far = view.d * 4 + 600; camera.updateProjectionMatrix();
  }
  function flyTo(x, z, d, yaw) { fly = {t: 0, from: {x: view.x, z: view.z, d: view.d, yaw: view.yaw}, to: {x, z, d, yaw: yaw == null ? view.yaw : yaw}}; }
  function clampView() { view.x = cl(view.x, -WX, WX); view.z = cl(view.z, -WZ, WZ); view.d = cl(view.d, view.follow ? NEAR_COW : NEAR_MAP, view.follow ? 45 : FAR); }
  // where on the ground a point of the screen lands
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  function groundAt(sx, sy) { const r = canvas.getBoundingClientRect(); ndc.set((sx - r.left) / r.width * 2 - 1, -(sy - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, camera); return ray.ray.intersectPlane(groundPlane, hit) ? hit.clone() : null; }

  // ---------- touch and mouse ----------
  const ptrs = new Map(); let gesture = null, downAt = null;
  canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, {x: e.clientX, y: e.clientY}); fly = null; startGesture(); if (ptrs.size === 1) downAt = {x: e.clientX, y: e.clientY, t: performance.now()}; else downAt = null; hideHint(); });
  canvas.addEventListener('pointermove', e => { if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, {x: e.clientX, y: e.clientY}); moveGesture(); });
  const up = e => { if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId); if (downAt && ptrs.size === 0 && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 10 && performance.now() - downAt.t < 450) tap(e.clientX, e.clientY); startGesture(); };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', e => { e.preventDefault(); fly = null; view.d *= Math.exp(e.deltaY * 0.0015); clampView(); hideHint(); }, {passive: false});
  function startGesture() {
    const P = [...ptrs.values()];
    if (P.length === 1) gesture = {one: true, x: P[0].x, y: P[0].y, grab: groundAt(P[0].x, P[0].y), yaw: view.yaw, d: view.d};
    else if (P.length >= 2) { const [a, b] = P; gesture = {one: false, dist: Math.hypot(b.x - a.x, b.y - a.y), ang: Math.atan2(b.y - a.y, b.x - a.x), d: view.d, yaw: view.yaw}; }
    else gesture = null;
  }
  function moveGesture() {
    const P = [...ptrs.values()]; if (!gesture) return;
    if (gesture.one && P.length === 1) {
      if (view.follow) { view.yaw = gesture.yaw - (P[0].x - gesture.x) * 0.01; view.d = cl(gesture.d * Math.exp((P[0].y - gesture.y) * 0.004), NEAR_COW, 45); }
      else if (gesture.grab) { placeCamera(); const now = groundAt(P[0].x, P[0].y); if (now) { view.x += gesture.grab.x - now.x; view.z += gesture.grab.z - now.z; clampView(); } }
    } else if (!gesture.one && P.length >= 2) {
      const [a, b] = P, dist = Math.hypot(b.x - a.x, b.y - a.y), ang = Math.atan2(b.y - a.y, b.x - a.x);
      view.d = gesture.d * gesture.dist / Math.max(20, dist); view.yaw = gesture.yaw + (ang - gesture.ang); clampView();
    }
  }
  function tap(sx, sy) {
    // a cow under the finger?
    let best = null, bd = 42;
    for (const c of HERD) { const v = new THREE.Vector3(c.x, 1.0 * c.z.root.scale.y, c.zz).project(camera); if (v.z > 1) continue; const r = canvas.getBoundingClientRect(), px = (v.x + 1) / 2 * r.width + r.left, py = (1 - v.y) / 2 * r.height + r.top, d = Math.hypot(px - sx, py - sy); if (d < bd) { bd = d; best = c; } }
    if (best) { lookAt(best); return; }
  }

  // ---------- signs over the places, and names over the cattle ----------
  const signBox = $('signs'), SIGNS = [];
  function sign(text, cls, onTap, world) {
    const pin = document.createElement('div'), b = document.createElement('button'); pin.className = 'pin'; b.className = 'sign off ' + (cls || ''); b.textContent = text;
    b.addEventListener('click', e => { e.stopPropagation(); onTap(); }); pin.appendChild(b); signBox.appendChild(pin);
    const s = {pin, b, world, shown: false}; SIGNS.push(s); return s;
  }
  const placeSigns = {};
  for (const k of ['hay', 'troughs', 'coop', 'pens', 'fence', 'pond', 'barn', 'house']) placeSigns[k] = sign(PL[k].label, '', () => openPlace(k), () => ({x: PL[k].x, y: k === 'fence' ? 2 : 4.5, z: PL[k].z, range: k === 'fence' ? 600 : 420}));
  placeSigns.salt = sign('Salt', '', () => openPlace('salt'), () => ({x: PL.salt.x, y: 2, z: PL.salt.z, range: salt.userData.out ? 300 : 0}));
  for (const c of HERD) c.sign = sign(c.name, 'cow', () => lookAt(c), () => ({x: c.x, y: (/lie|sleep/.test(c.z.state) ? 1.1 : 1.75) * c.z.root.scale.y, z: c.zz, range: 160}));
  const V = new THREE.Vector3();
  function stepSigns() {
    const r = canvas.getBoundingClientRect();
    for (const s of SIGNS) {
      const w = s.world(); V.set(w.x, w.y, w.z); const dist = camera.position.distanceTo(V);
      V.project(camera);
      const show = V.z < 1 && Math.abs(V.x) < 1.1 && Math.abs(V.y) < 1.1 && dist < w.range && !(view.follow && s.b.classList.contains('cow'));
      const x = (V.x + 1) / 2 * r.width, y = (1 - V.y) / 2 * r.height;
      if (show || s.shown) s.pin.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      if (show !== s.shown) { s.shown = show; s.b.classList.toggle('off', !show); }
    }
  }

  // ---------- today's work ----------
  const JOBS = [
    {id: 'hay', what: 'Feed the herd a bale of hay', how: 'Tap the Hay ring sign by the farmyard.'},
    {id: 'water', what: 'Fill the water troughs', how: 'Tap the Water troughs sign, up by the house in the bottom-left corner.'},
    {id: 'chickens', what: 'Let the chickens out and feed them', how: 'Tap the Chicken coop sign, by the same house.'},
    {id: 'look', what: 'Look the cattle over', how: 'Tap each animal to look at it up close.'}
  ];
  const done = {};
  function renderToday() {
    const n = JOBS.filter(j => done[j.id]).length; $('todayCount').textContent = `${n} of ${JOBS.length}`;
    $('todayList').innerHTML = JOBS.map(j => `<li class="${done[j.id] ? 'done' : ''}"><span class="box"></span><span><span class="what">${j.what}${j.id === 'look' ? ` (${HERD.filter(c => c.seen).length} of ${HERD.length})` : ''}</span><span class="how">${j.how}</span></span></li>`).join('');
    placeSigns.hay.b.classList.toggle('done', !!done.hay); placeSigns.troughs.b.classList.toggle('done', !!done.water); placeSigns.coop.b.classList.toggle('done', !!done.chickens);
  }
  function finish(id) { if (!done[id]) { done[id] = true; renderToday(); } }
  $('todayBtn').addEventListener('click', () => { const t = $('today'), open = t.hidden; t.hidden = !open; $('todayBtn').setAttribute('aria-expanded', String(open)); });

  // ---------- the sheet at the bottom ----------
  let sheetFor = null;
  function sheet(title, text, buttons) {
    $('sheetTitle').textContent = title; $('sheetText').textContent = text; const box = $('sheetBtns'); box.innerHTML = '';
    for (const b of buttons) { const el = document.createElement('button'); el.textContent = b.label; if (b.main) el.className = 'main'; if (b.disabled) el.disabled = true; if (b.pressed != null) el.setAttribute('aria-pressed', String(!!b.pressed)); el.addEventListener('click', b.go); box.appendChild(el); }
    $('sheet').hidden = false; $('hint').classList.add('gone');
  }
  function closeSheet() { $('sheet').hidden = true; sheetFor = null; if (view.follow) { view.follow = null; flyTo(view.x, view.z, 70, view.yaw); } }
  $('sheetClose').addEventListener('click', closeSheet);
  function openPlace(k) {
    const p = PL[k]; view.follow = null; sheetFor = k; $('today').hidden = true;
    // the coop is looked at from the north-east, so the house doesn't stand in front of the chickens
    if (k === 'coop') flyTo(p.x + 2, p.z + 2, 30, 2.4); else flyTo(p.x, p.z + 4, k === 'fence' ? 120 : 34);
    if (k === 'hay') sheet('Hay ring', hayLeft > 0 ? 'There is hay in the ring. The herd will eat at it until it is gone.' : 'The herd comes here for hay. Bring a round bale over with the tractor and drop it in the ring.', [
      {label: hayLeft > 0 ? 'Hay is out' : 'Put out a bale', main: true, disabled: hayLeft > 0, go: () => { putOutHay(); openPlace('hay'); }}]);
    else if (k === 'troughs') sheet('Water troughs', waterOn ? 'The troughs are full. Thirsty cattle will come and drink.' : 'Two round troughs. They are low. Run the hose and fill them up.', [
      {label: waterOn ? 'Full' : 'Fill the troughs', main: true, disabled: waterOn, go: () => { fillTroughs(); openPlace('troughs'); }}]);
    else if (k === 'coop') { const out = CHICKENS[0].mode !== 'in'; sheet('Chicken coop', out ? (feed ? 'The chickens are out and pecking at their feed.' : 'The chickens are out. Scatter some feed for them.') : 'The chickens are still shut in for the night.', [
      {label: out ? 'They are out' : 'Let them out', main: !out, disabled: out, go: () => { letChickensOut(); openPlace('coop'); }},
      {label: feed ? 'Fed' : 'Scatter feed', main: out && !feed, disabled: !out || !!feed, go: () => { feedChickens(); openPlace('coop'); }}]); }
    else if (k === 'pens') sheet('Bull pens', 'Rowdy bulls are kept here and fed on their own. (Coming later.)', []);
    else if (k === 'fence') sheet('Fence line', 'The wire fence along the plowed field. Walking it and fixing it comes later.', []);
    else if (k === 'salt') sheet('Salt', 'A salt block, set out at the time of year the cattle need it.', []);
    else sheet(p.label, k === 'pond' ? 'The pond, with a little dock.' : k === 'barn' ? 'The big barn by the pond.' : 'One of the three homes on the ranch.', []);
  }
  function putOutHay() { hayLeft = 1; bale.visible = true; bale.scale.set(1, 1, 1); bale.position.y = 4; finish('hay'); HERD.forEach((c, i) => setTimeout(() => { if (c.held <= 0) callToHay(c, i); }, 400 + i * 700)); }
  function fillTroughs() { waterOn = true; finish('water'); HERD.forEach(c => { c.thirst = Math.max(c.thirst, 0.6); }); }
  function letChickensOut() { CHICKENS.forEach((c, i) => { c.mode = 'out'; c.wait = i * 0.3; c.x = PL.coop.x + rnd(-0.3, 0.3); c.z = PL.coop.z - 1; c.tx = c.x + rnd(-3, 3); c.tz = c.z + rnd(1.5, 5); c.t = rnd(1, 3); }); }
  function feedChickens() { feed = {x: PL.coop.x + 0.5, z: PL.coop.z + 3.2}; CHICKENS.forEach(c => { c.t = 0; }); finish('chickens'); const f = new THREE.Mesh(new THREE.CircleGeometry(1.4, 20), new THREE.MeshBasicMaterial({color: 0xd9b45a, transparent: true, opacity: 0.55, depthWrite: false})); f.rotation.x = -PI / 2; f.position.set(feed.x, 0.025, feed.z); scene.add(f); }

  function lookAt(cow) {
    view.follow = cow; sheetFor = cow; $('today').hidden = true;
    flyTo(cow.x, cow.zz, 11, cow.h + 0.65);
    if (!cow.seen) { cow.seen = true; if (HERD.every(c => c.seen)) finish('look'); else renderToday(); }
    cowSheet(cow);
  }
  function cowSheet(cow) {
    const Z = cow.z, s = Z.state, walking = !!cow.path;
    sheet(cow.name, ABOUT[cow.key] + ` Drag sideways to walk round ${cow.z.look.bull ? 'him' : 'her'}; drag up and down to come closer.`, [
      {label: 'Walk', pressed: walking, go: () => { cow.held = 30; wander(cow, 40); cow.mode = 'graze'; setTimeout(() => cowSheet(cow), 50); }},
      {label: 'Eat', pressed: !walking && s === 'graze', go: () => { cow.path = null; cow.held = 30; Z.act('graze'); setTimeout(() => cowSheet(cow), 50); }},
      {label: 'Lie down', pressed: s === 'lie' || s === 'lying-down', go: () => { cow.path = null; cow.held = 40; Z.act('lie'); setTimeout(() => cowSheet(cow), 50); }},
      {label: 'Stand', pressed: !walking && (s === 'stand' || s === 'getting-up'), go: () => { cow.path = null; cow.held = 30; Z.act('stand'); setTimeout(() => cowSheet(cow), 50); }},
      {label: 'Moo', go: () => { Z.lookAt(camera.position.clone(), 2.5); Z.play('moo'); }},
      {label: 'Back to the map', main: true, go: closeSheet}]);
  }

  // ---------- the bar ----------
  let timeScale = 1;
  $('speedBtn').addEventListener('click', () => { timeScale = timeScale === 1 ? 4 : 1; $('speedBtn').textContent = timeScale + '×'; $('speedBtn').setAttribute('aria-pressed', String(timeScale > 1)); });
  $('homeBtn').addEventListener('click', () => { $('sheet').hidden = true; view.follow = null; sheetFor = null; flyTo(0, 0, FAR, 0); });
  view.d = 1e9;
  let hinted = false; function hideHint() { if (!hinted) { hinted = true; setTimeout(() => $('hint').classList.add('gone'), 1500); } }

  // ---------- each frame ----------
  let clock = 0, wall = 0, last = performance.now(), frames = 0;
  function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; const wasFar = view.d >= FAR - 1; FAR = fitAll(); if (wasFar) view.d = FAR; frame.off = null; camera.clearViewOffset(); camera.updateProjectionMatrix(); }
  window.addEventListener('resize', resize); resize();
  // the world moves on by real seconds (time runs faster with the 1× button); drawing it is the film camera's
  function tick(real) {
    const dt = real * timeScale; clock += dt; wall += real;
    if (fly) { fly.t += real / 1.3; const k = ease(cl(fly.t, 0, 1)); view.x = lerp(fly.from.x, fly.to.x, k); view.z = lerp(fly.from.z, fly.to.z, k); view.d = Math.exp(lerp(Math.log(fly.from.d), Math.log(fly.to.d), k)); let dy = ((fly.to.yaw - fly.from.yaw + PI) % TAU + TAU) % TAU - PI; view.yaw = fly.from.yaw + dy * k; if (fly.t >= 1) fly = null; }
    for (const c of HERD) stepCow(c, dt);
    if (fly && view.follow) { fly.to.x = view.follow.x; fly.to.z = view.follow.zz; }
    if (view.follow && !fly) { view.x += (view.follow.x - view.x) * Math.min(1, real * 4); view.z += (view.follow.zz - view.z) * Math.min(1, real * 4); }
    clampView(); placeCamera();
    { const w = canvas.clientWidth, h = canvas.clientHeight, off = view.follow ? h * 0.16 : 0; if (off !== frame.off) { frame.off = off; if (off) camera.setViewOffset(w, h, 0, off, w, h); else camera.clearViewOffset(); } }
    // up close the cattle are their real size; far out they are drawn bigger so you can find them on the map
    const big = view.follow ? 1 : 1 + 4 * sstep(150, 750, view.d);
    for (const c of HERD) c.z.root.scale.setScalar(c.z.look.size * big);
    const near = view.d < 330, radius = cl(view.d * 1.35, 80, 260);
    stepPops(real, near, view.x, view.z, radius); stepTrees(real, near, view.x, view.z, radius);
    land.update(real, wall, camera, {x: view.x, z: view.z}, view.d, view.follow ? view.follow.z : null);
    // the hay bale drops into the ring, and is eaten down
    if (bale.visible) { bale.position.y = Math.max(0.65 * bale.scale.y, bale.position.y - real * 12); bale.scale.y = 0.15 + 0.85 * cl(hayLeft, 0, 1); if (hayLeft <= 0) bale.visible = false; }
    for (const t of troughs) { t.level += ((waterOn ? 0.55 : 0.15) - t.level) * Math.min(1, real * 0.6); t.water.position.y = t.level; }
    stepChickens(dt);
    // once the painting has loaded, the land takes its colors from it (the grass, the dirt, the water, the trees' green)
    if (tilesLoaded === 6 && !frame.tinted) { frame.tinted = true; land.setPaint(tileTex.map(t => t.image)); }
  }
  // a phone that can't keep up gets a lighter picture: first fewer pixels, then the film camera at a lower resolution
  const perf = {t: 0, n: 0, level: 0};
  function keepUp(real) {
    if (frames < 40 || navigator.webdriver || document.visibilityState !== 'visible') return;
    perf.t += real; perf.n++;
    if (perf.t < 3) return;
    const ms = perf.t / perf.n * 1000; perf.t = perf.n = 0;
    if (ms > 42 && perf.level < 2) { perf.level++; if (perf.level === 1) { renderer.setPixelRatio(1); resize(); } else land.lighter(); }
  }
  function frame(now) {
    const real = Math.min(0.1, (now - last) / 1000); last = now; frames++;
    keepUp(real);
    tick(real);
    renderer.info.reset(); land.render(camera, real, view.d);
    stepSigns();
    if (frames === 3) { $('loading').classList.add('gone'); window.READY = true; }
    requestAnimationFrame(frame);
  }
  renderToday(); setTimeout(() => $('hint').classList.add('gone'), 9000);
  window.RANCH = {
    HERD, PL, view, renderer, flyTo, openPlace, lookAt, putOutHay, fillTroughs, letChickensOut, feedChickens, done,
    get tilesLoaded() { return tilesLoaded; }, get hayLeft() { return hayLeft; },
    screenOf(x, y, z) { const v = new THREE.Vector3(x, y, z).project(camera), r = canvas.getBoundingClientRect(); return {x: (v.x + 1) / 2 * r.width + r.left, y: (1 - v.y) / 2 * r.height + r.top}; },
    land, camera, get clock() { return clock; }, perf,
    // for the checks: move the world on by some seconds without drawing each step (a computer with no graphics chip draws
    // this slowly)
    skip(seconds, fps) { fps = fps || 30; const n = Math.max(1, Math.round(seconds * fps)); for (let i = 0; i < n; i++) tick(1 / fps); },
    calls() { return renderer.info.render.calls; }, tris() { return renderer.info.render.triangles; }
  };
  try { requestAnimationFrame(frame); } catch (e) { window.ERR = String(e); }
  window.addEventListener('error', e => { window.ERR = String(e.message || e); });
})();
