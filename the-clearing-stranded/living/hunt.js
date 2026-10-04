// hunt.js: the hunting game. three.js r128 (global THREE), with stage.js, trace.js and beasts.js. Defines window.Hunt.
//
// You look out over the place you're hunting in: its own painting, alive, from the spot you're standing on. The animal
// the game found comes out of the cover and goes about its business: a rabbit sits and hops, a squirrel darts, a turkey
// pecks along, a deer steps out and stops to look, a covey of quail feeds in the grass until it hears you and bursts up,
// doves and ducks come across fast. Press and hold to bring up the sights; they sway with your breathing and settle
// while you hold steady (better the higher your hunting skill), then drift again if you hold too long. Let go to shoot.
// Three shots. A miss sends a ground animal running for cover; birds keep flying. A flock can give you more than one.
//
// Hunt.play(o, done): o = {painting, trace, month, hour, weather, sp, n (how many), level (hunting, 1 to 10), spot ([x, y]
// in painting pixels, where you stand), names ({sp: 'cottontail'} or {sp: ['mourning dove', 'doves']}), practice}. done({shots, hits}) when it's over.
// Hunt.practice(o, done): rounds of random animals on the practice range, for as long as you like.
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  // [hit radius m, body height m, how wide a view (painting px), ground speed m/s, run speed m/s, drawn bigger by]
  // Small game is drawn bigger than life, so a kid can find it on a phone.
  const KIND = {
    rabbit: [0.3, 0.24, 300, 0.9, 6, 1.6], squirrel: [0.25, 0.19, 290, 1.4, 5, 1.7], turkey: [0.4, 0.5, 380, 0.7, 4.2, 1.3], raccoon: [0.36, 0.3, 340, 0.6, 3.5, 1.4],
    deer: [0.5, 0.85, 520, 0.8, 9, 1], bison: [0.95, 1.05, 760, 0.5, 6, 1], quail: [0.2, 0.16, 300, 0.35, 0, 1.8], dove: [0.2, 0.2, 400, 0, 0, 1.8], duck: [0.28, 0.28, 420, 0, 0, 1.6], pigeon: [0.2, 0.2, 400, 0, 0, 1.8]
  };
  const MODEL = {pigeon: 'dove', raccoon: 'squirrel'};
  let css = false;
  function style() {
    if (css) return; css = true;
    const st = document.createElement('style');
    st.textContent = `.hunt{position:fixed;inset:0;z-index:60;background:#0b1014;touch-action:none;user-select:none;-webkit-user-select:none;font-family:var(--font-ui,system-ui,sans-serif)}
.hunt canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.hunt .h-top{position:absolute;left:10px;right:10px;top:calc(10px + env(safe-area-inset-top,0px));display:flex;align-items:center;gap:10px;pointer-events:none}
.hunt .h-name{background:rgba(244,247,247,.92);color:#15212b;border-radius:10px;padding:6px 11px;font-weight:700;font-size:16px;box-shadow:0 2px 10px rgba(0,0,0,.25)}
.hunt .h-shots{display:flex;gap:5px;background:rgba(21,33,43,.75);border-radius:999px;padding:7px 10px}
.hunt .h-shots i{width:9px;height:22px;border-radius:4px 4px 2px 2px;background:linear-gradient(#e8c35a,#b08a2a 60%,#6b4a2a 60%);display:block}
.hunt .h-shots i.used{opacity:.22}
.hunt .h-say{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(74px + env(safe-area-inset-bottom,0px));max-width:88%;background:rgba(244,247,247,.92);color:#15212b;border-radius:999px;padding:7px 13px;font-size:14.5px;text-align:center;pointer-events:none;transition:opacity .3s}
.hunt .h-say[data-off]{opacity:0}
.hunt .h-quit{position:absolute;right:10px;bottom:calc(16px + env(safe-area-inset-bottom,0px));background:rgba(244,247,247,.92);color:#15212b;border:0;border-radius:999px;padding:10px 14px;font:inherit;font-weight:600;font-size:14px}
.hunt .h-sight{position:absolute;left:0;top:0;width:64px;height:64px;margin:-32px 0 0 -32px;border-radius:50%;border:2px solid rgba(255,255,255,.9);box-shadow:0 0 0 1.5px rgba(0,0,0,.55),inset 0 0 0 1.5px rgba(0,0,0,.35);pointer-events:none;display:none}
.hunt .h-sight::before,.hunt .h-sight::after{content:"";position:absolute;background:#e0521b;box-shadow:0 0 0 1px rgba(0,0,0,.45)}
.hunt .h-sight::before{left:50%;top:6px;bottom:6px;width:2px;margin-left:-1px}
.hunt .h-sight::after{top:50%;left:6px;right:6px;height:2px;margin-top:-1px}
.hunt .h-sight.steady{border-color:#ffd27a}
.hunt .h-flash{position:absolute;inset:0;background:#fff8e0;opacity:0;pointer-events:none}
.hunt .h-pop{position:absolute;left:0;top:0;transform:translate(-50%,-100%);font-weight:800;font-size:20px;color:#fff;text-shadow:0 2px 0 #000,0 0 6px #000;pointer-events:none;white-space:nowrap}
.hunt .h-end{position:absolute;left:50%;top:42%;transform:translate(-50%,-50%);background:#f4f7f7;color:#15212b;border-radius:14px;padding:16px 18px;min-width:240px;max-width:88%;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.45)}
.hunt .h-end b{display:block;font-size:20px;margin-bottom:4px}
.hunt .h-end p{margin:0 0 10px;color:#435561;font-size:14.5px}
.hunt .h-end .h-row{display:flex;gap:8px;justify-content:center}
.hunt .h-end button{border:0;border-radius:999px;padding:10px 16px;font:inherit;font-weight:700;font-size:15px;background:#e3eaec;color:#15212b}
.hunt .h-end button.hot{background:#e0521b;color:#fff}`;
    document.head.appendChild(st);
  }

  function play(o, done) {
    style();
    const sp = o.sp, K0 = KIND[sp] || KIND.rabbit, nm = o.names && o.names[sp], name = (Array.isArray(nm) ? nm[0] : nm) || sp, plural = (Array.isArray(nm) ? nm[1] : o.plural) || name, level = Math.max(1, Math.min(10, o.level || 1));
    const ov = document.createElement('div'); ov.className = 'hunt'; ov.id = 'hunt'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Hunting: ' + name);
    ov.innerHTML = `<canvas aria-hidden="true"></canvas><div class="h-top"><span class="h-name"></span><span class="h-shots"><i></i><i></i><i></i></span></div><div class="h-sight"></div><div class="h-flash"></div><p class="h-say" aria-live="polite"></p><button type="button" class="h-quit">Lower the rifle</button>`;
    document.body.appendChild(ov); document.body.classList.add('noscroll');
    const cv = ov.querySelector('canvas'), sightEl = ov.querySelector('.h-sight'), flashEl = ov.querySelector('.h-flash'), sayEl = ov.querySelector('.h-say');
    ov.querySelector('.h-name').textContent = cap(name) + (o.n > 1 ? ' ×' + o.n : '');
    const SND = root.GameSound || null;

    // ---------- the place, from where you stand ----------
    const T = o.trace, S = makeStage({canvas: cv, painting: o.painting, trace: T, month: o.month, hour: o.hour});
    S.setWeather(o.weather || 'clear'); S.setHour(o.hour); S.setMonth(o.month); S.settle();
    const B = Trace.build(T), GW = Trace.GW, GH = Trace.GH, K = S.K, SN = S.SN;
    const rr = (a, b) => a + (b - a) * Math.random();
    const openSq = (gx, gy) => gx >= 0 && gy >= 0 && gx < GW && gy < GH && 'gGtfsm'.indexOf(B.M[gy][gx]) >= 0;
    const tileOfW = (x, z) => [Math.floor(x * K / T.size[0] * GW), Math.floor(z * K * SN / T.size[1] * GH)];
    const openW = (x, z) => { const t = tileOfW(x, z); return openSq(t[0], t[1]); };
    let cssW = 0, cssH = 0;
    const view = {};
    // the view: the most open stretch of ground within reach of where you stand, so the animal has somewhere to be
    let aimC = null;
    function bestCentre(vw, vh) {
      const spot = o.spot || T.hub || [T.size[0] / 2, T.size[1] / 2], sx = T.size[0] / GW, sy = T.size[1] / GH;
      let best = null;
      for (let i = 0; i < 60; i++) {
        const cx = spot[0] + (i ? rr(-vw * 0.8, vw * 0.8) : 0), cy = spot[1] - vh * 0.2 + (i ? rr(-vh * 0.7, vh * 0.4) : 0);
        let score = 0;
        for (let gy = Math.floor((cy - vh * 0.3) / sy); gy <= Math.floor((cy + vh * 0.2) / sy); gy++) for (let gx = Math.floor((cx - vw * 0.32) / sx); gx <= Math.floor((cx + vw * 0.32) / sx); gx++) if (openSq(gx, gy)) score++;
        score -= Math.hypot(cx - spot[0], cy - spot[1]) / (vw * 2);
        if (!best || score > best.score) best = {cx, cy, score};
      }
      return [best.cx, best.cy];
    }
    function size() {
      const r = ov.getBoundingClientRect(); cssW = r.width; cssH = r.height; S.resize(cssW, cssH);
      const vw = Math.min(T.size[0], K0[2] * Math.max(1, cssW / cssH * 0.75)), vh = vw * cssH / cssW;
      if (!aimC) aimC = bestCentre(vw, vh);
      S.setView(aimC[0], aimC[1], vw, vh);
      Object.assign(view, S.view);
    }
    size(); root.addEventListener('resize', size);
    // the ground in view, in metres, and somewhere open in it
    const box = () => [(view.cx - view.w / 2) / K, (view.cx + view.w / 2) / K, (view.cy - view.h / 2) / (K * SN), (view.cy + view.h / 2) / (K * SN)];
    function openIn(fx0, fx1, fz0, fz1) {
      const [x0, x1, z0, z1] = box();
      for (let i = 0; i < 200; i++) { const x = x0 + (x1 - x0) * rr(fx0, fx1), z = z0 + (z1 - z0) * rr(fz0, fz1); if (openW(x, z)) return new THREE.Vector3(x, 0, z); }
      return new THREE.Vector3((x0 + x1) / 2, 0, (z0 + z1) / 2);
    }
    // open ground where cover meets the open, near the far side of the view: animals come out from there
    function coverEdge() {
      const [x0, x1, z0, z1] = box();
      for (let i = 0; i < 300; i++) {
        const top = Math.random() < 0.6, x = top ? x0 + (x1 - x0) * rr(0.1, 0.9) : (Math.random() < 0.5 ? x0 + (x1 - x0) * rr(0.02, 0.15) : x1 - (x1 - x0) * rr(0.02, 0.15)), z = top ? z0 + (z1 - z0) * rr(0.05, 0.25) : z0 + (z1 - z0) * rr(0.1, 0.6);
        if (openW(x, z) && [[0.6, 0], [-0.6, 0], [0, 0.6], [0, -0.6]].some(d => !openW(x + d[0], z + d[1]))) return new THREE.Vector3(x, 0, z);
      }
      return openIn(0.1, 0.9, 0.05, 0.3);
    }
    // the edge of the view nearest a point, a little outside it
    function edgeFrom(p) {
      const [x0, x1, z0, z1] = box(), d = [p.x - x0, x1 - p.x, p.z - z0];
      const i = d.indexOf(Math.min(...d));
      return i === 0 ? new THREE.Vector3(x0 - 2, 0, p.z + rr(-2, 2)) : i === 1 ? new THREE.Vector3(x1 + 2, 0, p.z + rr(-2, 2)) : new THREE.Vector3(p.x + rr(-2, 2), 0, z0 - 2);
    }
    const inView = (p, m) => { const [x0, x1, z0, z1] = box(); m = m || 0.5; return p.x > x0 - m && p.x < x1 + m && p.z > z0 - m - p.y * 1.6 && p.z < z1 + m; };

    // ---------- the animals ----------
    const A = [];
    function spawn(kind, at, extra) {
      const m = makeBeast(MODEL[kind] || kind); m.root.position.copy(at); m.root.scale.setScalar((KIND[kind] || K0)[5] || 1); S.scene.add(m.root);
      const sh = S.shadow(m.root, K0[0] * 1.2, K0[0] * 0.8);
      const a = Object.assign({kind, m, sh, p: m.root.position, v: new THREE.Vector3(), to: null, st: 'wait', t: rr(0.6, 1.8), alive: true, gone: false, fly: false, face: rr(0, TAU), hop: 0}, extra || {});
      m.root.rotation.y = a.face; A.push(a); return a;
    }
    const n = Math.max(1, o.n || 1), birds = sp === 'dove' || sp === 'duck' || sp === 'pigeon';
    if (sp === 'quail') { const c = openIn(0.3, 0.7, 0.3, 0.55); for (let i = 0; i < n; i++) spawn('quail', c.clone().add(new THREE.Vector3(rr(-0.9, 0.9), 0, rr(-0.6, 0.6))), {st: 'feed', t: rr(0.3, 1)}); }
    else if (birds) {
      // fliers come across one after another, from one side
      const left = Math.random() < 0.5, [x0, x1, z0, z1] = box();
      for (let i = 0; i < (sp === 'pigeon' ? 14 : n); i++) {
        const z = z0 + (z1 - z0) * rr(0.15, 0.6), y = sp === 'duck' ? rr(3, 4.5) : rr(2, 3.4), sp0 = sp === 'duck' ? rr(3.4, 4.2) : rr(4, 5);
        const a = spawn(sp, new THREE.Vector3(left ? x0 - 2 - i * rr(1.5, 3) : x1 + 2 + i * rr(1.5, 3), y, z + y * 1.4), {fly: true, st: 'fly', y0: y, ph: rr(0, TAU)});
        a.v.set(left ? sp0 : -sp0, 0, rr(-0.6, 0.6)); a.face = Math.atan2(a.v.x, a.v.z); a.m.root.rotation.y = a.face;
      }
    } else if (sp === 'bison') {
      const c = openIn(0.2, 0.8, 0.1, 0.45);
      for (let i = 0; i < 4; i++) spawn('bison', c.clone().add(new THREE.Vector3(rr(-3, 3), 0, rr(-2, 1.5))), {st: 'graze', t: rr(1, 3), herd: true});
    } else {
      // it comes out of cover at the edge of the view and makes for the open
      const target = openIn(0.25, 0.75, 0.25, 0.6), from = coverEdge();
      const a = spawn(sp, from, {st: 'move', to: target}); a.face = Math.atan2(target.x - from.x, target.z - from.z);
    }

    // ---------- aiming and shooting ----------
    let shots = 3, hits = 0, t = 0, aim = null, over = false, flushed = false, endAt = 0, saidT = 0;
    const maxT = birds ? 16 : 26;
    const pips = ov.querySelectorAll('.h-shots i');
    function say(text, secs) { sayEl.textContent = text; sayEl.removeAttribute('data-off'); saidT = t + (secs || 2.4); }
    say(sp === 'quail' ? 'A covey in the grass. They\'ll flush when they hear you: be ready.' : birds ? 'Here they come. Follow one with the sights, a hair ahead, and let go.' : 'Wait for it to stop. Press and hold to aim, let go to shoot.', 3.2);
    // the sights sway with your breathing: steadiest after a second or so of holding, worse after five; skill steadies them
    function sway(hold) {
      const settle = hold < 1 ? 1 - 0.55 * hold : hold < 3.5 ? 0.45 : 0.45 + (hold - 3.5) * 0.35;
      return Math.min(1.6, settle) * 18 * (1.05 - 0.06 * (level - 1)) * (cssW / 390);
    }
    function sightAt() {
      if (!aim) return null;
      const hold = t - aim.t0, A2 = sway(hold), w = t * 1.7;
      return {x: aim.x + A2 * (Math.sin(w) * 0.8 + 0.35 * Math.sin(w * 2.3 + 1)), y: aim.y + A2 * (Math.sin(w * 1.3 + 2) * 0.6 + 0.3 * Math.cos(w * 2.9)), steady: hold > 0.8 && hold < 3.5};
    }
    const touchOff = e => e.pointerType === 'mouse' ? 0 : Math.min(90, cssH * 0.09);
    ov.addEventListener('pointerdown', e => {
      if (over || e.target.closest('.h-quit,.h-end')) return;
      e.preventDefault(); try { ov.setPointerCapture(e.pointerId); } catch (x) {}
      aim = {x: e.clientX, y: e.clientY - touchOff(e), t0: t, off: touchOff(e)};
      if (sp === 'quail' && !flushed) setTimeout(flush, 260);
    });
    ov.addEventListener('pointermove', e => { if (aim) { aim.x = e.clientX; aim.y = e.clientY - aim.off; } });
    const release = e => { if (!aim || over) { aim = null; return; } const s2 = sightAt(); aim = null; if (shots > 0) fire(s2.x, s2.y); };
    ov.addEventListener('pointerup', release); ov.addEventListener('pointercancel', () => { aim = null; });
    ov.querySelector('.h-quit').addEventListener('click', () => end(true));
    const keys = e => { if (e.key === 'Tab' || e.target.closest && e.target.closest('.h-end')) return; e.stopPropagation(); if (e.key === 'Escape' && e.type === 'keydown') end(true); };
    document.addEventListener('keydown', keys, true); document.addEventListener('keyup', keys, true);

    const r0 = cv.getBoundingClientRect.bind(cv);
    // where an animal is on the screen: the box round it as drawn (small game is drawn bigger), never smaller than a fingertip
    const BX = new THREE.Box3(), CN = [0, 1, 2, 3, 4, 5, 6, 7].map(() => new THREE.Vector3());
    function rectOf(a) {
      BX.setFromObject(a.m.root); const lo = BX.min, hi = BX.max, r = r0();
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      CN.forEach((v, i) => { v.set(i & 1 ? hi.x : lo.x, i & 2 ? hi.y : lo.y, i & 4 ? hi.z : lo.z); const q = S.toPaint(v), sx = r.left + (q[0] - (view.cx - view.w / 2)) / view.w * r.width, sy = r.top + (q[1] - (view.cy - view.h / 2)) / view.h * r.height; x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy); });
      // the box's corners stick out past a body; pull it in a little, then make sure it's big enough to hit
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, mn = 26 * cssW / 390, hw = Math.max(mn / 2, (x1 - x0) * 0.42), hh = Math.max(mn / 2, (y1 - y0) * 0.42);
      return [cx - hw, cy - hh, cx + hw, cy + hh];
    }
    // how far off the edge still counts: a few pixels, more with skill
    const give = a => (5 + level + (a.fly ? 8 : 0)) * cssW / 390;
    let lastShot = null;
    function fire(x, y) {
      shots--; pips[2 - shots].classList.add('used');
      if (SND) SND.shot();
      flashEl.style.transition = 'none'; flashEl.style.opacity = 0.55; requestAnimationFrame(() => { flashEl.style.transition = 'opacity .25s'; flashEl.style.opacity = 0; });
      ov.animate && cv.animate([{transform: 'translate(0,0)'}, {transform: 'translate(-5px,3px)'}, {transform: 'translate(3px,-2px)'}, {transform: 'translate(0,0)'}], {duration: 180});
      // the nearest animal under the sights, if any: the animal as it's drawn, with a little give round it
      let best = null, bd = 1e9; lastShot = {x, y, near: []};
      for (const a of A) {
        if (!a.alive || a.gone) continue;
        const b = rectOf(a), d = Math.hypot(Math.max(b[0] - x, 0, x - b[2]), Math.max(b[1] - y, 0, y - b[3])), c = Math.hypot((b[0] + b[2]) / 2 - x, (b[1] + b[3]) / 2 - y);
        lastShot.near.push({kind: a.kind, rect: b.map(v => Math.round(v)), d: Math.round(d)});
        if (d <= give(a) && c < bd) { bd = c; best = a; }
      }
      if (best) {
        best.alive = false; hits++; best.st = 'down'; best.t = 0;
        pop(x, y - 10, hits > 1 ? 'Another!' : 'Got it!');
        if (SND) setTimeout(() => SND.thump(), 90);
        for (let i = 0; i < 14; i++) S.emit({x: best.p.x, y: best.p.y + (KIND[best.kind] || K0)[1], z: best.p.z, vx: rr(-1.5, 1.5), vy: rr(0.5, 2.5), vz: rr(-1.5, 1.5), life: rr(0.6, 1.4), s: 0.05, c: best.fly ? [0.75, 0.68, 0.55] : [0.55, 0.45, 0.35], a: 1, k: 0, kind: 1});
      } else {
        // a puff of dirt where the bullet hit the ground
        const r = r0(), px = view.cx - view.w / 2 + (x - r.left) / r.width * view.w, py = view.cy - view.h / 2 + (y - r.top) / r.height * view.h;
        const g = S.groundAt(px, py), w = S.toWorld(g[0], g[1]);
        for (let i = 0; i < 10; i++) S.emit({x: w.x + rr(-0.1, 0.1), y: 0.05, z: w.z + rr(-0.1, 0.1), vx: rr(-0.6, 0.6), vy: rr(0.8, 2), vz: rr(-0.4, 0.4), life: rr(0.5, 1), s: 0.12, s1: 0.4, c: [0.7, 0.6, 0.45], a: 0.6, k: 8, kind: 3});
        pop(x, y - 10, 'Miss');
      }
      // the shot spooks everything still on its feet
      for (const a of A) if (a.alive && !a.gone && !a.fly && a.st !== 'flee') { a.st = 'flee'; a.to = edgeFrom(a.p); a.t = 0; }
      // birds already up flare at the shot: faster, and climbing
      for (const a of A) if (a.alive && !a.gone && a.st === 'fly' && !a.flared) { a.flared = true; a.v.multiplyScalar(1.4); a.y0 += 0.8; }
      if (sp === 'quail' && !flushed) flush();
      if (shots === 0) setTimeout(() => end(false), 1100);
    }
    function pop(x, y, text) { const e = document.createElement('div'); e.className = 'h-pop'; e.textContent = text; e.style.left = x + 'px'; e.style.top = y + 'px'; ov.appendChild(e); e.animate && e.animate([{opacity: 1, transform: 'translate(-50%,-100%)'}, {opacity: 0, transform: 'translate(-50%,-180%)'}], {duration: 900, fill: 'forwards'}); setTimeout(() => e.remove(), 950); }
    // the covey bursts up and fans out away from you
    function flush() {
      if (flushed) return; flushed = true; if (SND) SND.whirr(); say('Whirr! They\'re up!', 1.6);
      for (const a of A) if (a.alive && a.kind === 'quail') { const ang = rr(-1.1, 1.1) + Math.PI; a.fly = true; a.st = 'flush'; a.t = 0; a.v.set(Math.sin(ang) * rr(2.6, 3.6), 0, Math.cos(ang) * rr(2.6, 3.6) * 0.6 - 1.4); a.y0 = rr(1.6, 2.6); a.face = Math.atan2(a.v.x, a.v.z); }
    }

    // ---------- every frame ----------
    let last = performance.now(), raf = 0;
    function step(dt) {
      for (const a of A) {
        if (a.gone) continue;
        const k = KIND[a.kind] || K0, p = a.p;
        a.t -= dt;
        if (a.st === 'down') {
          // shot: a bird drops; an animal falls over
          if (a.fly) { a.v.y -= 9.8 * dt; p.addScaledVector(a.v, dt); a.m.root.rotation.z += dt * 6; if (p.y <= 0) { p.y = 0; a.v.set(0, 0, 0); a.fly = false; } }
          else a.m.root.rotation.z = Math.min(Math.PI / 2, a.m.root.rotation.z + dt * 5);
          a.m.animate(dt, t, 0, false, a.fly); continue;
        }
        if (a.st === 'fly' || a.st === 'flush') {
          if (a.st === 'flush') { p.y += (a.y0 - p.y) * Math.min(1, dt * 3); a.v.multiplyScalar(1 + dt * 0.15); }
          else p.y = a.y0 + Math.sin(t * 2.4 + a.ph) * 0.35;
          p.x += a.v.x * dt; p.z += a.v.z * dt;
          a.m.root.rotation.y = a.face; a.m.animate(dt, t, 1, false, true);
          if (!inView(p, 3) && (a.st === 'flush' || Math.sign(a.v.x) === Math.sign(p.x - (box()[0] + box()[1]) / 2))) a.gone = true;
          continue;
        }
        // on the ground: wait, feed, move, run
        let speed = 0;
        if (a.st === 'feed' || a.st === 'graze' || a.st === 'wait') {
          if (a.t <= 0) { if (a.kind === 'quail') { a.to = p.clone().add(new THREE.Vector3(rr(-0.4, 0.4), 0, rr(-0.3, 0.3))); a.st = 'move'; a.t = rr(0.4, 1); } else { a.to = openIn(0.2, 0.8, 0.15, 0.65); if (a.herd) a.to = p.clone().add(new THREE.Vector3(rr(-1.5, 1.5), 0, rr(-1, 1))); a.st = 'move'; } }
        } else if (a.st === 'move' || a.st === 'flee') {
          const fleeing = a.st === 'flee', sp0 = fleeing ? k[4] : k[3];
          const d = new THREE.Vector3(a.to.x - p.x, 0, a.to.z - p.z), L = d.length();
          if (L < 0.08 || (!fleeing && a.t < -6)) { if (fleeing) { a.gone = true; continue; } a.st = a.kind === 'quail' ? 'feed' : 'graze'; a.t = a.kind === 'deer' ? rr(1.5, 3.5) : a.kind === 'rabbit' ? rr(0.8, 2.5) : rr(1, 3); }
          else {
            d.normalize();
            // rabbits hop and zig-zag when they run; squirrels dash and stop
            if (a.kind === 'rabbit' && fleeing) { a.hop += dt * 9; d.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.sin(a.hop * 0.6) * 0.7); }
            if (a.kind === 'rabbit' && !fleeing) { a.hop += dt * 6; speed = sp0 * (Math.sin(a.hop) > 0 ? 1.6 : 0.1); } else speed = sp0;
            const nx = p.x + d.x * speed * dt, nz = p.z + d.z * speed * dt;
            if (fleeing || openW(nx, nz) || !inView(p)) { p.x = nx; p.z = nz; } else { a.to = openIn(0.2, 0.8, 0.15, 0.65); }
            const want = Math.atan2(d.x, d.z); a.face += ((((want - a.face) % TAU) + TAU * 1.5) % TAU - Math.PI) * Math.min(1, dt * 8);
            if (fleeing && (!inView(p, 0.2) || !openW(p.x, p.z))) a.gone = true;   // out of sight, or into cover
          }
        }
        a.m.root.rotation.y = a.face;
        a.m.animate(dt, t, speed, a.st === 'graze' || a.st === 'feed', false);
      }
      for (const a of A) if (a.gone && a.m.root.visible) { a.m.root.visible = false; }
    }
    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      step(dt);
      S.setView(view.cx, view.cy, view.w, view.h); S.update(t, dt); S.render();
      const s2 = sightAt();
      if (s2) { sightEl.style.display = 'block'; sightEl.style.transform = `translate(${s2.x.toFixed(1)}px,${s2.y.toFixed(1)}px)`; sightEl.classList.toggle('steady', s2.steady); }
      else sightEl.style.display = 'none';
      if (saidT && t > saidT) { sayEl.setAttribute('data-off', ''); saidT = 0; }
      // over when everything is down or gone, or after long enough
      if (!over && (A.every(a => a.gone || !a.alive) || t > maxT)) setTimeout(() => end(false), A.some(a => !a.alive) ? 900 : 300), over = true;
      if (!over && !birds && A.some(a => a.alive && !a.gone && a.st === 'graze') && t > 2 && t < 2.1 && !aim) say('It stopped. Now: press, hold steady, let go.', 2.2);
    }
    raf = requestAnimationFrame(frame);
    let ended = false;
    function end(quit) {
      if (ended) return; ended = true; over = true; aim = null; sightEl.style.display = 'none';
      const used = 3 - shots;
      const box2 = document.createElement('div'); box2.className = 'h-end';
      const head = hits ? (hits > 1 ? hits + ' ' + plural + '!' : 'Got it!') : used ? 'Missed' : 'It got away';
      const sub = hits ? (hits > 1 ? 'Three shots, ' + hits + ' down.' : 'A clean shot: ' + name + '.') : used ? 'The shot cracks across the land, and it\'s gone.' : 'You never got a clean shot.';
      box2.innerHTML = `<b>${head}</b><p>${sub}</p><div class="h-row">${o.practice ? '<button type="button" class="hot" data-k="again">Next animal</button><button type="button" data-k="done">Done</button>' : '<button type="button" class="hot" data-k="done">Carry on</button>'}</div>`;
      ov.appendChild(box2);
      if (hits && SND) SND.win();
      const finish = k => { cancelAnimationFrame(raf); root.removeEventListener('resize', size); document.removeEventListener('keydown', keys, true); document.removeEventListener('keyup', keys, true); try { S.renderer.dispose(); S.renderer.forceContextLoss(); } catch (e) {} ov.remove(); document.body.classList.remove('noscroll'); if (root.Hunt.current === handle) root.Hunt.current = null; done({shots: used, hits, again: k === 'again', quit}); };
      box2.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) finish(b.dataset.k); });
      box2.querySelector('button').focus();
    }
    // the game that's up, for the test players (tools/minigames-check.mjs)
    const handle = {ov, stage: S, animals: A, fire: (x, y) => fire(x, y), end: () => end(true), state: () => ({shots, hits, t, over}), rectOf, lastShot: () => lastShot};
    root.Hunt.current = handle;
    return handle;
  }
  const cap = t => t.charAt(0).toUpperCase() + t.slice(1);

  // the practice range: one animal after another, a running score
  function practice(o, done) {
    const pool = o.pool || [['rabbit', 1], ['squirrel', 0.8], ['quail', 0.7], ['dove', 0.7], ['turkey', 0.5], ['deer', 0.3]];
    let rounds = 0, got = 0, shotsAll = 0;
    const next = () => {
      let r = Math.random() * pool.reduce((a, x) => a + x[1], 0), sp = pool[0][0]; for (const x of pool) { r -= x[1]; if (r <= 0) { sp = x[0]; break; } }
      const n = sp === 'quail' ? 6 : sp === 'dove' ? 3 : 1;
      play(Object.assign({}, o, {sp, n, practice: true}), res => { rounds++; got += res.hits; shotsAll += res.shots; if (res.again) next(); else done({rounds, hits: got, shots: shotsAll}); });
    };
    next();
  }
  root.Hunt = {play, practice, KIND};
})(typeof window !== 'undefined' ? window : globalThis);
