// henry-motion.js: Henry in Motion. Henry as a cartoon (the storybook model, lit softly like a 3D cartoon film) or realistic
// (envoi's style), standing in the ranch pasture by day, at dusk or at night, with a button for everything he does, a
// camera that follows him round, and his sounds, all made in code.
// Needs three.js r128, cinema.js, zebu.js, zebu-moves.js, zebu-hd.js, land-kit.js, henry-meadow.js and henry-scenes.js.
//
// Opened with ?test, it doesn't run by itself: window.HM lets a check build either look, step time, play moves and take
// pictures (animal-3d-models/tools/henry-motion-check.mjs).
(function () {
  'use strict';
  const PI = Math.PI, TAU = PI * 2;
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v), lerp = (a, b, t) => a + (b - a) * t;
  const $ = id => document.getElementById(id);
  const TEST = /[?&]test\b/.test(location.search) || window.HM_TEST;
  const canvas = $('view');
  const renderer = new THREE.WebGLRenderer({canvas, antialias: true, powerPreference: 'high-performance'});
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 400);
  const Q = location.search + location.hash;
  let look = /[?&#](realistic|envoi)\b/.test(Q) ? 'realistic' : 'cartoon', place = null, henry = null, building = false, clock = 0;
  let time = /[?&#]dusk\b/.test(Q) ? 'dusk' : /[?&#]night\b/.test(Q) ? 'night' : 'day';   // the pasture's hour
  const TIMES = ['day', 'dusk', 'night'], TIME_NAME = {day: 'Day', dusk: 'Dusk', night: 'Night'};
  const toon = () => look === 'cartoon';

  // ---------- Henry's walk: round and round the trail ----------
  const H = {phi: 0, x: 0, z: 3.2, h: PI / 2, speed: 0, gait: null};
  const GAIT = {walk: () => (toon() ? 0.8 : 1.0), trot: () => (toon() ? 1.95 : 2.4)};
  // ---------- the camera: it goes round with him; drag to change where you stand ----------
  const view = {off: -0.9, pitch: 0.2, zoom: 1, face: false, yaw: 0, aim: new THREE.Vector3(0, 0.8, 3.2), lookAtMe: 0};

  function build(lk) {
    building = true; $('busy').hidden = false;
    return new Promise(res => setTimeout(() => {
      if (place) { place.dispose(); place = null; }
      if (henry) disposeDeep(henry.root);
      look = lk; document.body.dataset.style = toon() ? 'storybook' : 'envoi';   // the buttons dress like the storybook for the cartoon
      $('lookCartoon').setAttribute('aria-pressed', String(toon())); $('lookReal').setAttribute('aria-pressed', String(!toon()));
      $('hopBtn').textContent = toon() ? 'Hop' : 'Buck'; $('hopBtn').dataset.go = toon() ? 'hop' : 'buck';
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      place = makeHenryScene(renderer, {time, cartoon: toon()});
      henry = toon() ? makeZebuHD('henry', {style: 'storybook', shade: 'soft', detail: 0.9}) : makeZebuHD('henry', {style: 'envoi', detail: 1});
      place.scene.add(henry.root);
      H.gait = null; H.speed = 0; placeHenry(); henry.pose('stand');
      view.zoom = 1; view.yaw = H.h + view.off; view.aim.set(H.x, 0.8, H.z);
      view.pitch = 0.08;   // the camera stands low, so the trees and the sky show behind him
      resize(); building = false; $('busy').hidden = true; status(); sound.ambient(time); timeChip();
      res();
    }, 30));
  }
  // the pasture's hour: a sunny day, dusk, or night under the moon; only the pasture is drawn again, Henry stays as he is
  function setTime(t) {
    if (building || t === time || !TIMES.includes(t)) return Promise.resolve();
    building = true; $('busy').textContent = t === 'day' ? 'The sun is coming up…' : t === 'dusk' ? 'The sun is going down…' : 'The moon is coming up…'; $('busy').hidden = false;
    return new Promise(res => setTimeout(() => {
      time = t; place.scene.remove(henry.root); place.dispose();
      place = makeHenryScene(renderer, {time, cartoon: toon()}); place.scene.add(henry.root);
      building = false; $('busy').hidden = true; $('busy').textContent = 'Drawing Henry…'; timeChip(); sound.ambient(time); res();
    }, 30));
  }
  function timeChip() { const b = $('timeBtn'); b.textContent = TIME_NAME[time]; b.setAttribute('aria-label', 'Time of day: ' + b.textContent + '. Tap to change'); }
  // let go of a model's shapes, materials and pictures
  function disposeDeep(obj) {
    const mats = new Set();
    obj.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) for (const m of [].concat(o.material)) mats.add(m); if (o.skeleton && o.skeleton.boneTexture) o.skeleton.boneTexture.dispose(); });
    for (const m of mats) { for (const k in m) { const v = m[k]; if (v && v.isTexture) v.dispose(); } if (m.uniforms) for (const k in m.uniforms) { const v = m.uniforms[k] && m.uniforms[k].value; if (v && v.isTexture) v.dispose(); } m.dispose(); }
  }
  function placeHenry() { H.x = Math.sin(H.phi) * place.pathR; H.z = Math.cos(H.phi) * place.pathR; H.h = H.phi + PI / 2; henry.root.position.set(H.x, 0, H.z); henry.root.rotation.y = H.h; }

  // ---------- the buttons ----------
  const NEEDS_STILL = new Set(['paw', 'toss', 'buck', 'hop', 'stretch']);
  function go(what) {
    if (!henry || building) return;
    sound.wake();
    if (what === 'walk' || what === 'trot') { H.gait = H.gait === what ? null : what; if (H.gait) henry.act('stand'); }
    else if (what === 'graze' || what === 'lie' || what === 'sleep' || what === 'stand') { H.gait = null; henry.act(what); }
    else if (what === 'look') { henry.lookAt(camera.position, 4); view.lookAtMe = 4; }
    else if (what === 'face') { view.face = !view.face; }
    else { if (NEEDS_STILL.has(what)) H.gait = null; henry.play(what); if (what === 'swat' || what === 'shake') place.scatterFlies(); }
    hideHint(); status();
  }
  for (const b of document.querySelectorAll('[data-go]')) b.addEventListener('click', () => go(b.dataset.go));
  for (const b of document.querySelectorAll('[data-look]')) b.addEventListener('click', () => { if (b.dataset.look !== look && !building) build(b.dataset.look); });
  $('timeBtn').addEventListener('click', () => setTime(TIMES[(TIMES.indexOf(time) + 1) % TIMES.length]));
  $('soundBtn').addEventListener('click', () => { sound.toggle(); $('soundBtn').setAttribute('aria-pressed', String(sound.on)); $('soundBtn').textContent = sound.on ? 'Sound on' : 'Sound off'; });
  const WORDS = {stand: 'standing', graze: 'grazing', lie: 'lying down', sleep: 'asleep', 'lying-down': 'lying down', 'getting-up': 'getting up'};
  const DOING = {moo: 'mooing', shake: 'shaking off the flies', swat: 'swatting a fly', paw: 'pawing the ground', toss: 'tossing his horn', buck: 'bucking', hop: 'hopping', stretch: 'stretching', lick: 'licking his nose'};
  function status() {
    if (!henry) return;
    const playing = henry.moves.playing[0], s = henry.state;
    let t = playing ? DOING[playing] : H.gait && H.speed > 0.1 ? (H.gait === 'walk' ? 'walking' : 'trotting') : WORDS[s] || 'standing';
    if (s === 'graze' && !playing && henry.moves.want === 'graze') t = 'grazing';
    $('status').textContent = 'Henry is ' + t;
    for (const b of document.querySelectorAll('[data-go]')) {
      const g = b.dataset.go; let on = false;
      if (g === 'walk' || g === 'trot') on = H.gait === g; else if (g === 'face') on = view.face; else if (['graze', 'lie', 'sleep'].includes(g)) on = henry.moves.want === g; else on = henry.moves.playing.includes(g);
      b.setAttribute('aria-pressed', String(on));
    }
  }
  let hinted = false; function hideHint() { if (!hinted) { hinted = true; setTimeout(() => $('hint').classList.add('gone'), 2500); } }

  // ---------- touch: drag to walk round him, pinch to come closer, tap to pat ----------
  const ptrs = new Map(); let g0 = null, down = null, lastPat = -9;
  canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, {x: e.clientX, y: e.clientY}); startG(); down = ptrs.size === 1 ? {x: e.clientX, y: e.clientY, t: performance.now()} : null; sound.wake(); });
  canvas.addEventListener('pointermove', e => { if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, {x: e.clientX, y: e.clientY}); moveG(); });
  const up = e => { if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId); if (down && !ptrs.size && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 12 && performance.now() - down.t < 450) tap(e.clientX, e.clientY); startG(); };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', e => { e.preventDefault(); view.zoom = cl(view.zoom * Math.exp(e.deltaY * 0.0015), 0.35, 2.6); hideHint(); }, {passive: false});
  function startG() { const P = [...ptrs.values()]; g0 = P.length === 1 ? {x: P[0].x, y: P[0].y, off: view.off, pitch: view.pitch} : P.length >= 2 ? {d: Math.hypot(P[1].x - P[0].x, P[1].y - P[0].y), zoom: view.zoom} : null; }
  function moveG() { const P = [...ptrs.values()]; if (!g0) return; if (P.length === 1 && g0.off != null) { view.off = g0.off - (P[0].x - g0.x) * 0.008; view.pitch = cl(g0.pitch + (P[0].y - g0.y) * 0.005, -0.04, 1.15); hideHint(); } else if (P.length >= 2 && g0.d) { view.zoom = cl(g0.zoom * g0.d / Math.max(20, Math.hypot(P[1].x - P[0].x, P[1].y - P[0].y)), 0.35, 2.6); hideHint(); } }
  const tv = new THREE.Vector3();
  function screenOf(v) { const p = v.clone().project(camera), r = canvas.getBoundingClientRect(); return {x: (p.x + 1) / 2 * r.width + r.left, y: (1 - p.y) / 2 * r.height + r.top, behind: p.z > 1}; }
  function tap(x, y) {
    if (!henry) return;
    const hd = screenOf(henry.anchor('head', tv)), ch = screenOf(henry.anchor('chest', tv));
    const near = Math.min(hd.behind ? 1e9 : Math.hypot(hd.x - x, hd.y - y), ch.behind ? 1e9 : Math.hypot(ch.x - x, ch.y - y));
    if (near > Math.max(70, canvas.clientWidth * 0.16)) return;
    pat();
  }
  function pat() {
    henry.lookAt(camera.position, 3.5); view.lookAtMe = 3.5;
    const t = clock;
    if (t - lastPat < 1.8) henry.play('moo'); else { place.heart(henry.anchor('poll', new THREE.Vector3()).add(new THREE.Vector3(0, 0.3, 0))); sound.hum(); }
    lastPat = t; hideHint(); status();
  }

  // ---------- each frame ----------
  let zzzT = 0;
  function tick(dt) {
    clock += dt;
    // walking round the trail
    const want = H.gait && (henry.state === 'stand') && !henry.moves.busy ? GAIT[H.gait]() : 0;
    H.speed += (want - H.speed) * Math.min(1, dt * (want > H.speed ? 1.4 : 2.6));
    if (H.speed < 0.005 && !want) H.speed = 0;
    if (H.speed > 0) { H.phi += H.speed * dt / place.pathR; placeHenry(); }
    henry.update(dt, clock, {speed: H.speed, turn: H.speed / place.pathR});
    // what just happened: sounds, dust, bubbles
    for (const e of henry.events.splice(0)) {
      if (window.HM) { HM.log.push(e.type); if (HM.log.length > 400) HM.log.shift(); }
      if (e.type === 'moo') { sound.moo(e.dur || 1.4); const m = henry.anchor('mouth', new THREE.Vector3()); place.bubble('Moooo!', henry.anchor('poll', new THREE.Vector3()).lerp(m, 0.3).add(new THREE.Vector3(0, 0.45, 0))); setTimeout(() => place && henry && place.breath(henry.anchor('mouth', new THREE.Vector3()), new THREE.Vector3(Math.sin(H.h), 0.15, Math.cos(H.h))), 300); }
      else if (e.type === 'snort') { sound.snort(); place.breath(henry.anchor('mouth', new THREE.Vector3()), new THREE.Vector3(Math.sin(H.h), -0.2, Math.cos(H.h))); }
      else if (e.type === 'step') { sound.step(H.gait === 'trot' ? 1 : 0.5); if (H.gait === 'trot' || Math.random() < 0.35) place.puff(e.pos, 'step'); }
      else if (e.type === 'dust') { place.puff(e.pos, 'dust'); sound.scrape(); place.ring(e.pos, 0.18); }
      else if (e.type === 'thump') { sound.thump(); place.ring(henry.root.position, 0.35); }
      else if (e.type === 'tear') sound.tear();
      else if (e.type === 'land') { sound.land(look); place.ring(henry.root.position, 0.9); }
    }
    if (henry.state === 'sleep' && toon()) { zzzT -= dt; if (zzzT < 0) { zzzT = 1.7; place.zzz(henry.anchor('poll', new THREE.Vector3()).add(new THREE.Vector3(0.1, 0.25, 0))); } }
    if (henry.state === 'sleep') sound.snore(clock);
    // the camera follows round with him, and down to him when he lies
    view.lookAtMe = Math.max(0, view.lookAtMe - dt);
    const lying = henry.state === 'lie' || henry.state === 'sleep' || henry.state === 'lying-down' ? 1 : 0;
    // aim a little ahead of the middle of his body (his head reaches further forward than his tail goes back), and ahead
    // of where he is by as much as the camera trails him when he walks, so he stays in the frame
    const ahead = 0.22 + H.speed / 3;
    const target = view.face ? henry.anchor('head', tv) : tv.set(H.x + Math.sin(H.h) * ahead, lerp(toon() ? 0.72 : 0.85, 0.5, lying), H.z + Math.cos(H.h) * ahead);
    view.aim.lerp(target, Math.min(1, dt * 3));
    let yaw = H.h + view.off + H.speed / place.pathR / 2.5, dy = ((yaw - view.yaw + PI) % TAU + TAU) % TAU - PI; view.yaw += dy * Math.min(1, dt * 2.5);
    // stand back just far enough that all of him fits the narrower way of the screen
    const vh = camera.fov * PI / 360, half = Math.min(vh, Math.atan(Math.tan(vh) * camera.aspect)), R = view.face ? 0.42 : toon() ? 1.08 : 1.25;
    const d = view.zoom * R / Math.sin(half) * 1.08;
    camera.position.set(view.aim.x + Math.sin(view.yaw) * Math.cos(view.pitch) * d, view.aim.y + Math.sin(view.pitch) * d, view.aim.z + Math.cos(view.yaw) * Math.cos(view.pitch) * d);
    camera.position.y = Math.max(0.25, camera.position.y);
    camera.lookAt(view.aim);
    place.update(dt, clock, henry.root.position, henry, camera.position);
    if (Math.floor(clock * 4) !== Math.floor((clock - dt) * 4)) status();
  }
  function draw(dt) { place.render(camera, dt, camera.position.distanceTo(view.aim)); }
  // a tall phone screen gets a wider lens, so all of him fits across it without standing far off
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = camera.aspect < 0.8 ? 46 : camera.aspect < 1.2 ? 38 : 30;
    const top = ($('status').getBoundingClientRect().bottom || 0) + 8, bottom = $('moves').getBoundingClientRect().top || h, shift = Math.round(h / 2 - (top + bottom) / 2);
    if (shift > 4 && h > 200) camera.setViewOffset(w, h, 0, shift, w, h); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (henry && place && !building) { tick(dt); draw(dt); }
    requestAnimationFrame(frame);
  }

  // ---------- sound, all made in code ----------
  const sound = (() => {
    let ctx = null, master = null, noiseBuf = null, on = !TEST, amb = null, ambT = 0, snoreT = 0;
    function wake() {
      if (TEST || !on) return null;
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
        ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        ambient(time);
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    const noise = () => { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; return s; };
    function env(g, t, a, peak, dur, rel) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.setValueAtTime(peak, t + Math.max(a, dur)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel); }
    // a moo: two buzzing voices through the shapes of a cow's throat, starting closed ("mm") and opening ("oo"), the pitch
    // rising and falling; the cartoon's is higher and rounder
    function moo(dur) {
      if (!wake()) return; const t = ctx.currentTime + 0.02, sb = toon(), f0 = sb ? 150 : 92;
      const out = ctx.createGain(); env(out, t, 0.14, sb ? 0.5 : 0.65, dur, 0.35); out.connect(master);
      const mouth = ctx.createBiquadFilter(); mouth.type = 'lowpass'; mouth.Q.value = 1.2; mouth.frequency.setValueAtTime(280, t); mouth.frequency.linearRampToValueAtTime(sb ? 2400 : 1700, t + 0.4); mouth.frequency.linearRampToValueAtTime(sb ? 1500 : 900, t + dur); mouth.connect(out);
      for (const [f, q, g] of [[sb ? 820 : 700, 5, 1], [sb ? 1350 : 1150, 6, 0.55], [sb ? 2900 : 2500, 8, 0.15]]) { const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q; const bg = ctx.createGain(); bg.gain.value = g * 3; bp.connect(bg); bg.connect(mouth); fm.push(bp); }
      const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 5.2; vg.gain.value = f0 * 0.02; vib.connect(vg);
      for (const det of [1, 1.006]) {
        const o = ctx.createOscillator(); o.type = 'sawtooth';
        o.frequency.setValueAtTime(f0 * 0.82 * det, t); o.frequency.linearRampToValueAtTime(f0 * 1.12 * det, t + 0.3); o.frequency.linearRampToValueAtTime(f0 * det, t + dur * 0.7); o.frequency.linearRampToValueAtTime(f0 * 0.78 * det, t + dur + 0.3);
        vg.connect(o.frequency); for (const bp of fm) o.connect(bp); const dry = ctx.createGain(); dry.gain.value = 0.18; o.connect(dry); dry.connect(mouth);
        o.start(t); o.stop(t + dur + 0.5);
      }
      vib.start(t); vib.stop(t + dur + 0.5); fm.length = 0;
      breathNoise(t, dur, 0.06);
    }
    const fm = [];
    function breathNoise(t, dur, level) { const n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.7; env(g, t, 0.1, level, dur, 0.3); n.connect(f); f.connect(g); g.connect(master); n.start(t); n.stop(t + dur + 0.5); }
    function snort() { if (!wake()) return; const t = ctx.currentTime + 0.01, n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'bandpass'; f.Q.value = 0.9; f.frequency.setValueAtTime(1500, t); f.frequency.exponentialRampToValueAtTime(450, t + 0.3); env(g, t, 0.02, 0.5, 0.12, 0.22); n.connect(f); f.connect(g); g.connect(master); n.start(t); n.stop(t + 0.5); }
    function thud(t, f0, f1, len, level) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + len); env(g, t, 0.005, level, 0.01, len); o.connect(g); g.connect(master); o.start(t); o.stop(t + len + 0.05); const n = noise(), f = ctx.createBiquadFilter(), ng = ctx.createGain(); f.type = 'lowpass'; f.frequency.value = 500; env(ng, t, 0.003, level * 0.5, 0.01, 0.08); n.connect(f); f.connect(ng); ng.connect(master); n.start(t); n.stop(t + 0.15); }
    function step(k) { if (!wake()) return; thud(ctx.currentTime + 0.01, 90, 45, 0.12, 0.12 * k); }
    function thump() { if (!wake()) return; thud(ctx.currentTime + 0.01, 70, 35, 0.35, 0.5); }
    function scrape() { if (!wake()) return; const t = ctx.currentTime + 0.01, n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 0.6; env(g, t, 0.03, 0.35, 0.15, 0.2); n.connect(f); f.connect(g); g.connect(master); n.start(t); n.stop(t + 0.5); }
    function tear() { if (!wake()) return; let t = ctx.currentTime + 0.01; for (let i = 0; i < 3; i++) { const n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'highpass'; f.frequency.value = 1800; env(g, t, 0.004, 0.12, 0.02, 0.04); n.connect(f); f.connect(g); g.connect(master); n.start(t); n.stop(t + 0.1); t += 0.05 + Math.random() * 0.03; } }
    function land(st) { if (!wake()) return; const t = ctx.currentTime + 0.01; if (st === 'cartoon') { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(520, t + 0.09); o.frequency.exponentialRampToValueAtTime(180, t + 0.32); env(g, t, 0.01, 0.35, 0.05, 0.3); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.45); } thud(t, 80, 40, 0.25, 0.4); }
    function hum() { if (!wake()) return; const t = ctx.currentTime + 0.01, o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(toon() ? 160 : 100, t); o.frequency.linearRampToValueAtTime(toon() ? 180 : 110, t + 0.25); f.type = 'lowpass'; f.frequency.value = 420; env(g, t, 0.06, 0.3, 0.3, 0.25); o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t + 0.7); }
    function snore(t) { if (!ctx || !on) return; if (t < snoreT) return; snoreT = t + 3.6; const at = ctx.currentTime + 0.01, n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'lowpass'; f.frequency.value = 380; env(g, at, 0.6, 0.12, 0.9, 0.8); n.connect(f); f.connect(g); g.connect(master); n.start(at); n.stop(at + 2.5); }
    // the pasture's sounds: a breeze, birds by day, crickets at dusk and at night
    function ambient(st) {
      if (amb) { clearInterval(amb.timer); try { amb.wind.stop(); } catch (e) { /* already stopped */ } amb = null; }
      if (!ctx) return;
      const wind = noise(), wf = ctx.createBiquadFilter(), wg = ctx.createGain(); wf.type = 'lowpass'; wf.frequency.value = st !== 'day' ? 380 : 600; wg.gain.value = st !== 'day' ? 0.05 : 0.025; wind.connect(wf); wf.connect(wg); wg.connect(master); wind.start();
      const timer = setInterval(() => {
        if (!on || ctx.state !== 'running') return;
        const t = ctx.currentTime + 0.05;
        wg.gain.setTargetAtTime((st !== 'day' ? 0.04 : 0.02) * (0.6 + 0.8 * Math.random()), t, 1.5);
        if (st !== 'day') { for (let c = 0; c < 2; c++) { if (Math.random() < 0.6) { const f = 4300 + c * 600 + Math.random() * 200; let tt = t + Math.random() * 0.4; for (let i = 0; i < 3; i++) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f; env(g, tt, 0.004, 0.025, 0.02, 0.03); o.connect(g); g.connect(master); o.start(tt); o.stop(tt + 0.08); tt += 0.07; } } } }
        else if (Math.random() < 0.18) { let tt = t; for (let i = 0; i < 2 + (Math.random() * 3 | 0); i++) { const o = ctx.createOscillator(), g = ctx.createGain(), f = 2600 + Math.random() * 900; o.frequency.setValueAtTime(f, tt); o.frequency.exponentialRampToValueAtTime(f * 1.35, tt + 0.08); env(g, tt, 0.01, 0.05, 0.03, 0.06); o.connect(g); g.connect(master); o.start(tt); o.stop(tt + 0.15); tt += 0.12; } }
      }, 700);
      amb = {timer, wind};
    }
    function toggle() { on = !on; if (ctx) master.gain.setTargetAtTime(on ? 0.8 : 0, ctx.currentTime, 0.05); if (on) wake(); }
    return {wake, moo, snort, step, thump, scrape, tear, land, hum, snore, ambient: st => { if (ctx) ambient(st); }, toggle, get on() { return on; }};
  })();

  // ---------- for the checks ----------
  window.HM = {
    log: [], build, setTime, get time() { return time; }, get ready() { return !!(henry && place && !building); }, get look() { return look; }, get style() { return look; }, get henry() { return henry; }, get place() { return place; }, camera, view, H,
    go, pat,
    // move time on by `seconds`, 30 frames a second, then draw
    step(seconds, fps) { fps = fps || 30; const n = Math.max(1, Math.round(seconds * fps)); for (let i = 0; i < n; i++) tick(1 / fps); draw(1 / fps); return henry.state; },
    draw() { draw(1 / 30); }, calls: () => renderer.info.render.calls, tris: () => renderer.info.render.triangles, status: () => $('status').textContent,
    // what one whole frame costs: draw calls and triangles over every pass
    memory: () => Object.assign({}, renderer.info.memory, {programs: renderer.info.programs.length}),
    frame() { const I = renderer.info; I.autoReset = false; I.reset(); const t0 = performance.now(); draw(1 / 30); renderer.getContext().finish(); const ms = performance.now() - t0; const r = {calls: I.render.calls, tris: I.render.triangles, ms: Math.round(ms)}; I.autoReset = true; return r; }
  };
  setTimeout(() => $('hint').classList.add('gone'), 9000);
  build(look).then(() => { window.READY = true; if (!TEST) requestAnimationFrame(t => { last = t; frame(t); }); });
  window.addEventListener('error', e => { window.ERR = String(e.message || e); });
})();
