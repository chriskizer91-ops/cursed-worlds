// fishing.js: the fishing game. A plain 2D canvas (no three.js). Defines window.Fishing.
//
// You stand on the bank and see the water cut away like a fish tank: the place's own painting above the surface, and
// below it the water, made in code: weeds, stones, a sunken branch, the light coming down, and the fish. Press and hold
// to swing the rod, let go to cast. Pick whether the bait hangs near the top or lies on the bottom: sunfish and bass feed
// up high, catfish and drum on the bottom, gar right under the surface. Little bobs of the float are nibbles: wait.
// When it goes under, tap to set the hook. Then hold to reel and let go when the line goes red, or it snaps and takes the
// hook. Let it go slack too long and the fish throws the hook. An hour on the bank is a minute of play.
//
// Fishing.play(o, done): o = {painting (an Image), spot ([x, y] painting px), place ('pond' | 'river' | 'creek'), month,
//   hour, name (the place's name), pool ({rate, list: [[sp, weight]], bait, hooks, level} from the game), fish (the game's
//   D.FISH), seen ({sp: best kg so far}), lb (kg -> '1.2 lb'), practice, minutes}. done({fish: [{sp, kg}], lost, quit}).
// Fishing.practice(o, done): the practice pond, no clock, nothing kept.
// Fishing.drawFish(g, sp, len, opts): draws one fish, nose to the right, centred on 0,0 (for the catch log too).
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  const rr = (a, b) => a + (b - a) * Math.random();
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const hash = (i, s) => { const x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return x - Math.floor(x); };

  // ---------- how each fish looks and lives ----------
  // h: body depth / length. hx: where it's deepest (0 nose, 1 tail). hump: a high back (+) or a full belly (-).
  // Lc: length in cm of a 1 kg fish (length goes with the cube root of weight). zone: the depths it feeds at (0 surface,
  // 1 the deepest water). bottom: feeds on the bottom. nib: how many nibbles before it bites. hookset: how often a good
  // strike hooks it. paper: a thin mouth the hook tears out of. jump: jumps when hooked.
  const LOOK = {
    bluegill: {h: 0.52, hx: 0.4, hump: 0.06, head: 'round', tail: 'notch', dorsal: 'sun', back: '#3d5a52', side: '#7c8e6c', belly: '#eaa24a', fin: '#55665a', pat: 'bars', patC: 'rgba(30,45,55,.3)', ear: '#101418', Lc: 34, zone: [0.04, 0.55], nib: [2, 4], thief: true},
    longear: {h: 0.47, hx: 0.4, hump: 0.06, head: 'round', tail: 'notch', dorsal: 'sun', back: '#6a5634', side: '#d9752c', belly: '#f4a83a', fin: '#c0662e', pat: 'squig', patC: '#3fc8d2', ear: '#121618', earEdge: '#eef4f2', earLong: true, Lc: 34, zone: [0.04, 0.5], nib: [1, 3], thief: true},
    greensunfish: {h: 0.4, hx: 0.38, hump: 0.04, head: 'round', tail: 'notch', dorsal: 'sun', back: '#36553e', side: '#6e8a58', belly: '#d9c068', fin: '#4c6648', finEdge: '#ecc84a', pat: 'face', patC: '#53b4bc', ear: '#141c18', mouth: 'big', Lc: 34, zone: [0.02, 0.45], nib: [1, 3]},
    crappie: {h: 0.42, hx: 0.46, hump: 0.14, head: 'pointed', tail: 'notch', dorsal: 'crap', back: '#56684f', side: '#c6d0be', belly: '#eef0e6', fin: '#98a68e', pat: 'mottle', patC: 'rgba(46,66,52,.55)', Lc: 36, zone: [0.2, 0.7], nib: [0, 2], paper: true},
    bass: {h: 0.3, hx: 0.42, hump: 0, head: 'pointed', tail: 'notch', dorsal: 'bass', back: '#3a5630', side: '#8aa05c', belly: '#eef0d8', fin: '#6a8050', pat: 'stripe', patC: 'rgba(28,42,24,.7)', mouth: 'big', Lc: 40, zone: [0.06, 0.6], nib: [0, 1], jump: true},
    spottedbass: {h: 0.28, hx: 0.42, hump: 0, head: 'pointed', tail: 'notch', dorsal: 'bass', back: '#4a5832', side: '#9ca262', belly: '#eceed6', fin: '#76804e', pat: 'diamond', patC: 'rgba(40,46,24,.65)', Lc: 40, zone: [0.15, 0.7], nib: [0, 1], jump: true},
    whitebass: {h: 0.36, hx: 0.4, hump: 0.16, head: 'pointed', tail: 'fork', dorsal: 'bass', back: '#56646e', side: '#d6dcdf', belly: '#f4f6f4', fin: '#a6b0b3', pat: 'lines', patC: 'rgba(40,50,60,.5)', Lc: 38, zone: [0.15, 0.6], nib: [0, 1]},
    catfish: {h: 0.22, hx: 0.3, hump: 0.04, head: 'flat', tail: 'fork', dorsal: 'cat', back: '#4a5866', side: '#8a98a2', belly: '#eef0ec', fin: '#5d6a74', pat: 'spots', patC: 'rgba(20,25,30,.75)', barbels: '#2e3238', Lc: 44, zone: [0.5, 1], bottom: true, nib: [1, 3]},
    bullhead: {h: 0.25, hx: 0.3, hump: 0.04, head: 'flat', tail: 'round', dorsal: 'cat', back: '#5a4824', side: '#a8883e', belly: '#f0e2a8', fin: '#6a5830', pat: 'mottle', patC: 'rgba(52,40,18,.35)', barbels: '#f2efe2', Lc: 40, zone: [0.45, 1], bottom: true, nib: [1, 3]},
    bluecat: {h: 0.24, hx: 0.28, hump: 0.1, head: 'flat', tail: 'fork', dorsal: 'cat', back: '#3c5064', side: '#7e92a6', belly: '#e8ecee', fin: '#4a5c6e', barbels: '#2a3440', Lc: 44, zone: [0.6, 1], bottom: true, nib: [0, 2]},
    flathead: {h: 0.2, hx: 0.3, hump: 0, head: 'flat', tail: 'square', dorsal: 'cat', back: '#58482a', side: '#a68e4c', belly: '#e8dcb0', fin: '#685434', pat: 'mottle', patC: 'rgba(44,34,14,.6)', barbels: '#3a3020', jaw: true, Lc: 44, zone: [0.65, 1], bottom: true, nib: [0, 1]},
    drum: {h: 0.38, hx: 0.32, hump: 0.3, head: 'round', tail: 'round', dorsal: 'drum', back: '#666c72', side: '#bcc2c4', belly: '#eceee8', fin: '#9aa0a2', Lc: 38, zone: [0.5, 1], bottom: true, nib: [0, 2]},
    spottedgar: {h: 0.13, hx: 0.5, hump: 0, head: 'gar', snout: 0.12, tail: 'gar', dorsal: 'gar', back: '#48502e', side: '#8a8a56', belly: '#e0dcc0', fin: '#6a6a40', pat: 'spots', patC: 'rgba(28,28,18,.8)', spotsAll: true, Lc: 70, zone: [0, 0.28], nib: [0, 2], hookset: 0.75},
    longnosegar: {h: 0.1, hx: 0.5, hump: 0, head: 'gar', snout: 0.25, tail: 'gar', dorsal: 'gar', back: '#4c5838', side: '#9a9a68', belly: '#e4e0c8', fin: '#72704a', pat: 'spots', patC: 'rgba(30,30,20,.7)', Lc: 75, zone: [0, 0.3], nib: [0, 2], hookset: 0.55},
    alligatorgar: {h: 0.15, hx: 0.48, hump: 0.02, head: 'gar', snout: 0.11, broad: true, tail: 'gar', dorsal: 'gar', back: '#46462c', side: '#7a7850', belly: '#d6d0b0', fin: '#5e5c3a', pat: 'spots', patC: 'rgba(30,28,16,.6)', Lc: 50, zone: [0.05, 0.65], nib: [0, 1], hookset: 0.8}
  };
  const lookOf = sp => LOOK[sp] || LOOK.bluegill;
  const lengthCm = (sp, kg) => lookOf(sp).Lc * Math.cbrt(Math.max(0.01, kg));
  // how long to draw a fish so it and its fins fit a w x h box
  const fitLen = (sp, w, h) => Math.min(w * 0.88, h * 0.92 / (1.9 * lookOf(sp).h));

  // ---------- drawing a fish ----------
  // nose to the right (+x), centred on 0,0, len pixels long. opts: {ph (swim phase), murk (0 in clear water, 1 a shadow),
  // water (the color it fades to), seed}
  function drawFish(g, sp, len, opts) {
    const L = lookOf(sp), o = opts || {}, ph = o.ph || 0;
    const sn = (L.snout || 0) * len, tl = len * (L.tail === 'gar' ? 0.16 : 0.2), bl = len - tl - sn;
    const nose = len / 2 - sn, H = bl * L.h / (1 - (L.snout || 0) - 0.2) * 1.05;
    const N = 26;
    // the body's outline: half-height at each point from nose (u = 0) to the root of the tail (u = 1)
    const half = u => {
      const v = u < L.hx ? 0.5 * u / L.hx : 0.5 + 0.5 * (u - L.hx) / (1 - L.hx);
      let s = Math.pow(Math.sin(Math.PI * v * 0.88), 0.72);
      if (u < 0.14) s *= L.head === 'pointed' || L.head === 'gar' ? 0.35 + 0.65 * u / 0.14 : Math.sqrt(0.25 + 0.75 * u / 0.14);
      return s * H / 2;
    };
    const X = u => nose - u * bl;
    const top = u => -half(u) * (1 + L.hump * Math.sin(Math.PI * Math.min(1, u * 1.4))) - (L.head === 'flat' && u < 0.3 ? -half(u) * 0.12 * (1 - u / 0.3) : 0);
    const bot = u => half(u) * (1 - L.hump * 0.4 * Math.sin(Math.PI * u)) + (L.head === 'flat' && u < 0.2 ? half(u) * 0.08 : 0);
    const wob = Math.sin(ph) * 0.04 * H;
    const bodyPath = () => {
      g.beginPath(); g.moveTo(X(0), (top(0) + bot(0)) / 2);
      for (let i = 1; i <= N; i++) { const u = i / N; g.lineTo(X(u), top(u) + wob * u * u); }
      for (let i = N; i >= 0; i--) { const u = i / N; g.lineTo(X(u), bot(u) + wob * u * u); }
      g.closePath();
    };
    const lw = Math.max(1, len / 90);
    g.save();
    g.lineJoin = 'round'; g.lineCap = 'round';
    const murk = o.murk > 0.02 ? clamp(o.murk, 0, 0.92) : 0;
    const finFill = (path, a) => { g.globalAlpha = a; g.fillStyle = L.fin; path(); g.fill(); if (murk) { g.globalAlpha = a * murk; g.fillStyle = o.water || '#22301c'; path(); g.fill(); } g.globalAlpha = 1; g.strokeStyle = 'rgba(20,24,20,.55)'; g.lineWidth = lw * 0.8; path(); g.stroke(); };
    // the tail, swept side to side (it looks narrower as it turns away)
    const tb = X(1), th = half(1) * 0.9, sw = 0.72 + 0.28 * Math.cos(ph), tw = tl * sw, ty = wob;
    const tailPath = () => {
      g.beginPath(); g.moveTo(tb + 2, ty - th);
      const T = L.tail, hh = H * (T === 'gar' ? 0.42 : 0.62);
      if (T === 'fork') { g.lineTo(tb - tw, ty - hh); g.lineTo(tb - tw * 0.55, ty); g.lineTo(tb - tw, ty + hh); }
      else if (T === 'notch') { g.quadraticCurveTo(tb - tw * 0.7, ty - hh * 1.05, tb - tw, ty - hh * 0.9); g.lineTo(tb - tw * 0.8, ty); g.lineTo(tb - tw, ty + hh * 0.9); g.quadraticCurveTo(tb - tw * 0.7, ty + hh * 1.05, tb + 2, ty + th); }
      else if (T === 'square') { g.lineTo(tb - tw, ty - hh * 0.8); g.lineTo(tb - tw * 1.04, ty + hh * 0.8); }
      else { g.quadraticCurveTo(tb - tw * 0.6, ty - hh, tb - tw, ty - hh * 0.2); g.quadraticCurveTo(tb - tw * 1.1, ty + hh * 0.4, tb - tw * 0.55, ty + hh * 0.85); }
      g.lineTo(tb + 2, ty + th); g.closePath();
    };
    finFill(tailPath, 0.95);
    // the fins along the back and belly
    const along = (u0, u1, hgt, side, spiky) => () => {
      g.beginPath(); const f = side < 0 ? top : bot; g.moveTo(X(u0), f(u0));
      const n = 8;
      for (let i = 0; i <= n; i++) { const u = u0 + (u1 - u0) * i / n, k = Math.sin(Math.PI * Math.min(1, (i + 0.6) / (n + 0.6))), hh = hgt(i / n) * k; g.lineTo(X(u), f(u) + side * hh * (spiky && i % 2 ? 0.75 : 1)); }
      g.lineTo(X(u1), f(u1)); g.closePath();
    };
    const D = L.dorsal;
    if (D === 'sun') { finFill(along(0.36, 0.62, () => H * 0.24, -1, true), 0.9); finFill(along(0.6, 0.93, i => H * (0.26 + 0.12 * Math.sin(Math.PI * i)), -1), 0.85); finFill(along(0.62, 0.93, () => H * 0.24, 1), 0.85); }
    else if (D === 'bass') { finFill(along(0.32, 0.58, () => H * 0.38, -1, true), 0.88); finFill(along(0.6, 0.88, () => H * 0.4, -1), 0.88); finFill(along(0.66, 0.88, () => H * 0.34, 1), 0.85); }
    else if (D === 'crap') { finFill(along(0.48, 0.92, i => H * (0.38 + 0.2 * Math.sin(Math.PI * i)), -1, true), 0.88); finFill(along(0.5, 0.92, () => H * 0.42, 1), 0.85); }
    else if (D === 'cat') { finFill(along(0.26, 0.38, i => H * (0.75 - 0.4 * i), -1), 0.9); finFill(along(0.8, 0.9, () => H * 0.18, -1), 0.9); finFill(along(0.58, 0.95, () => H * 0.3, 1), 0.85); }
    else if (D === 'drum') { finFill(along(0.3, 0.46, () => H * 0.3, -1, true), 0.88); finFill(along(0.47, 0.94, () => H * 0.24, -1), 0.85); finFill(along(0.72, 0.86, () => H * 0.32, 1), 0.85); }
    else if (D === 'gar') { finFill(along(0.8, 0.95, () => H * 0.55, -1), 0.9); finFill(along(0.8, 0.95, () => H * 0.5, 1), 0.88); }
    if (L.finEdge) { g.strokeStyle = L.finEdge; g.lineWidth = lw * 1.2; along(0.6, 0.93, () => H * 0.32, -1)(); g.stroke(); }
    // the pelvic fin
    finFill(() => { const u = 0.36, x = X(u), y = bot(u); g.beginPath(); g.moveTo(x + H * 0.05, y - 1); g.lineTo(x - H * 0.18, y + H * 0.22); g.lineTo(x - H * 0.24, y + H * 0.06); g.closePath(); }, 0.85);
    // the gar's snout, before the body so the head covers its root
    if (sn) {
      const sh = L.broad ? H * 0.2 : H * 0.11, x0 = X(0) + 2;
      g.fillStyle = L.back; g.beginPath(); g.moveTo(x0, -sh * 1.6); g.quadraticCurveTo(x0 + sn * 0.5, -sh * 1.1, x0 + sn, -sh * 0.3); g.lineTo(x0 + sn, sh * 0.3); g.quadraticCurveTo(x0 + sn * 0.5, sh, x0, sh * 1.6); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(20,24,20,.6)'; g.lineWidth = lw; g.stroke();
      g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0 + sn * 0.98, 0); g.stroke();
      g.fillStyle = '#f1efe2'; for (let i = 1; i < 9; i++) { g.beginPath(); g.arc(x0 + sn * i / 9.5, 0.6, Math.max(0.6, sh * 0.16), 0, Math.PI); g.fill(); }
    }
    // the body: dark back, the side's color, a pale belly
    const gr = g.createLinearGradient(0, -H / 2, 0, H / 2);
    gr.addColorStop(0, L.back); gr.addColorStop(0.42, L.side); gr.addColorStop(0.7, L.side); gr.addColorStop(1, L.belly);
    g.fillStyle = gr; bodyPath(); g.fill();
    // the markings, kept inside the body
    g.save(); bodyPath(); g.clip();
    const seed = o.seed || 1, P = L.pat;
    g.fillStyle = L.patC; g.strokeStyle = L.patC;
    if (P === 'bars') for (let i = 0; i < 7; i++) { const u = 0.22 + i * 0.1; g.globalAlpha = 0.9; g.fillRect(X(u) - bl * 0.03, -H, bl * 0.045, H * 1.6); }
    else if (P === 'stripe') { g.beginPath(); for (let i = 0; i <= 16; i++) { const u = 0.12 + i * 0.055, y = -H * 0.02 + Math.sin(i * 1.9) * H * 0.05; g.ellipse(X(u), y, bl * 0.04, H * (0.1 + 0.05 * hash(i, 3)), 0, 0, TAU); } g.fill(); }
    else if (P === 'diamond') { for (let i = 0; i < 10; i++) { const u = 0.15 + i * 0.08; g.beginPath(); g.moveTo(X(u), -H * 0.12); g.lineTo(X(u) - bl * 0.035, 0); g.lineTo(X(u), H * 0.1); g.lineTo(X(u) + bl * 0.035, 0); g.fill(); } g.globalAlpha = 0.6; for (let r = 0; r < 3; r++) for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(X(0.2 + i * 0.06), H * (0.18 + r * 0.08), Math.max(0.6, H * 0.025), 0, TAU); g.fill(); } g.globalAlpha = 1; }
    else if (P === 'lines') { g.lineWidth = Math.max(0.7, H * 0.025); for (let r = -3; r <= 3; r++) { g.beginPath(); g.moveTo(X(0.12), r * H * 0.09); g.lineTo(X(1), r * H * 0.06 + wob); g.stroke(); } }
    else if (P === 'spots') { const n = L.spotsAll ? 60 : 34; for (let i = 0; i < n; i++) { const u = (L.spotsAll ? 0.05 : 0.15) + (L.spotsAll ? 0.95 : 0.8) * hash(i, seed + 1), y = (hash(i, seed + 2) - 0.5) * H * 0.9; if (!L.spotsAll && sp.indexOf('gar') >= 0 && u < 0.55) continue; g.beginPath(); g.arc(X(u), y, Math.max(0.7, H * (0.03 + 0.03 * hash(i, seed + 3))), 0, TAU); g.fill(); } }
    else if (P === 'mottle') { for (let i = 0; i < 18; i++) { const u = 0.1 + 0.88 * hash(i, seed + 4), y = (hash(i, seed + 5) - 0.6) * H * 0.8; g.beginPath(); g.ellipse(X(u), y, bl * (0.03 + 0.03 * hash(i, 6)), H * (0.07 + 0.07 * hash(i, 7)), hash(i, 8) * 3, 0, TAU); g.fill(); } }
    else if (P === 'squig') { g.lineWidth = Math.max(0.8, H * 0.035); for (let r = 0; r < 6; r++) { g.beginPath(); for (let i = 0; i <= 20; i++) { const u = 0.08 + i * 0.045, y = -H * 0.25 + r * H * 0.1 + Math.sin(i * 1.7 + r * 2) * H * 0.04; i ? g.lineTo(X(u), y) : g.moveTo(X(u), y); } g.stroke(); } }
    else if (P === 'face') { g.lineWidth = Math.max(0.8, H * 0.03); for (let r = 0; r < 3; r++) { g.beginPath(); g.moveTo(X(0.03), -H * 0.05 + r * H * 0.07); g.quadraticCurveTo(X(0.12), -H * 0.1 + r * H * 0.07, X(0.22), -H * 0.02 + r * H * 0.08); g.stroke(); } }
    // a soft shine along the side
    const sh = g.createLinearGradient(0, -H / 2, 0, H / 2); sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.3, 'rgba(255,255,255,.16)'); sh.addColorStop(0.45, 'rgba(255,255,255,0)');
    g.fillStyle = sh; g.globalAlpha = 1; g.fillRect(X(1), -H, bl, H * 2);
    g.restore();
    g.strokeStyle = 'rgba(16,20,18,.8)'; g.lineWidth = lw; bodyPath(); g.stroke();
    // the head: gill cover, ear flap, eye, mouth, whiskers
    const gx = X(L.head === 'gar' ? 0.17 : 0.24);
    g.strokeStyle = 'rgba(16,20,18,.45)'; g.lineWidth = lw * 0.9; g.beginPath(); g.moveTo(gx + H * 0.06, top(0.24) * 0.75); g.quadraticCurveTo(gx - H * 0.12, 0, gx + H * 0.04, bot(0.24) * 0.7); g.stroke();
    if (L.ear) {
      const ex = gx - H * 0.02, ey = -H * 0.06, ew = L.earLong ? H * 0.28 : H * 0.13;
      g.fillStyle = L.ear; g.beginPath(); g.ellipse(ex - ew * 0.4, ey, ew, H * 0.08, -0.15, 0, TAU); g.fill();
      if (L.earEdge) { g.strokeStyle = L.earEdge; g.lineWidth = lw; g.stroke(); }
    }
    const ex = X(L.head === 'gar' ? 0.06 : L.head === 'flat' ? 0.09 : 0.08), ey = top(0.08) * (L.head === 'flat' ? 0.45 : 0.42), er = Math.max(1.4, H * (L.head === 'gar' ? 0.17 : 0.1));
    g.fillStyle = '#e8d890'; g.beginPath(); g.arc(ex, ey, er, 0, TAU); g.fill();
    g.fillStyle = '#0c0e10'; g.beginPath(); g.arc(ex + er * 0.12, ey, er * 0.66, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(ex + er * 0.35, ey - er * 0.3, er * 0.22, 0, TAU); g.fill();
    if (!sn) {
      const mx = X(0), my = (top(0) + bot(0)) / 2 + H * 0.02, mw = H * (L.mouth === 'big' ? 0.3 : L.head === 'flat' ? 0.2 : 0.12);
      g.strokeStyle = 'rgba(16,20,18,.75)'; g.lineWidth = lw; g.beginPath(); g.moveTo(mx, my); g.lineTo(mx - mw, my + H * 0.04); g.stroke();
      if (L.jaw) { g.fillStyle = L.belly; g.beginPath(); g.ellipse(mx - mw * 0.2, my + H * 0.07, mw * 0.5, H * 0.05, 0.1, 0, TAU); g.fill(); }
    }
    if (L.barbels) {
      g.strokeStyle = L.barbels; g.lineWidth = Math.max(0.8, lw * 0.9);
      const mx = X(0.02), my = (top(0) + bot(0)) / 2;
      [[-0.1, -0.45, 0.6], [0, 0.35, 0.55], [0.05, 0.5, 0.42], [-0.05, 0.25, 0.35]].forEach((b, i) => { g.beginPath(); g.moveTo(mx, my + H * b[0]); g.quadraticCurveTo(mx + H * 0.3, my + H * (b[1] + Math.sin(ph + i) * 0.04), mx + H * 0.1 * i - H * 0.05, my + H * (b[1] + b[2] * (i ? 0.8 : -0.4))); g.stroke(); });
    }
    // the pectoral fin, see-through, over the side
    g.globalAlpha = 0.55 * (1 - murk); g.fillStyle = L.fin; g.beginPath(); const px = gx - H * 0.08, py = H * 0.12; g.ellipse(px - H * 0.14, py + Math.sin(ph * 1.3) * H * 0.02, H * 0.2, H * 0.07, 0.5, 0, TAU); g.fill(); g.globalAlpha = 1;
    // in muddy or dark water, a shadow more than a fish
    if (murk) { g.globalAlpha = murk; g.fillStyle = o.water || '#22301c'; bodyPath(); g.fill(); tailPath(); g.fill(); g.globalAlpha = 1; }
    g.restore();
  }

  // ---------- the water ----------
  const WATER = {
    pond: {top: '#55703e', bot: '#1f2c1a', murk: 0.45, deep: 0.92, weeds: 1, log: true},
    river: {top: '#6e6c46', bot: '#2a281a', murk: 0.62, deep: 1, weeds: 0.3, log: false},
    creek: {top: '#4d8a7f', bot: '#1d3a38', murk: 0.15, deep: 0.72, weeds: 0.6, log: true}
  };

  let css = false;
  function style() {
    if (css) return; css = true;
    const st = document.createElement('style');
    st.textContent = `.fishing{position:fixed;inset:0;z-index:60;background:#0b1014;touch-action:none;user-select:none;-webkit-user-select:none;font-family:var(--font-ui,system-ui,sans-serif);color:#15212b}
.fishing canvas.f-cv{position:absolute;inset:0;width:100%;height:100%;display:block}
.fishing .f-top{position:absolute;left:10px;right:10px;top:calc(10px + env(safe-area-inset-top,0px));display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:7px 8px;pointer-events:none}
.fishing .f-where{overflow:hidden;text-overflow:ellipsis;justify-self:start;max-width:100%}
.fishing .f-chip{background:rgba(244,247,247,.92);border-radius:10px;padding:6px 10px;font-weight:700;font-size:14.5px;box-shadow:0 2px 10px rgba(0,0,0,.25);white-space:nowrap}
.fishing .f-clock{grid-column:1/-1;height:8px;border-radius:999px;background:rgba(21,33,43,.55);overflow:hidden;box-shadow:inset 0 0 0 1.5px rgba(244,247,247,.6)}
.fishing .f-clock i{display:block;height:100%;width:0;background:linear-gradient(90deg,#f0c85a,#e0803a)}
.fishing .f-ten{position:absolute;left:50%;top:calc(68px + env(safe-area-inset-top,0px));transform:translateX(-50%);width:min(300px,76%);display:none}
.fishing .f-ten b{display:block;text-align:center;color:#fff;font-size:13px;text-shadow:0 1px 2px #000;margin-bottom:3px}
.fishing .f-bar{position:relative;height:16px;border-radius:999px;background:linear-gradient(90deg,#4caf6a 0 58%,#e8c34a 58% 82%,#d8452a 82%);box-shadow:0 0 0 2px rgba(244,247,247,.85),0 2px 8px rgba(0,0,0,.4)}
.fishing .f-bar i{position:absolute;top:-4px;bottom:-4px;width:5px;margin-left:-2.5px;border-radius:3px;background:#fff;box-shadow:0 0 0 1.5px #15212b;left:0}
.fishing .f-say{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(122px + env(safe-area-inset-bottom,0px));max-width:90%;background:rgba(244,247,247,.94);border-radius:14px;padding:7px 13px;font-size:14.5px;text-align:center;pointer-events:none;transition:opacity .3s;box-shadow:0 2px 10px rgba(0,0,0,.3)}
.fishing .f-say[data-off]{opacity:0}
.fishing .f-bot{position:absolute;left:10px;right:10px;bottom:calc(14px + env(safe-area-inset-bottom,0px));display:flex;gap:8px;align-items:center}
.fishing .f-bot button{white-space:nowrap;border:0;border-radius:999px;padding:10px 14px;font:inherit;font-weight:700;font-size:14px;background:rgba(244,247,247,.94);color:#15212b;box-shadow:0 2px 8px rgba(0,0,0,.3)}
.fishing .f-bot button[hidden]{display:none}
.fishing .f-bot .f-reel{position:absolute;right:0;bottom:56px;background:#2d5a6a;color:#fff;padding:12px 18px;font-size:15px}
.fishing .f-bot .f-depth{display:flex;background:rgba(244,247,247,.94);border-radius:999px;padding:3px;box-shadow:0 2px 8px rgba(0,0,0,.3)}
.fishing .f-bot .f-depth button{box-shadow:none;background:transparent;padding:7px 11px;font-size:13.5px}
.fishing .f-bot .f-depth button[aria-pressed="true"]{background:#2d5a6a;color:#fff}
.fishing .f-bot .f-gap{flex:1}
.fishing .f-bot .f-depth .lbl{align-self:center;padding:0 4px 0 9px;font-size:13px;font-weight:700;color:#435561}
.fishing .f-card{position:absolute;left:50%;top:46%;transform:translate(-50%,-50%);width:min(330px,90%);background:#f6f3ea;border-radius:16px;padding:14px 16px 16px;text-align:center;box-shadow:0 12px 34px rgba(0,0,0,.5)}
.fishing .f-card canvas{width:100%;height:auto;display:block;margin:0 auto 6px;border-radius:10px;background:linear-gradient(#d8e4e2,#bccfcc)}
.fishing .f-card .tag{display:inline-block;background:#e0521b;color:#fff;font-weight:800;font-size:12px;letter-spacing:.06em;text-transform:uppercase;border-radius:999px;padding:3px 9px;margin-bottom:6px}
.fishing .f-card .tag.gold{background:#b8862a}
.fishing .f-card b{display:block;font-size:20px}
.fishing .f-card i{display:block;color:#5a6a70;font-size:13px;margin-bottom:6px}
.fishing .f-card .wt{font-size:17px;font-weight:700;margin:0 0 6px}
.fishing .f-card p{margin:0 0 12px;color:#435561;font-size:14px;line-height:1.4;text-align:left}
.fishing .f-card .f-row{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
.fishing .f-card button{border:0;border-radius:999px;padding:10px 18px;font:inherit;font-weight:700;font-size:15px;background:#e3eaec;color:#15212b}
.fishing .f-card button.hot{background:#2d5a6a;color:#fff}
.fishing .f-card ul{list-style:none;margin:0 0 12px;padding:0;text-align:left;font-size:14.5px}
.fishing .f-card li{display:flex;align-items:center;gap:8px;padding:3px 0;border-bottom:1px solid #e2ddd0}
.fishing .f-card li canvas{width:64px;height:28px;margin:0;background:none;flex:none}
.fishing .f-card li span{flex:1}`;
    document.head.appendChild(st);
  }

  function play(o, done) {
    style();
    const place = WATER[o.place] ? o.place : 'pond', W0 = WATER[place], FISH = o.fish || {}, pool = o.pool || {rate: 1, list: [['bluegill', 1]], hooks: 8, level: 1};
    const level = clamp(pool.level || 1, 1, 10), minutes = o.minutes || 60, lbOf = o.lb || (kg => (kg * 2.2046).toFixed(1) + ' lb');
    const nameOf = sp => (FISH[sp] && FISH[sp].name) || sp, SND = root.GameSound || null;
    const night = o.hour < 5.5 || o.hour > 20.5, dusk = !night && (o.hour < 7 || o.hour > 18.8), winter = [11, 0, 1].indexOf(o.month) >= 0;
    const murkBase = clamp(W0.murk + (night ? 0.3 : dusk ? 0.1 : 0), 0, 0.9);

    const ov = document.createElement('div'); ov.className = 'fishing'; ov.id = 'fishing'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Fishing');
    ov.innerHTML = `<canvas class="f-cv" aria-hidden="true"></canvas>
<div class="f-top"><span class="f-chip f-where"></span><span class="f-chip f-left"></span><span class="f-clock" aria-hidden="true"><i></i></span></div>
<div class="f-ten" aria-hidden="true"><b>Line</b><div class="f-bar"><i></i></div></div>
<p class="f-say" aria-live="polite"></p>
<div class="f-bot"><span class="f-depth" role="group" aria-label="Where the bait hangs"><span class="lbl">Bait</span><button type="button" data-d="top" aria-pressed="true">High</button><button type="button" data-d="bot" aria-pressed="false">Bottom</button></span><span class="f-gap"></span><button type="button" class="f-reel" hidden>Reel in</button><button type="button" class="f-quit">${o.practice ? 'Done' : 'Head back'}</button></div>`;
    document.body.appendChild(ov); document.body.classList.add('noscroll');
    const cv = ov.querySelector('canvas'), g = cv.getContext('2d'), sayEl = ov.querySelector('.f-say'), tenEl = ov.querySelector('.f-ten'), needle = ov.querySelector('.f-bar i');
    const clockEl = ov.querySelector('.f-clock i'), leftEl = ov.querySelector('.f-left'), reelBtn = ov.querySelector('.f-reel');
    ov.querySelector('.f-where').textContent = o.name || 'Fishing';
    if (o.practice) ov.querySelector('.f-clock').style.visibility = 'hidden';

    // ---------- the layout: x is 0 at the bank to 1 at the right edge; y is 0 at the surface to 1 at the deepest ----------
    let W = 0, H = 0, dpr = 1, surfY = 0, shoreX = 0, floorY = 0;
    function size() {
      const r = ov.getBoundingClientRect(); W = r.width; H = r.height; dpr = Math.min(2, root.devicePixelRatio || 1);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      surfY = Math.round(H * 0.3); shoreX = W * 0.13; floorY = H * 0.9;
    }
    size(); root.addEventListener('resize', size);
    const SX = x => shoreX + x * (W - shoreX + 4), SY = y => surfY + y * (floorY - surfY);
    const bottom = x => clamp((0.16 + 0.82 * smooth(clamp(x / 0.82, 0, 1)) + 0.025 * Math.sin(x * 19)) * W0.deep, 0.1, 1);
    function smooth(t) { return t * t * (3 - 2 * t); }
    const pxPerM = () => W * 0.6;
    const lenPx = (sp, kg) => clamp(lengthCm(sp, kg) / 100 * pxPerM(), 16, W * 1.3);

    // ---------- what's on the line ----------
    const st = {mode: 'ready', t: 0, clock: 0, power: 0, charge: 0, cast: null, bob: {x: 0.5, dip: 0, under: 0}, hook: {x: 0.5, y: 0.3}, deep: false, bait: true, reeling: false, reelK: 0,
      ten: 0, red: 0, slack: 0, fish: null, caught: [], lost: 0, paused: false, saidT: 0, tipsLeft: {nib: 2, deep: 1, red: 2}, n: {}};
    const cnt = k => { st.n[k] = (st.n[k] || 0) + 1; };
    const hooksLeft = () => o.practice ? 99 : (pool.hooks || 0) - st.lost;
    const fishes = [], minnows = [], fx = [], motes = [];
    for (let i = 0; i < 40; i++) motes.push({x: Math.random(), y: Math.random(), s: rr(0.6, 1.8), v: rr(-0.004, 0.006)});
    const school = {x: rr(0.3, 0.7), y: rr(0.15, 0.35), vx: rr(0.03, 0.05) * (Math.random() < 0.5 ? -1 : 1), t: 0};
    for (let i = 0; i < 9; i++) minnows.push({dx: rr(-0.05, 0.05), dy: rr(-0.03, 0.03), ph: rr(0, TAU)});

    function say(text, secs) { sayEl.textContent = text; sayEl.removeAttribute('data-off'); st.saidT = st.t + (secs || 2.6); }
    say('Press and hold to swing the rod. Let go to cast.', 4);
    function setLeft() { leftEl.textContent = (o.practice ? '' : '🪝 ' + hooksLeft() + '  ') + '🐟 ' + st.caught.length; }
    setLeft();

    // the depth the bait hangs at, under the float
    function hookAt(x) { const b = bottom(x); return st.deep ? b - 0.025 : Math.min(0.24, b - 0.05); }
    ov.querySelector('.f-depth').addEventListener('click', e => {
      const b = e.target.closest('[data-d]'); if (!b || st.mode === 'fight' || st.mode === 'card') return;
      st.deep = b.dataset.d === 'bot'; ov.querySelectorAll('.f-depth button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      if (st.mode === 'out') { st.hook.y = hookAt(st.hook.x); scareAll(0.6); }
      say(st.deep ? 'The bait lies on the bottom: catfish, drum and bullheads feed there.' : 'The bait hangs up high: sunfish, bass, crappie and gar feed up there.', 3);
    });
    reelBtn.addEventListener('click', () => { if (st.mode === 'out') reelIn(); });
    ov.querySelector('.f-quit').addEventListener('click', () => { if (st.mode !== 'card' && st.mode !== 'end') finish(true); });
    const keys = e => { if (e.key === 'Tab' || e.target.closest && e.target.closest('.f-card,.f-bot')) return; e.stopPropagation(); if (e.key === 'Escape' && e.type === 'keydown' && st.mode !== 'card' && st.mode !== 'end') finish(true); };
    document.addEventListener('keydown', keys, true); document.addEventListener('keyup', keys, true);

    // ---------- casting ----------
    const rodBase = () => [-W * 0.02, surfY + H * 0.08], rodTip = () => [W * 0.2 - st.ten * W * 0.03, surfY - H * 0.1 + st.ten * H * 0.05];
    function startCharge() { st.mode = 'charge'; st.charge = 0; }
    function cast() {
      st.casts = (st.casts || 0) + 1;
      const x = 0.1 + st.power * 0.84; st.mode = 'flying'; st.cast = {t: 0, x};
      if (SND) SND.tick();
    }
    function landed() {
      st.mode = 'out'; st.bob.x = st.cast.x; st.hook.x = st.cast.x; st.hook.y = hookAt(st.cast.x); st.bait = true; st.cast = null;
      ripple(st.bob.x, 1); if (SND) SND.plunk();
      scareAll(0.25);
      if (st.tipsLeft.nib-- > 0) say('Watch the float. Little bobs are nibbles: wait. When it goes under, tap!', 4);
    }
    function reelIn() {
      st.mode = 'back'; st.back = {t: 0, x: st.bob.x};
      for (const f of fishes) if (f.st !== 'pass') leave(f);
    }

    // ---------- the fish ----------
    const totalW = (pool.list || []).reduce((a, x) => a + x[1], 0) || 1;
    function pickFrom(list, tot) { let r = Math.random() * tot; for (const x of list) { r -= x[1]; if (r <= 0) return x[0]; } return list[list.length - 1][0]; }
    const pickSp = () => pickFrom(pool.list, totalW);
    function weigh(sp) { const k = (FISH[sp] && FISH[sp].kg) || [0.1, 0.5], a = Math.random(), b = Math.random(); return k[0] + (k[1] - k[0]) * a * b; }
    // does the bait hang where this fish feeds?
    function fits(sp) { const L = lookOf(sp), y = st.hook.y, b = bottom(st.hook.x); if (L.bottom) return st.deep && y >= L.zone[0] - 0.05; return y >= L.zone[0] - 0.03 && y <= L.zone[1] && !(st.deep && b > 0.5 && L.zone[1] < 0.6); }
    function spawn(sp, comes) {
      const L = lookOf(sp), left = !comes && Math.random() < 0.5;
      const y = comes ? clamp(st.hook.y + rr(-0.12, 0.12), 0.04, 0.97) : clamp(rr(L.zone[0], L.zone[1]), 0.04, 0.96);
      const side = Math.random() < 0.5 && st.hook.x > 0.3 ? -1 : 1, x0 = comes ? clamp(st.hook.x + side * rr(0.22, 0.32), 0.05, 1.12) : left ? -0.15 : 1.15;
      const f = {sp, kg: weigh(sp), x: x0, y, vx: 0, vy: 0, dir: left ? 1 : -1, ph: rr(0, TAU), st: comes ? 'come' : 'pass', t: 0, seed: Math.floor(rr(1, 99)), nib: Math.round(rr(L.nib[0], L.nib[1] + 0.49)), bias: rr(-1, 1)};
      f.y = Math.min(f.y, bottom(clamp(f.x, 0, 1)) - 0.03);
      if (!comes) f.vx = (left ? 1 : -1) * rr(0.05, 0.09);
      fishes.push(f); return f;
    }
    function leave(f) { if (f.st === 'hooked' || f.st === 'landed') return; f.st = 'leave'; f.vx = (f.x > 0.5 ? 1 : (Math.random() < 0.5 ? -1 : 1)) * rr(0.18, 0.3); f.dir = Math.sign(f.vx); }
    function scareAll(r) { for (const f of fishes) if ((f.st === 'come' || f.st === 'circle') && Math.abs(f.x - st.hook.x) < r) leave(f); }
    const engaged = () => fishes.find(f => f.st === 'come' || f.st === 'circle' || f.st === 'nibble' || f.st === 'bite');
    let passT = rr(2, 5);

    // ---------- the strike ----------
    function strike() {
      const f = engaged();
      st.jerk = 0.25;
      if (f && f.st === 'bite') {
        const L = lookOf(f.sp), set = (L.hookset || 0.93) + 0.01 * (level - 1);
        if (Math.random() < set) { hookIt(f); return; }
        say(f.sp.indexOf('gar') >= 0 ? 'The hook slid off its hard, bony jaw!' : 'Missed it!', 2.2); leave(f); if (Math.random() < 0.5) st.bait = false;
      } else if (f && f.st === 'nibble') { cnt('soon');
        say(lookOf(f.sp).thief ? 'Too soon! It was only nibbling, and it stole the bait.' : 'Too soon! It was only nibbling. Wait for the float to go under.', 3);
        if (lookOf(f.sp).thief || Math.random() < 0.3) st.bait = false;
        leave(f);
      } else { say('Nothing on it yet. Wait for the float to go under.', 2.2); scareAll(0.3); }
      if (!st.bait) { say('The bait\'s gone. Reel in to bait the hook again.', 3); reelBtn.hidden = false; }
    }
    function hookIt(f) { cnt('hooked');
      st.mode = 'fight'; st.fish = f; f.st = 'hooked'; st.ten = 0.35; st.red = 0; st.slack = 0; st.reelK = 0;
      const F = FISH[f.sp] || {}, k = F.kg || [0.1, 1], sz = clamp((f.kg - k[0]) / Math.max(0.01, k[1] - k[0]), 0, 1);
      f.pull = (F.fight || 0.3) * (0.55 + 0.45 * sz); f.stam = 1; f.run = 0; f.runT = rr(1, 2.5); f.drain = 1 / (1 + Math.sqrt(f.kg) / 2);
      f.dir = 1; tenEl.style.display = 'block'; reelBtn.hidden = true;
      if (SND) SND.splash(0.8 + sz);
      ripple(f.x, 1.4); splash(f.x, 6 + Math.round(sz * 10));
      say(F.legend ? 'Something HUGE is on! Hold to reel, let go when the line goes red. Be patient!' : 'Fish on! Hold to reel in. Let go when the line goes red.', 3);
    }

    // ---------- touch ----------
    ov.addEventListener('pointerdown', e => {
      if (e.target.closest('button,.f-card')) return;
      e.preventDefault(); try { ov.setPointerCapture(e.pointerId); } catch (x) {}
      press();
    });
    function press() {
      if (st.mode === 'ready') startCharge();
      else if (st.mode === 'out') { if (st.bait) strike(); else say('The bait\'s gone. Reel in to bait the hook again.', 2.5); }
      else if (st.mode === 'fight') { st.reeling = true; if (SND) SND.reel(true); }
    }
    const up = () => {
      if (st.mode === 'charge') cast();
      if (st.reeling) { st.reeling = false; if (SND) SND.reel(false); }
    };
    ov.addEventListener('pointerup', up); ov.addEventListener('pointercancel', up);

    // ---------- effects ----------
    function ripple(x, k) { fx.push({kind: 'ring', x, t: 0, k: k || 1}); }
    function splash(x, n) { for (let i = 0; i < n; i++) fx.push({kind: 'drop', x: SX(x) + rr(-6, 6), y: surfY, vx: rr(-60, 60), vy: rr(-200, -80), t: 0}); }

    // ---------- every frame ----------
    const botApi = {press, up, card: () => { const b = ov.querySelector('.f-card button'); if (b) b.click(); }};
    function step(dt) {
      st.t += dt;
      if (o.bot) o.bot(dt, st, botApi);
      if (!o.practice && !st.paused) { st.clock += dt; clockEl.style.width = (100 * clamp(st.clock / minutes, 0, 1)) + '%'; }
      if (st.saidT && st.t > st.saidT) { sayEl.setAttribute('data-off', ''); st.saidT = 0; }
      if (st.jerk > 0) st.jerk -= dt;
      // the minnows school about
      school.t += dt; school.x += school.vx * dt; school.y += Math.sin(school.t * 0.7) * 0.01 * dt;
      if (school.x < 0.1 || school.x > 0.95) school.vx *= -1;
      for (const m of motes) { m.y += m.v * dt; m.x += 0.004 * dt * Math.sin(st.t + m.s); if (m.y < 0) m.y = 1; if (m.y > 1) m.y = 0; }
      // the cast
      if (st.mode === 'charge') { st.charge += dt; st.power = 0.5 - 0.5 * Math.cos(st.charge * 2.4); }
      if (st.mode === 'flying') { st.cast.t += dt / 0.7; if (st.cast.t >= 1) landed(); }
      if (st.mode === 'back') { st.back.t += dt / 0.9; if (st.back.t >= 1) { st.mode = 'ready'; st.bait = true; reelBtn.hidden = true; say(st.lost && hooksLeft() <= 0 ? '' : 'Baited. Press and hold, then let go to cast.', 2.2); } }
      if (st.mode === 'out') reelBtn.hidden = false;
      // fish arrive: now and then one comes to the bait (if it hangs where that fish feeds); others just pass by
      const waiting = st.mode === 'out' && st.bait;
      if (waiting && !engaged()) {
        const fl = pool.list.filter(x => fits(x[0])), fw = fl.reduce((a, x) => a + x[1], 0);
        if (fl.length && Math.random() < dt * 0.12 * (pool.rate || 1) * (0.4 + 0.6 * fw / totalW)) { spawn(pickFrom(fl, fw), true); cnt('come'); }
      }
      // others swim by, whatever the bait is doing
      passT -= dt;
      if (passT <= 0) {
        passT = rr(4, 9);
        if (fishes.length < 5) { const sp = pickSp(); spawn(sp, false); if (waiting && lookOf(sp).bottom && !st.deep && st.tipsLeft.deep-- > 0) say('A ' + nameOf(sp).toLowerCase() + ' cruised past along the bottom. Bottom fish want the bait on the bottom.', 4); }
      }
      for (const f of fishes) stepFish(f, dt);
      for (let i = fishes.length - 1; i >= 0; i--) if (fishes[i].gone) fishes.splice(i, 1);
      if (st.mode === 'fight') fight(dt);
      // the float rides the water
      st.bob.dip *= Math.pow(0.02, dt); st.bob.under += ((st.mode === 'out' && engaged() && engaged().st === 'bite' ? 1 : 0) - st.bob.under) * Math.min(1, dt * 12);
      for (const e of fx) e.t += dt;
      for (let i = fx.length - 1; i >= 0; i--) if (fx[i].t > 1.2) fx.splice(i, 1);
      // the hour's up: finish the fish on the line first
      if (!o.practice && st.clock >= minutes && st.mode !== 'fight' && st.mode !== 'card' && st.mode !== 'end') finish(false);
    }
    function stepFish(f, dt) {
      f.ph += dt * (f.st === 'hooked' ? 22 : f.st === 'leave' ? 14 : 7);
      const L = lookOf(f.sp);
      if (f.st === 'pass' || f.st === 'leave') {
        f.x += f.vx * dt; f.y += Math.sin(st.t * 0.8 + f.seed) * 0.01 * dt; f.y = Math.min(f.y, bottom(clamp(f.x, 0, 1)) - 0.03);
        f.dir = Math.sign(f.vx) || 1;
        if (f.x < -0.3 || f.x > 1.3) f.gone = true;
        return;
      }
      if (f.st === 'hooked' || f.st === 'landed') return;
      const hx = st.hook.x, hy = st.hook.y, dx = hx + 0.05 * f.bias - f.x, dy = hy - f.y;
      if (f.st === 'come') {
        const d = Math.hypot(dx, dy), v = 0.13;
        f.x += dx / (d || 1) * v * dt; f.y += dy / (d || 1) * v * dt * 0.8; f.dir = Math.sign(dx) || f.dir;
        if (d < 0.05) { f.st = 'circle'; f.t = rr(0.7, 1.8); }
      } else if (f.st === 'circle') {
        f.t -= dt; f.x = hx + 0.05 * f.bias + Math.sin(st.t * 1.6 + f.seed) * 0.03; f.y = hy + Math.cos(st.t * 1.2 + f.seed) * 0.015; f.dir = Math.cos(st.t * 1.6 + f.seed) >= 0 ? 1 : -1;
        if (f.t <= 0) { if (f.nib > 0) { f.st = 'nibble'; f.t = rr(0.5, 0.9); } else { f.st = 'bite'; f.t = 0.75 + 0.03 * level - (f.sp.indexOf('gar') >= 0 ? 0.1 : 0); bite(f); } }
      } else if (f.st === 'nibble') {
        // nose to the bait, a peck, and back
        f.dir = hx >= f.x ? 1 : -1; f.x += (hx - f.dir * 0.02 - f.x) * Math.min(1, dt * 6); f.y += (hy - f.y) * Math.min(1, dt * 6);
        f.t -= dt;
        if (f.t <= 0) {
          st.bob.dip = 0.35 + Math.random() * 0.2; ripple(st.bob.x, 0.5); if (SND) SND.tick();
          f.nib--; if (f.nib > 0) f.t = rr(0.5, 1); else { f.st = 'circle'; f.t = rr(0.3, 0.9); f.nib = 0; }
        }
      } else if (f.st === 'bite') {
        f.dir = 1; f.x += (hx - 0.01 - f.x) * Math.min(1, dt * 8); f.y += (hy + 0.03 - f.y) * Math.min(1, dt * 4);
        f.t -= dt;
        if (f.t <= 0) { cnt('slow'); if (Math.random() < 0.45) { st.bait = false; say('Too slow! It took the bait and swam off. Reel in for more.', 3); } else say('Too slow: it let go. Tap as soon as the float goes under.', 2.5); leave(f); }
      }
    }
    function bite(f) { cnt('bite'); ripple(st.bob.x, 1.2); if (SND) SND.plunk(); say('NOW! Tap!', 0.9); }

    // the fight: hold to reel, let go when it's too much
    function fight(dt) {
      const f = st.fish, L = lookOf(f.sp), F = FISH[f.sp] || {};
      f.runT -= dt;
      if (f.run > 0) { f.run -= dt; } else if (f.runT <= 0) { f.run = rr(0.6, 1.4) * (0.6 + 0.6 * f.stam); f.runT = rr(1.4, 3.4); if (L.jump && Math.random() < 0.5) { f.jump = 0.01; splash(f.x, 10); if (SND) SND.splash(1); say('It jumped! Keep the line tight.', 1.6); } else if (st.reeling && st.tipsLeft.red > 0) say('It\'s running! Let go!', 1.2); }
      const pull = f.pull * (0.35 + 0.65 * f.stam) * (f.run > 0 ? 2.2 : 1);
      st.reelK = st.reeling ? Math.min(1, st.reelK + dt * 4) : 0;
      // how tight the line is: it heads for a mark that depends on what you and the fish are doing
      const aim = st.reeling ? 0.22 + 1.45 * pull * (1 - 0.025 * (level - 1)) : (f.run > 0 ? 0.25 + 0.4 * pull : 0.06);
      st.ten += (aim - st.ten) * Math.min(1, dt * (aim > st.ten ? 2.6 : 3.4));
      // the fish tires, faster when the line is tight
      f.stam = Math.max(0, f.stam - dt * (0.03 + 0.28 * st.ten) * f.drain);
      // where it goes: toward you while you reel, away while it runs or the line is loose
      const toward = st.reeling ? 0.16 * st.reelK * (1 - clamp(pull, 0, 0.9)) : 0, away = (f.run > 0 ? 0.16 : 0.03) * pull * (st.reeling ? 0.4 : 1);
      f.x = clamp(f.x - (toward - away) * dt, 0, 1.05);
      const wantY = clamp(f.x < 0.12 ? 0.04 : Math.min(bottom(f.x) - 0.04, f.y + Math.sin(st.t * 1.7) * 0.03), 0.03, 0.97);
      f.y += (wantY - f.y) * Math.min(1, dt * (st.reeling ? 1.5 : 0.6));
      if (f.jump !== undefined) { f.jump += dt; if (f.jump > 0.8) { f.jump = undefined; splash(f.x, 8); if (SND) SND.splash(0.8); } }
      st.bob.x = f.x;
      // too tight for too long: the line snaps, or the hook tears out of a thin mouth
      const limit = L.paper ? 0.88 : 1;
      if (st.ten > limit) st.red += dt; else st.red = Math.max(0, st.red - dt * 2);
      if (st.red > (L.paper ? 0.3 : 0.4)) return lose(L.paper ? 'tear' : 'snap');
      // too loose for too long: it shakes the hook (more so a jumping fish in the air)
      if (!st.reeling && f.run <= 0) st.slack += dt; else st.slack = Math.max(0, st.slack - dt * 2);
      if (st.slack > 1.6 && st.slack - dt <= 1.6) say('Keep reeling, or it\'ll shake the hook!', 1.8);
      if (st.slack > 3.2 || (f.jump !== undefined && st.ten < 0.08 && Math.random() < dt * 3)) return lose('shook');
      if (st.ten > 0.85 && st.tipsLeft.red > 0 && !st.saidRed) { st.saidRed = true; st.tipsLeft.red--; say('Red! Let go before it snaps!', 1.4); }
      if (st.ten < 0.6) st.saidRed = false;
      needle.style.left = (100 * clamp(st.ten / 1.15, 0, 1)) + '%';
      tenEl.querySelector('b').textContent = f.stam < 0.25 ? 'It\'s tiring!' : 'Line';
      // close enough to lift it out
      if (f.x <= 0.03) land(f);
    }
    function lose(why) {
      const f = st.fish; st.fish = null; if (SND) SND.reel(false); st.reeling = false; tenEl.style.display = 'none';
      if (why === 'snap') { st.lost++; if (SND) SND.snap(); say('SNAP! The line broke and the ' + nameOf(f.sp).toLowerCase() + ' took the hook. Let go sooner next time.', 3.4); }
      else if (why === 'tear') say('The hook tore out of its thin mouth. Crappie need a gentle reel.', 3.2);
      else say('It shook the hook! Keep the line tight.', 2.6);
      f.st = 'leave'; f.vx = 0.3; f.dir = 1; setLeft();
      st.mode = 'back'; st.back = {t: 0, x: f.x};
      if (hooksLeft() <= 0) setTimeout(() => finish(false, 'That was your last hook.'), 900);
    }
    function land(f) {
      st.fish = null; f.st = 'landed'; f.gone = true; st.reeling = false; if (SND) { SND.reel(false); SND.win(); }
      tenEl.style.display = 'none'; splash(0.02, 8);
      const kg = Math.round(f.kg * 100) / 100; st.caught.push({sp: f.sp, kg}); setLeft();
      st.mode = 'card'; st.paused = true; card(f.sp, kg);
    }

    // the catch card: the fish, its name and weight, and something true about it
    function card(sp, kg) {
      const F = FISH[sp] || {}, seen = o.seen || {}, prev = seen[sp], first = prev === undefined && !st.caught.slice(0, -1).some(c => c.sp === sp);
      const best = !first && kg > Math.max(prev || 0, ...st.caught.slice(0, -1).filter(c => c.sp === sp).map(c => c.kg));
      const el = document.createElement('div'); el.className = 'f-card'; el.setAttribute('role', 'group'); el.setAttribute('aria-label', 'You caught a ' + nameOf(sp));
      el.innerHTML = `${F.legend ? '<span class="tag gold">Legend</span>' : first ? '<span class="tag">New fish!</span>' : best ? '<span class="tag gold">Biggest yet</span>' : ''}<canvas width="560" height="230" aria-hidden="true"></canvas><b></b><i></i><div class="wt"></div><p></p><div class="f-row"><button type="button" class="hot">${o.practice ? 'Let it go' : 'On the stringer'}</button></div>`;
      el.querySelector('b').textContent = nameOf(sp); el.querySelector('i').textContent = F.sci || '';
      el.querySelector('.wt').textContent = lbOf(kg) + ' · ' + Math.round(lengthCm(sp, kg) / 2.54) + ' inches';
      el.querySelector('p').textContent = F.fact || '';
      const c = el.querySelector('canvas'), cg = c.getContext('2d'); cg.translate(280, 118); drawFish(cg, sp, fitLen(sp, 560, 230), {ph: 0.6, seed: 7});
      ov.appendChild(el); sayEl.setAttribute('data-off', ''); st.saidT = 0;
      el.querySelector('button').addEventListener('click', () => { el.remove(); st.paused = false; st.mode = 'ready'; if (o.practice) st.caught.pop(), st.practiced = (st.practiced || 0) + 1, setLeft(); say('Press and hold, then let go to cast again.', 2.2); });
      el.querySelector('button').focus();
    }

    // ---------- drawing ----------
    function draw() {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      // above the water: the place's own painting, from the bank
      const im = o.painting;
      if (im && im.width) {
        const cw = Math.min(im.width, 640), ch = cw * (surfY + 10) / W, sp0 = o.spot || [im.width / 2, im.height / 2];
        const sx = clamp(sp0[0] - cw * 0.45, 0, im.width - cw), sy = clamp(sp0[1] - ch * 0.8, 0, im.height - ch);
        g.drawImage(im, sx, sy, cw, ch, 0, 0, W, surfY + 10);
      } else { const sk = g.createLinearGradient(0, 0, 0, surfY); sk.addColorStop(0, '#9cc4d8'); sk.addColorStop(1, '#d6e2c8'); g.fillStyle = sk; g.fillRect(0, 0, W, surfY + 10); g.fillStyle = '#4a6a3a'; for (let i = 0; i < 14; i++) { g.beginPath(); g.arc(i * W / 13, surfY - 4, 26 + 14 * hash(i, 2), Math.PI, 0); g.fill(); } }
      const sky = night ? 'rgba(10,18,40,.62)' : dusk ? 'rgba(240,140,60,.16)' : winter ? 'rgba(200,215,230,.12)' : null;
      if (sky) { g.fillStyle = sky; g.fillRect(0, 0, W, surfY + 10); }
      const fade = g.createLinearGradient(0, surfY - 30, 0, surfY + 6); fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(10,20,20,.35)'); g.fillStyle = fade; g.fillRect(0, surfY - 30, W, 36);
      // the water, cut away
      const dark = night ? 0.55 : dusk ? 0.2 : 0;
      const wg = g.createLinearGradient(0, surfY, 0, H); wg.addColorStop(0, W0.top); wg.addColorStop(1, W0.bot); g.fillStyle = wg; g.fillRect(0, surfY, W, H - surfY);
      if (winter) { g.fillStyle = 'rgba(120,150,170,.12)'; g.fillRect(0, surfY, W, H - surfY); }
      // light from above, swaying
      if (!night) { g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 5; i++) { const x = W * (0.15 + i * 0.2) + Math.sin(st.t * 0.3 + i) * 20, w2 = 18 + 10 * hash(i, 9); const lg = g.createLinearGradient(0, surfY, 0, H * 0.8); lg.addColorStop(0, 'rgba(255,250,210,.09)'); lg.addColorStop(1, 'rgba(255,250,210,0)'); g.fillStyle = lg; g.beginPath(); g.moveTo(x - w2, surfY); g.lineTo(x + w2, surfY); g.lineTo(x + w2 + 70, H * 0.8); g.lineTo(x - w2 + 50, H * 0.8); g.fill(); } g.restore(); }
      // drifting specks
      g.fillStyle = 'rgba(230,230,200,.35)'; for (const m of motes) { g.beginPath(); g.arc(SX(m.x), SY(m.y * 1.05), m.s, 0, TAU); g.fill(); }
      // the bottom: mud, gravel and stones, and weeds near the bank
      g.beginPath(); g.moveTo(0, SY(bottom(0))); for (let i = 0; i <= 40; i++) { const x = i / 40; g.lineTo(SX(x), SY(bottom(x))); } g.lineTo(W, H); g.lineTo(0, H); g.closePath();
      const bg = g.createLinearGradient(0, SY(0.2), 0, H); bg.addColorStop(0, place === 'creek' ? '#7a7158' : '#5a4a32'); bg.addColorStop(1, '#241c12'); g.fillStyle = bg; g.fill();
      for (let i = 0; i < 26; i++) { const x = hash(i, 11), y = bottom(x); g.fillStyle = `rgba(${150 + 50 * hash(i, 12) | 0},${140 + 40 * hash(i, 13) | 0},${110 + 30 * hash(i, 14) | 0},${place === 'creek' ? 0.75 : 0.45})`; g.beginPath(); g.ellipse(SX(x), SY(y) + 3, 4 + 9 * hash(i, 15), 3 + 4 * hash(i, 16), 0, 0, TAU); g.fill(); }
      if (W0.log) { const x0 = SX(0.52), y0 = SY(bottom(0.52)) - 4, x1 = SX(0.78), y1 = SY(bottom(0.78)) - 22; g.strokeStyle = '#3a2c1c'; g.lineWidth = 11; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.lineWidth = 4; g.beginPath(); g.moveTo(SX(0.62), (y0 + y1) / 2 - 2); g.lineTo(SX(0.66), (y0 + y1) / 2 - 34); g.moveTo(SX(0.7), (y0 + y1) / 2 - 6); g.lineTo(SX(0.76), (y0 + y1) / 2 - 30); g.stroke(); }
      const nWeed = Math.round(14 * W0.weeds);
      for (let i = 0; i < nWeed; i++) {
        const x = 0.02 + 0.45 * hash(i, 21), b = SY(bottom(x)), h2 = (0.5 + 0.8 * hash(i, 22)) * Math.min(b - surfY - 6, 120), sw = Math.sin(st.t * 1.1 + i) * 8;
        g.strokeStyle = winter ? 'rgba(110,104,60,.8)' : i % 3 ? 'rgba(70,110,50,.85)' : 'rgba(96,130,58,.8)'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(SX(x), b + 2); g.quadraticCurveTo(SX(x) + sw, b - h2 * 0.5, SX(x) + sw * 1.6, b - h2); g.stroke();
      }
      // the minnows
      g.fillStyle = 'rgba(214,220,210,.75)';
      for (const m of minnows) { const x = SX(school.x + m.dx + Math.sin(st.t * 2 + m.ph) * 0.01), y = SY(school.y + m.dy); g.beginPath(); g.ellipse(x, y, 5, 1.6, 0, 0, TAU); g.fill(); g.beginPath(); g.moveTo(x - 4 * Math.sign(school.vx), y); g.lineTo(x - 8 * Math.sign(school.vx), y - 2.4); g.lineTo(x - 8 * Math.sign(school.vx), y + 2.4); g.fill(); }
      // the fish
      const water = W0.bot;
      for (const f of fishes) {
        if (f.st === 'landed') continue;
        const len = lenPx(f.sp, f.kg), x = SX(f.x), y = f.jump !== undefined ? surfY - Math.sin(Math.PI * clamp(f.jump / 0.8, 0, 1)) * H * 0.12 : SY(f.y);
        const near = f.st === 'hooked' || f.st === 'bite' || f.st === 'nibble' || f.st === 'circle';
        g.save(); g.translate(x, y); g.scale(f.dir, 1); g.rotate((f.st === 'hooked' ? Math.sin(f.ph * 0.5) * 0.18 : 0) - (f.jump !== undefined ? 0.6 : 0));
        drawFish(g, f.sp, len, {ph: f.ph, seed: f.seed, murk: f.jump !== undefined ? 0 : clamp(murkBase - (near ? 0.25 : 0) + f.y * 0.25, 0, 0.9), water});
        g.restore();
      }
      // the bank you stand on
      g.fillStyle = '#4a3a24'; g.beginPath(); g.moveTo(0, surfY - 16); g.quadraticCurveTo(shoreX * 0.7, surfY - 14, shoreX + 4, surfY); g.lineTo(SX(0), SY(bottom(0))); g.lineTo(0, SY(bottom(0)) + 20); g.closePath(); g.fill();
      g.fillStyle = winter ? '#9a8a5a' : '#5c7a34'; g.beginPath(); g.moveTo(0, surfY - 22); g.quadraticCurveTo(shoreX * 0.7, surfY - 20, shoreX + 6, surfY - 2); g.lineTo(shoreX * 0.7, surfY - 8); g.lineTo(0, surfY - 10); g.fill();
      // night darkens the water most
      if (dark) { g.fillStyle = `rgba(4,8,16,${dark})`; g.fillRect(0, surfY, W, H - surfY); }
      // the surface, with ripples
      g.strokeStyle = 'rgba(230,240,240,.55)'; g.lineWidth = 1.5; g.beginPath(); for (let i = 0; i <= 50; i++) { const x = shoreX + (W - shoreX) * i / 50, y = surfY + Math.sin(i * 0.7 + st.t * 2) * 0.8; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
      g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(shoreX, surfY, W - shoreX, 4);
      for (const e of fx) if (e.kind === 'ring') { const a = 1 - e.t / 1.2; g.strokeStyle = `rgba(240,248,248,${0.6 * a})`; g.lineWidth = 1.5; g.beginPath(); g.ellipse(SX(e.x), surfY, 6 + e.t * 40 * e.k, 2 + e.t * 6 * e.k, 0, 0, TAU); g.stroke(); }
      for (const e of fx) if (e.kind === 'drop') { const x = e.x + e.vx * e.t, y = e.y + e.vy * e.t + 300 * e.t * e.t; if (y > surfY + 2) continue; g.fillStyle = 'rgba(230,240,245,.85)'; g.beginPath(); g.arc(x, y, 2, 0, TAU); g.fill(); }
      // the rod, the line, the float and the hook
      const tip = rodTip(), base = rodBase(), bend = st.mode === 'fight' ? st.ten : st.mode === 'charge' ? -st.power * 0.6 : 0;
      g.strokeStyle = '#3a2a1a'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(base[0], base[1]);
      g.quadraticCurveTo((base[0] + tip[0]) / 2 + bend * 20, (base[1] + tip[1]) / 2 - bend * 30, tip[0] + bend * 10, tip[1] + bend * 22); g.stroke();
      g.strokeStyle = '#6a4a2a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo((base[0] + tip[0]) / 2 + bend * 10, (base[1] + tip[1]) / 2 - bend * 15); g.lineTo(tip[0] + bend * 10, tip[1] + bend * 22); g.stroke();
      const T2 = [tip[0] + bend * 10, tip[1] + bend * 22];
      let bx = null, by = surfY;
      if (st.mode === 'flying') { const k = st.cast.t, x1 = SX(st.cast.x); bx = T2[0] + (x1 - T2[0]) * k; by = T2[1] + (surfY - T2[1]) * k - Math.sin(Math.PI * k) * H * 0.14; }
      else if (st.mode === 'back') { const k = smooth(clamp(st.back.t, 0, 1)), x0 = SX(st.back.x); bx = x0 + (T2[0] - x0) * k; by = surfY + (T2[1] - surfY) * k; }
      else if (st.mode === 'out' || st.mode === 'fight') { bx = SX(st.mode === 'fight' && st.fish ? st.fish.x : st.bob.x); by = surfY + Math.sin(st.t * 2.2) * 1.2 + st.bob.dip * 6 + st.bob.under * 16 + (st.jerk > 0 ? -4 : 0); }
      g.strokeStyle = 'rgba(240,240,230,.75)'; g.lineWidth = 1;
      if (bx !== null) {
        g.beginPath(); g.moveTo(T2[0], T2[1]);
        const sag = st.mode === 'fight' ? (1 - st.ten) * 26 : 30; g.quadraticCurveTo((T2[0] + bx) / 2, Math.max(T2[1], by) + sag, bx, by); g.stroke();
        // under the float, the line down to the hook (or to the fish's mouth)
        let hx2 = bx, hy2 = by + 40;
        if (st.mode === 'out') { hx2 = SX(st.hook.x); hy2 = SY(st.hook.y); }
        if (st.mode === 'fight' && st.fish) { const f = st.fish; hx2 = SX(f.x) + lenPx(f.sp, f.kg) * 0.48 * f.dir; hy2 = f.jump !== undefined ? surfY - H * 0.1 : SY(f.y); }
        if (st.mode !== 'flying') { g.strokeStyle = 'rgba(240,240,230,.55)'; g.beginPath(); g.moveTo(bx, by + 4); g.lineTo(hx2, hy2); g.stroke(); }
        if (st.mode === 'out') {
          g.fillStyle = '#5a5a5a'; g.beginPath(); g.arc(hx2, hy2 - 10, 2.2, 0, TAU); g.fill();   // the sinker
          g.strokeStyle = '#c8ccd0'; g.lineWidth = 1.5; g.beginPath(); g.arc(hx2 - 2.5, hy2, 3, 0, Math.PI); g.stroke();   // the hook
          if (st.bait) { g.strokeStyle = '#efe0c0'; g.lineWidth = 3.2; g.beginPath(); g.arc(hx2 - 2.5, hy2 + 1, 3.2, 0.4 + Math.sin(st.t * 3) * 0.3, Math.PI + 0.6); g.stroke(); }
        }
        // the float: red over white
        if (st.mode !== 'fight' || !st.fish || st.fish.jump === undefined) {
          g.save(); g.translate(bx, by); g.fillStyle = '#f2f0ea'; g.beginPath(); g.arc(0, 0, 6, 0, Math.PI); g.fill(); g.fillStyle = '#d8402a'; g.beginPath(); g.arc(0, 0, 6, Math.PI, TAU); g.fill();
          g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, 6, 0, TAU); g.stroke(); g.restore();
        }
      }
      // the power swing while you hold to cast
      if (st.mode === 'charge') {
        const x1 = SX(0.1 + st.power * 0.84);
        g.strokeStyle = 'rgba(255,255,255,.85)'; g.setLineDash([5, 6]); g.lineWidth = 2; g.beginPath(); g.moveTo(T2[0], T2[1]); g.quadraticCurveTo((T2[0] + x1) / 2, T2[1] - H * 0.14, x1, surfY); g.stroke(); g.setLineDash([]);
        g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.ellipse(x1, surfY, 12, 4, 0, 0, TAU); g.fill();
        g.fillStyle = '#15212b'; g.font = '700 13px system-ui,sans-serif'; g.textAlign = 'center'; const lbl = st.power < 0.33 ? 'near' : st.power < 0.67 ? 'middle' : 'far'; g.lineWidth = 3; g.strokeStyle = 'rgba(244,247,247,.9)'; g.strokeText(lbl, x1, surfY - 16); g.fillText(lbl, x1, surfY - 16);
      }
    }
    let last = performance.now(), raf = 0;
    function frame(now) { raf = requestAnimationFrame(frame); const dt = Math.min(0.05, (now - last) / 1000); last = now; for (let i = 0; i < (o.turbo || 1); i++) step(dt); draw(); }
    raf = requestAnimationFrame(frame);

    // ---------- the end of the hour ----------
    let ended = false;
    function finish(quit, why) {
      if (ended) return; ended = true; st.mode = 'end'; if (SND) SND.reel(false);
      const el = document.createElement('div'); el.className = 'f-card';
      const n = st.caught.length;
      const head = o.practice ? 'Practice done' : n ? (n === 1 ? 'One fish' : n + ' fish') : 'No fish this time';
      const sub = o.practice ? (st.practiced ? 'You landed ' + st.practiced + ' fish' + ' and let them all go.' : 'Nothing landed. The fish will be here next time.')
        : (why ? why + ' ' : '') + (n ? '' : 'Some days the fish win.') + (st.lost ? ' ' + (st.lost === 1 ? 'A hook was lost.' : st.lost + ' hooks were lost.') : '');
      el.innerHTML = `<b></b><p style="text-align:center"></p><ul></ul><div class="f-row"><button type="button" class="hot">Carry on</button></div>`;
      el.querySelector('b').textContent = head; el.querySelector('p').textContent = sub.trim();
      const ul = el.querySelector('ul');
      for (const c of st.caught) { const li = document.createElement('li'); const cc = document.createElement('canvas'); cc.width = 128; cc.height = 56; const cg = cc.getContext('2d'); cg.translate(64, 28); drawFish(cg, c.sp, fitLen(c.sp, 128, 56), {ph: 0.5, seed: 3}); li.appendChild(cc); const s2 = document.createElement('span'); s2.textContent = nameOf(c.sp) + ', ' + lbOf(c.kg); li.appendChild(s2); ul.appendChild(li); }
      if (!st.caught.length) ul.remove();
      ov.appendChild(el);
      el.querySelector('button').addEventListener('click', () => {
        cancelAnimationFrame(raf); root.removeEventListener('resize', size); document.removeEventListener('keydown', keys, true); document.removeEventListener('keyup', keys, true); ov.remove(); document.body.classList.remove('noscroll'); if (root.Fishing.current === handle) root.Fishing.current = null;
        done({fish: o.practice ? [] : st.caught.slice(), lost: st.lost, quit: !!quit, practiced: st.practiced || 0, casts: st.casts || 0});
      });
      el.querySelector('button').focus();
    }
    // the game that's up, for the test players (tools/minigames-check.mjs)
    const handle = {ov, state: () => ({n: st.n, t: st.t, mode: st.mode, clock: st.clock, caught: st.caught.slice(), lost: st.lost, ten: st.ten, fish: st.fish && {sp: st.fish.sp, x: st.fish.x, stam: st.fish.stam, run: st.fish.run}, engaged: engaged() && engaged().st, bait: st.bait, hook: Object.assign({}, st.hook)}),
      finish: () => finish(true), _st: st};
    root.Fishing.current = handle;
    return handle;
  }

  // the practice pond: no clock, nothing kept, all the pond and creek fish
  function practice(o, done) {
    const list = [['bluegill', 1], ['longear', 0.5], ['greensunfish', 0.5], ['crappie', 0.4], ['bass', 0.6], ['catfish', 0.6], ['bullhead', 0.4], ['drum', 0.3], ['spottedgar', 0.3]];
    return play(Object.assign({}, o, {practice: true, place: o.place || 'pond', name: o.name || 'Practice pond', pool: {rate: 1.6, list, bait: true, hooks: 99, level: o.level || 1}}), done);
  }
  root.Fishing = {play, practice, drawFish, fitLen, LOOK};
})(typeof window !== 'undefined' ? window : globalThis);
