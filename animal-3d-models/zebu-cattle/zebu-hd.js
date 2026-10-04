// zebu-hd.js: the herd's Zebu cattle at full detail, built in code, in two styles. three.js r128 (global THREE).
// Needs zebu.js (ZEBU_LOOKS) and zebu-moves.js (makeZebuMoves) first. Defines makeZebuHD(look, opts).
//
// One skin from rump to throat, a head with its bones showing through, real leg joints, all bound to one skeleton so
// the body bends as one piece, and moved by zebu-moves.js (keyed moves, springs on the ears, tail, dewlap and hump).
//
//   opts.style 'envoi' (the default): made the way envoi makes its best models (envoi-on-the-longest-night
//     3d-model-main-characters/io and 3d-model-new-character-ideas/emberback): muscles, hip bones and the folds of the
//     dewlap pushed into the surface, hair painted into a normal map, physical materials (sheen on the coat, a wet nose
//     and tongue, glossy eyes under a cornea, lids that blink), long drooping ears, ranch dust and grime. Meant for a
//     renderer with sRGB output and ACES tone mapping, or envoi's cinema pass.
//   opts.style 'storybook': What the Map Forgot's 3D look (what_the_map_forgot wren-3d): the same animal drawn as a
//     chunky storybook figure with a big round head, short legs, big shining eyes that blink by squashing, flat warm
//     colours from that game's palette, three-step cel shading with a cool rim of light, and an ink outline that moves
//     with the skin. Squashes and stretches. Meant for a plain renderer (no tone mapping), like wren-3d's.
//     With opts.shade 'soft', the same cartoon is lit the way a 3D cartoon film lights its characters, to stand in a
//     realistic place: soft, velvety shading that the place's sun or moon falls on, light carried round into the shade,
//     glossy eyes that still sparkle in the dark, and no ink line (opts.ink puts one back). Meant for a renderer with
//     ACES tone mapping or envoi's cinema pass, like the envoi style.
//
// Units are metres, y is up, the animal faces +z with its feet at y = 0, its left side is +x (Henry's whole horn).
//   const z = makeZebuHD('henry', {style: 'storybook', detail: 1});   detail 0.4 to 1
//   z.root; z.update(dt, t, {speed, turn}) every frame (or z.animate(dt, t, speed, turn));
//   z.act('stand' | 'graze' | 'lie' | 'sleep'); z.play('moo' | 'shake' | 'swat' | 'paw' | 'toss' | 'buck' | 'hop' |
//   'stretch' | 'lick'); z.lookAt(point, seconds); z.events (moo, snort, step, dust, thump, tear, land);
//   z.state, z.busy, z.pose(name) to jump to a pose, z.anchor('head' | 'mouth' | 'poll' | 'chest'), z.tris.
(function (root) {
  'use strict';
  const PI = Math.PI, TAU = PI * 2;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v), lerp = (a, b, t) => a + (b - a) * t, ease = t => t * t * (3 - 2 * t);
  const sstep = (a, b, x) => ease(cl((x - a) / (b - a), 0, 1));
  const gauss = (x, s) => Math.exp(-(x * x) / (s * s));
  function hash(x, y, z) { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); }
  function noise(x, y, z) {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), u = ease(x - ix), v = ease(y - iy), w = ease(z - iz);
    let r = 0;
    for (let c = 0; c < 8; c++) { const dx = c & 1, dy = (c >> 1) & 1, dz = c >> 2; r += hash(ix + dx, iy + dy, iz + dz) * (dx ? u : 1 - u) * (dy ? v : 1 - v) * (dz ? w : 1 - w); }
    return r;
  }
  const fbm = (x, y, z) => noise(x, y, z) * 0.55 + noise(x * 2.1, y * 2.1, z * 2.1) * 0.3 + noise(x * 4.3, y * 4.3, z * 4.3) * 0.15;
  const cvs = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  // ---------- painted in code: the coat's hair, the horn's rings, the hoof's growth lines ----------
  let TEX = null;
  function textures(size) {
    if (TEX && TEX.size === size) return TEX;
    const W = size, H = size, col = cvs(W, H), g = col.getContext('2d'), hc = cvs(W, H), h = hc.getContext('2d');
    g.fillStyle = 'rgb(236,236,236)'; g.fillRect(0, 0, W, H); h.fillStyle = 'rgb(128,128,128)'; h.fillRect(0, 0, W, H);
    let s = 7;
    const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const n = Math.round(W * H / 22);
    for (let i = 0; i < n; i++) {
      // a hair: short, lying down the body (along v), a little wavy
      const x = r() * W, y = r() * H, L = (5 + r() * 9) * W / 512, a = (r() - 0.5) * 0.35, lw = (0.7 + r() * 0.9) * W / 512;
      const dark = r() < 0.5, hv = dark ? 80 + r() * 40 : 170 + r() * 70, cv = dark ? 205 + r() * 25 : 240 + r() * 15;
      for (const ox of [-W, 0, W]) for (const oy of [-H, 0, H]) {
        h.strokeStyle = `rgba(${hv},${hv},${hv},0.85)`; h.lineWidth = lw; h.beginPath(); h.moveTo(x + ox, y + oy); h.quadraticCurveTo(x + ox + Math.sin(a) * L * 0.5 + (r() - 0.5) * lw, y + oy + L * 0.5, x + ox + Math.sin(a) * L, y + oy + Math.cos(a) * L); h.stroke();
        g.strokeStyle = `rgba(${cv},${cv},${cv},0.7)`; g.lineWidth = lw; g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox + Math.sin(a) * L, y + oy + Math.cos(a) * L); g.stroke();
      }
    }
    const mk = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; if (srgb) t.encoding = THREE.sRGBEncoding; return t; };
    const hh = cvs(256, 256), hg = hh.getContext('2d'); hg.fillStyle = 'rgb(128,128,128)'; hg.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 3 + r() * 9) { const v = 90 + r() * 60; hg.fillStyle = `rgba(${v},${v},${v},0.8)`; hg.fillRect(0, y, 256, 1 + r() * 2); }
    for (let i = 0; i < 900; i++) { const x = r() * 256, y = r() * 256, v = 100 + r() * 90; hg.strokeStyle = `rgba(${v},${v},${v},0.5)`; hg.lineWidth = 0.8; hg.beginPath(); hg.moveTo(x, y); hg.lineTo(x + (r() - 0.5) * 2, y + 6 + r() * 20); hg.stroke(); }
    const fh = cvs(128, 128), fg = fh.getContext('2d'); fg.fillStyle = 'rgb(128,128,128)'; fg.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 2 + r() * 5) { const v = 95 + r() * 70; fg.fillStyle = `rgba(${v},${v},${v},0.7)`; fg.fillRect(0, y, 128, 1); }
    TEX = {size, hairCol: mk(col, true), hairNrm: mk(normalFrom(hc, 2.2)), hornNrm: mk(normalFrom(hh, 1.6)), hoofNrm: mk(normalFrom(fh, 1.2))};
    return TEX;
  }
  function normalFrom(src, k) {
    const W = src.width, H = src.height, s = src.getContext('2d').getImageData(0, 0, W, H).data, hgt = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) hgt[i] = s[i * 4] / 255;
    const c = cvs(W, H), g = c.getContext('2d'), img = g.createImageData(W, H), d = img.data, at = (x, y) => hgt[((y + H) % H) * W + (x + W) % W];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const dx = at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1);
      const dy = at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1);
      const nx = -dx * k, ny = dy * k, l = Math.hypot(nx, ny, 1), i = (y * W + x) * 4;
      d[i] = (nx / l * 0.5 + 0.5) * 255; d[i + 1] = (ny / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0); return c;
  }
  // the storybook eye: a big dark eye with a warm glow low down and two catchlights toward the front, as Wren's are
  // painted (wren-3d src/wren-model.js); u runs toward the animal's nose, v up
  const EYE_SB = {};
  function eyeTexture(iris, kind) {
    if (EYE_SB[kind || 'flat']) return EYE_SB[kind || 'flat'];
    const c = cvs(256, 256), g = c.getContext('2d');
    g.fillStyle = '#1d1b2c'; g.fillRect(0, 0, 256, 256);
    const ir = new THREE.Color(iris), css = (k) => `rgb(${Math.round(ir.r * 255 * k)},${Math.round(ir.g * 255 * k)},${Math.round(ir.b * 255 * k)})`;
    const gr = g.createRadialGradient(128, 160, 10, 128, 140, 118); gr.addColorStop(0, css(1.7)); gr.addColorStop(0.55, css(1.0)); gr.addColorStop(1, '#1d1b2c');
    g.fillStyle = gr; g.beginPath(); g.ellipse(128, 132, 104, 112, 0, 0, TAU); g.fill();
    g.fillStyle = '#100e18'; g.beginPath(); g.ellipse(130, 128, 54, 62, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.96)'; g.beginPath(); g.ellipse(170, 78, 34, 30, -0.4, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(92, 186, 13, 11, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(126, 214, 40, 10, 0, 0, PI); g.fill();
    const t = new THREE.CanvasTexture(c);
    if (kind === 'lit') t.encoding = THREE.sRGBEncoding;
    if (kind === 'sparkle') {
      // the catchlights alone, to glow a little, so the eyes still shine in the dark
      g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#fff';
      g.beginPath(); g.ellipse(170, 78, 34, 30, -0.4, 0, TAU); g.fill(); g.beginPath(); g.ellipse(92, 186, 13, 11, 0, 0, TAU); g.fill();
      t.needsUpdate = true; t.encoding = THREE.sRGBEncoding;
    }
    EYE_SB[kind || 'flat'] = t; return t;
  }

  function makeZebuHD(key, opts) {
    opts = opts || {};
    if (!root.makeZebuMoves) throw new Error('zebu-hd.js needs zebu-moves.js loaded first');
    const SB = opts.style === 'storybook', style = SB ? 'storybook' : 'envoi', SOFT = SB && opts.shade === 'soft';
    const LOOKS = root.ZEBU_LOOKS || {}, SBL = (root.ZEBU_STORYBOOK || {})[typeof key === 'string' ? key : ''] || {};
    const look = Object.assign({}, LOOKS.henry, typeof key === 'string' ? LOOKS[key] : key || {}, SB ? SBL : {});
    const DET = cl(opts.detail == null ? 1 : opts.detail, 0.3, 1.5), Q = (n, m) => Math.max(m || 3, Math.round(n * DET));
    const LIN = opts.linear == null ? !SB || SOFT : !!opts.linear;
    const COL = hex => { const c = new THREE.Color(hex); if (LIN) c.convertSRGBToLinear(); return c; };
    const TX = SB ? null : textures(DET < 0.6 ? 256 : 512);

    // ---------- the skeleton, where it sits when the animal stands ----------
    const B = [], BI = {}, BW = {};
    function bone(name, parent, x, y, z) {
      const b = new THREE.Bone(); b.name = name; const p = parent ? BW[parent] : V3(0, 0, 0); b.position.set(x - p.x, y - p.y, z - p.z);
      if (parent) B[BI[parent]].add(b); BI[name] = B.length; B.push(b); BW[name] = V3(x, y, z); return b;
    }
    bone('base', null, 0, 0.95, 0);
    bone('pelvis', 'base', 0, 0.95, -0.38); bone('spine', 'base', 0, 0.96, 0.02); bone('ribs', 'spine', 0, 0.86, -0.02); bone('chest', 'spine', 0, 0.98, 0.42);
    bone('hump', 'chest', 0, 1.22, 0.56); bone('dewlap', 'chest', 0, 0.72, 0.80);
    bone('neck1', 'chest', 0, 0.98, 0.6); bone('neck2', 'neck1', 0, 1.06, 0.87);
    // the head is drawn along its own line from the poll to the nose (lz), tipped down the way he holds it
    const HA = SB ? 0.86 : 1.02, HP = V3(0, 1.23, 1.07), hc = Math.cos(HA), hs = Math.sin(HA);
    const toW = (lx, ly, lz) => V3(lx, HP.y + ly * hc - lz * hs, HP.z + ly * hs + lz * hc);
    const toL = p => { const y0 = p.y - HP.y, z0 = p.z - HP.z; return [p.x, y0 * hc + z0 * hs, -y0 * hs + z0 * hc]; };
    const placeH = g => { g.rotateX(HA); g.translate(HP.x, HP.y, HP.z); return g; };
    bone('head', 'neck2', 0, 1.19, 1.06);
    { const j = toW(0, -0.1, 0.08); bone('jaw', 'head', 0, j.y, j.z); const t = toW(0, SB ? -0.098 : -0.105, SB ? 0.2 : 0.3); bone('tongue', 'jaw', 0, t.y, t.z); }
    // ears: two bones each, so they bend as they flop
    const EAR = SB ? {at: [0.122, -0.03, 0.035], dir: [0.95, -0.24, 0.06], L: 0.2, w: 0.075} : {at: [0.088, -0.035, 0.05], dir: [0.93, -0.2, 0.1], L: 0.2, w: 0.058};
    for (const s of [1, -1]) {
      const n = s > 0 ? 'L' : 'R', e = toW(EAR.at[0] * s, EAR.at[1], EAR.at[2]), d = V3(EAR.dir[0] * s, EAR.dir[1], EAR.dir[2]).normalize();
      bone('ear' + n, 'head', e.x, e.y, e.z); const e2 = e.clone().addScaledVector(d, EAR.L * 0.48); bone('ear' + n + '2', 'ear' + n, e2.x, e2.y, e2.z);
    }
    // eyes, and (in the envoi style) the lids that close over them
    const EYE = SB ? {at: [0.124, 0.02, 0.085], ax: [0.8, 0.36, 0.42], r: [0.036, 0.046, 0.02]} : {at: [0.1, -0.012, 0.137], ax: [1, 0.05, 0.25], r: [0.021, 0.019, 0.023]};
    const eyeC = {}, eyeAx = {};
    for (const s of [1, -1]) {
      const n = s > 0 ? 'L' : 'R', c = toW(EYE.at[0] * s, EYE.at[1], EYE.at[2]);
      // the eye's axis is given in the head's own frame (across, up, along the face)
      const la = V3(EYE.ax[0] * s, EYE.ax[1], EYE.ax[2]), ax = toW(la.x, la.y, la.z).sub(toW(0, 0, 0)).normalize();
      eyeC[n] = c; eyeAx[n] = ax; bone('eye' + n, 'head', c.x, c.y, c.z); if (!SB) bone('lid' + n, 'head', c.x, c.y, c.z);
    }
    // legs: shoulder, elbow, knee (the carpus), fetlock; hip, stifle, hock, fetlock
    const FL = {sh: [0.15, 0.98, 0.52], el: [0.16, 0.66, 0.45], kn: [0.165, 0.37, 0.50], fe: [0.165, 0.125, 0.505], ho: [0.165, 0.0, 0.53]};
    const HL = {hi: [0.17, 1.00, -0.42], st: [0.175, 0.66, -0.29], hk: [0.17, 0.46, -0.565], fe: [0.165, 0.125, -0.52], ho: [0.165, 0.0, -0.50]};
    for (const s of [1, -1]) {
      const n = s > 0 ? 'L' : 'R', X = a => [a[0] * s, a[1], a[2]];
      bone('sh' + n, 'chest', ...X(FL.sh)); bone('el' + n, 'sh' + n, ...X(FL.el)); bone('kn' + n, 'el' + n, ...X(FL.kn)); bone('ff' + n, 'kn' + n, ...X(FL.fe));
      bone('hi' + n, 'pelvis', ...X(HL.hi)); bone('st' + n, 'hi' + n, ...X(HL.st)); bone('hk' + n, 'st' + n, ...X(HL.hk)); bone('hf' + n, 'hk' + n, ...X(HL.fe));
    }
    const TAILP = [V3(0, 1.10, -0.66), V3(0, 1.07, -0.72), V3(0, 0.95, -0.745), V3(0, 0.78, -0.75), V3(0, 0.60, -0.745), V3(0, 0.44, -0.74), V3(0, 0.30, -0.735)];
    bone('tail0', 'pelvis', 0, 1.10, -0.66); for (let i = 1; i < 6; i++) bone('tail' + i, 'tail' + (i - 1), TAILP[i].x, TAILP[i].y, TAILP[i].z);

    // ---------- where everything goes: one pile per material ----------
    const PILES = {};
    function pile(name) { return PILES[name] || (PILES[name] = {pos: [], nor: [], uv: [], col: [], rough: [], si: [], sw: [], idx: []}); }
    // add a finished geometry to a pile: colour(p, i) -> THREE.Color, weights(p, i) -> [[bone, w], ...], rough(p) -> 0..1
    function put(name, geo, colour, weights, rough) {
      const P = pile(name), base = P.pos.length / 3, pa = geo.attributes.position, na = geo.attributes.normal, ua = geo.attributes.uv, p = new THREE.Vector3(), c = new THREE.Color();
      for (let i = 0; i < pa.count; i++) {
        p.fromBufferAttribute(pa, i); P.pos.push(p.x, p.y, p.z); P.nor.push(na.getX(i), na.getY(i), na.getZ(i));
        P.uv.push(ua ? ua.getX(i) : 0, ua ? ua.getY(i) : 0);
        const cc = typeof colour === 'function' ? colour(p, i) : c.copy(colour); P.col.push(cc.r, cc.g, cc.b);
        P.rough.push(typeof rough === 'function' ? rough(p, i) : rough == null ? 1 : rough);
        let w = typeof weights === 'function' ? weights(p, i) : [[weights, 1]];
        w = w.filter(a => a[1] > 0.001).sort((a, b) => b[1] - a[1]).slice(0, 4); const t = w.reduce((s, a) => s + a[1], 0) || 1;
        for (let k = 0; k < 4; k++) { P.si.push(w[k] ? BI[w[k][0]] : 0); P.sw.push(w[k] ? w[k][1] / t : 0); }
      }
      const ix = geo.index ? geo.index.array : [...Array(pa.count).keys()];
      for (let i = 0; i < ix.length; i++) P.idx.push(ix[i] + base);
    }

    // ---------- surfaces ----------
    // A loft of cross-sections along z. Each station {z, y, w, up, dn, sq, hump, keel, x}; a section is a superellipse
    // reaching w to each side, up above y and dn below, with a hump pushed up at the top and a keel (the dewlap) hung
    // below. Rings run round from the top. UVs are in metres / tile, so the hair map lies the same size everywhere.
    function loft(S, radial, sub, tile, close) {
      const K = ['z', 'y', 'w', 'up', 'dn', 'sq', 'hump', 'keel', 'x', 'hw'], def = {sq: 2, hump: 0, keel: 0, x: 0, hw: 0.55};
      const g = (s, k) => (s[k] != null ? s[k] : def[k] != null ? def[k] : 0);
      const cr = (a, b, c, d, t) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
      const rows = [];
      for (let i = 0; i < S.length - 1; i++) {
        const a = S[Math.max(0, i - 1)], b = S[i], c = S[i + 1], d = S[Math.min(S.length - 1, i + 2)];
        for (let j = 0; j < sub; j++) { const t = j / sub, r = {}; for (const k of K) r[k] = cr(g(a, k), g(b, k), g(c, k), g(d, k), t); rows.push(r); }
      }
      const last = {}; for (const k of K) last[k] = g(S[S.length - 1], k); rows.push(last);
      const pos = [], uv = [], idx = [], R1 = radial + 1;
      let vlen = 0;
      rows.forEach((r, ri) => {
        if (ri) vlen += Math.hypot(r.z - rows[ri - 1].z, r.y - rows[ri - 1].y);
        const e = 2 / Math.max(1, r.sq), ring = [];
        for (let j = 0; j <= radial; j++) {
          const a = (j % radial) / radial * TAU, sx = Math.sin(a), cy = Math.cos(a);
          const px = Math.sign(sx) * Math.pow(Math.abs(sx), e), py = Math.sign(cy) * Math.pow(Math.abs(cy), e);
          const ad = Math.min(a, TAU - a);   // 0 at the top, PI at the bottom
          let x = r.x + Math.max(1e-4, r.w) * px, y = r.y + (py > 0 ? Math.max(1e-4, r.up) : Math.max(1e-4, r.dn)) * py;
          y += r.hump * gauss(ad, r.hw); const kk = gauss(PI - ad, 0.24); y -= r.keel * kk; x *= 1 - 0.55 * Math.min(1, r.keel * 6) * gauss(PI - ad, 0.5);
          ring.push([x, y, r.z]);
        }
        let L = 0; for (let j = 0; j <= radial; j++) { if (j) L += Math.hypot(ring[j][0] - ring[j - 1][0], ring[j][1] - ring[j - 1][1]); pos.push(...ring[j]); uv.push(L / tile, vlen / tile); }
      });
      const n = rows.length;
      for (let i = 0; i < n - 1; i++) for (let j = 0; j < radial; j++) { const a = i * R1 + j, b = a + 1, c = a + R1, d = c + 1; idx.push(a, c, b, b, c, d); }
      if (close !== false) {
        const c0 = pos.length / 3; pos.push(rows[0].x, rows[0].y, rows[0].z); uv.push(0, 0);
        const c1 = c0 + 1; pos.push(rows[n - 1].x, rows[n - 1].y, rows[n - 1].z); uv.push(0, vlen / tile);
        for (let j = 0; j < radial; j++) { idx.push(c0, j, j + 1); idx.push(c1, (n - 1) * R1 + j + 1, (n - 1) * R1 + j); }
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
      geo.userData.ring = R1; geo.userData.rows = n; return geo;
    }
    // A tube through the points P; R(t, a) is its radius at t (0 to 1 along) and a (round it; a = 0 faces `side`, a =
    // PI/2 faces T x side), or [r across, r the other way, push]. Frames are carried along without twisting. Ends closed.
    function sweep(P, R, o) {
      o = o || {}; const N = o.n || 24, M = o.m || 16, side0 = o.side || V3(1, 0, 0), tile = o.tile || 0.25;
      const curve = new THREE.CatmullRomCurve3(P, false, 'centripetal');
      const pos = [], uv = [], idx = [], T = new THREE.Vector3(), S = new THREE.Vector3(), U = new THREE.Vector3(), M1 = M + 1;
      let prevT = null, len = 0, prevC = null; const ends = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N, c = curve.getPointAt(t); curve.getTangentAt(t, T);
        if (!prevT) { S.copy(side0).addScaledVector(T, -side0.dot(T)); if (S.lengthSq() < 1e-6) S.set(0, 0, 1).addScaledVector(T, -T.z); S.normalize(); }
        else { const q = new THREE.Quaternion().setFromUnitVectors(prevT, T); S.applyQuaternion(q).addScaledVector(T, -S.dot(T)).normalize(); }
        prevT = T.clone(); U.crossVectors(T, S);
        if (prevC) len += c.distanceTo(prevC); prevC = c.clone();
        let L = 0, last = null;
        for (let j = 0; j <= M; j++) {
          const a = (j % M) / M * TAU, r = R(t, a), rx = Array.isArray(r) ? r[0] : r, ry = Array.isArray(r) ? r[1] : r, oy = Array.isArray(r) && r[2] ? r[2] : 0;
          const q = V3(c.x + S.x * Math.cos(a) * rx + U.x * (Math.sin(a) * ry + oy), c.y + S.y * Math.cos(a) * rx + U.y * (Math.sin(a) * ry + oy), c.z + S.z * Math.cos(a) * rx + U.z * (Math.sin(a) * ry + oy));
          if (o.end && i === N) o.end(q, a, c, T);
          if (last) L += q.distanceTo(last); last = q;
          pos.push(q.x, q.y, q.z); uv.push(L / tile, len / tile);
        }
        if (i === 0 || i === N) ends.push(c.clone());
      }
      for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) { const a = i * M1 + j, b = a + 1, c = a + M1, d = c + 1; idx.push(a, b, c, b, d, c); }
      const c0 = pos.length / 3; pos.push(ends[0].x, ends[0].y, ends[0].z); uv.push(0, 0);
      const c1 = c0 + 1; const ce = o.capAt ? o.capAt(ends[1]) : ends[1]; pos.push(ce.x, ce.y, ce.z); uv.push(0, len / tile);
      for (let j = 0; j < M; j++) { idx.push(c0, j + 1, j); idx.push(c1, N * M1 + j, N * M1 + j + 1); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
      geo.userData.ring = M1; geo.userData.rows = N + 1; geo.userData.curve = curve; return geo;
    }
    // normals, with the seam of each ring joined so no line shows; then push each point out along its normal by
    // disp(p, n), and work the normals out again
    function shade(geo, disp) {
      const fix = () => {
        geo.computeVertexNormals(); const n = geo.attributes.normal, R1 = geo.userData.ring, rows = geo.userData.rows; if (!R1) return;
        const a = new THREE.Vector3(), b = new THREE.Vector3();
        for (let i = 0; i < rows; i++) { const i0 = i * R1, i1 = i0 + R1 - 1; a.fromBufferAttribute(n, i0); b.fromBufferAttribute(n, i1); a.add(b).normalize(); n.setXYZ(i0, a.x, a.y, a.z); n.setXYZ(i1, a.x, a.y, a.z); }
      };
      fix();
      if (disp) {
        const p = geo.attributes.position, n = geo.attributes.normal, v = new THREE.Vector3(), nn = new THREE.Vector3();
        for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); nn.fromBufferAttribute(n, i); const d = disp(v, nn, i); if (d) p.setXYZ(i, v.x + nn.x * d, v.y + nn.y * d, v.z + nn.z * d); }
        fix();
      }
      return geo;
    }
    const ball = (rx, ry, rz, ws, hs) => { const g = new THREE.SphereGeometry(1, ws || Q(20, 8), hs || Q(14, 6)); g.scale(rx, ry, rz); return g; };
    // an ellipsoid turned to look along `ax` (radii: across, up, along the axis), set at c
    function ellipsoidAt(c, ax, r, ws, hs) {
      const g = ball(r[0], r[1], r[2], ws, hs), up = Math.abs(ax.y) > 0.95 ? V3(0, 0, 1) : V3(0, 1, 0);
      g.applyMatrix4(new THREE.Matrix4().lookAt(V3(0, 0, 0), ax.clone().multiplyScalar(-1), up)); g.translate(c.x, c.y, c.z); return g;
    }

    // ---------- weights ----------
    // a smooth hand-over from one bone to the next along a coordinate: stops = [[value, bone], ...] in order
    function along(v, stops) {
      if (v <= stops[0][0]) return [[stops[0][1], 1]];
      for (let i = 0; i < stops.length - 1; i++) { const [a, ba] = stops[i], [b, bb] = stops[i + 1]; if (v <= b) { const t = ease((v - a) / (b - a)); return [[ba, 1 - t], [bb, t]]; } }
      return [[stops[stops.length - 1][1], 1]];
    }
    const mix = (A, Bw, k) => A.map(([b, w]) => [b, w * (1 - k)]).concat(Bw.map(([b, w]) => [b, w * k]));

    // ---------- colours ----------
    const cCoat = COL(look.coat), cBelly = COL(look.belly), cMuzzle = COL(look.muzzle), cSkin = COL(look.earIn), cHoof = COL(look.hoof), cTuft = COL(look.tuft);
    const isWhite = (new THREE.Color(look.coat).r + new THREE.Color(look.coat).g + new THREE.Color(look.coat).b) > 2.0;
    // Henry's neck, hump and shoulders are grey (Chris's photos); the storybook paints it in the game's cool shadow colour
    // (lit softly, the storybook's grey is a plain warm grey: its cool one turned lilac under the sky's light)
    const cShade = COL(SOFT ? 0xcac3b8 : SB ? (look.grey || look.shade) : isWhite ? 0xa8a49d : look.shade);
    const cSpot = COL(look.spots ? look.spots.color : 0), tmp = new THREE.Color(), tmp2 = new THREE.Color();
    function coat(p) {
      const x = p.x, y = p.y, z = p.z;
      tmp.copy(cCoat);
      const top = sstep(1.0, 1.32, y) * sstep(0.1, 0.55, z) * 0.6 + sstep(0.5, 0.95, z) * sstep(0.88, 1.25, y) * 0.35 + sstep(0.35, 0.6, z) * sstep(0.6, 0.95, y) * gauss(Math.abs(x) - 0.27, 0.06) * 0.25;
      tmp.lerp(cShade, cl(top * (look.topShade == null ? 1 : look.topShade) * (isWhite ? (SB ? 1.6 : 1.5) : 1), 0, SB ? 0.95 : 0.85));
      if (isWhite && !SB) tmp.multiplyScalar(0.97 - 0.06 * noise(x * 2.5, y * 2.5 + 3, z * 2.5));
      tmp.lerp(cBelly, sstep(0.66, 0.46, y) * sstep(-0.5, -0.2, z) * 0.5);
      if (look.spots) { const sp = look.spots, n2 = noise(x * sp.scale + 11, y * sp.scale, z * sp.scale) * 0.7 + noise(x * sp.scale * 2.3, y * sp.scale * 2.3 + 5, z * sp.scale * 2.3) * 0.3; const k = sstep(sp.cut - 0.02, sp.cut + 0.02, n2); if (k > 0) tmp.lerp(cSpot, k); }
      if (!SB) tmp.multiplyScalar(0.93 + 0.12 * fbm(x * 7, y * 7, z * 7));
      return tmp;
    }
    const cDirt = COL(0x9a8a70);
    function bodyCol(p) {
      coat(p);
      if (SB) return tmp;
      let occ = 0;
      occ += sstep(0.58, 0.48, p.y) * 0.18;                                               // under the belly
      occ += gauss(Math.abs(p.x) - 0.2, 0.07) * gauss(p.y - 0.62, 0.1) * (gauss(p.z - 0.4, 0.1) + gauss(p.z + 0.3, 0.12)) * 0.35;   // behind the elbows, in front of the stifles
      occ += Math.max(0, -folds(p)) * 22;                                                 // in the folds of the dewlap
      occ += gauss(p.z + 0.66, 0.05) * gauss(p.x, 0.05) * sstep(1.0, 0.8, p.y) * 0.3;     // under the tail
      tmp.multiplyScalar(1 - cl(occ, 0, 0.45));
      // ranch dust: dried mud low on the flanks and belly, and dust over the back where he rolls
      const mud = sstep(0.66, 0.45, p.y + 0.06 * (noise(p.x * 12, p.z * 12, 4) - 0.5)) * sstep(0.4, 0.62, noise(p.x * 5, p.y * 5, p.z * 5)) * (isWhite ? 0.4 : 0.14);
      const dust = sstep(1.05, 1.2, p.y) * sstep(0.45, 0.7, noise(p.x * 3 + 2, p.y * 3, p.z * 3)) * (isWhite ? 0.16 : 0.05);
      return tmp.lerp(cDirt, cl(mud + dust, 0, 0.6));
    }

    // ---------- the body: rump to throat in one skin ----------
    const HK = (look.hump == null ? 1 : look.hump) * (SB ? 1.45 : 1.3), KK = (look.bull ? 1 : 0.7) * (SB ? 0.85 : 1);
    const TORSO = [
      {z: -0.705, y: 0.92, w: 0.035, up: 0.04, dn: 0.06},
      {z: -0.68, y: 0.90, w: 0.12, up: 0.15, dn: 0.18},
      {z: -0.62, y: 0.88, w: 0.22, up: 0.24, dn: 0.29, sq: 2.1},
      {z: -0.50, y: 0.87, w: 0.275, up: 0.27, dn: 0.32, sq: 2.25},
      {z: -0.32, y: 0.865, w: 0.29, up: 0.29, dn: 0.31, sq: 2.3},
      {z: -0.10, y: 0.85, w: 0.31, up: 0.31, dn: 0.36, sq: 2.2},
      {z: 0.14, y: 0.85, w: 0.305, up: 0.31, dn: 0.37, sq: 2.2},
      {z: 0.32, y: 0.86, w: 0.285, up: 0.30, dn: 0.37, sq: 2.15, hump: 0.06 * HK, hw: 0.8},
      {z: 0.45, y: 0.88, w: 0.255, up: 0.29, dn: 0.37, sq: 2.1, hump: 0.15 * HK, hw: 0.82},
      {z: 0.555, y: 0.90, w: 0.225, up: 0.27, dn: 0.38, hump: 0.2 * HK, keel: 0.03 * KK, hw: 0.82, x: 0.008},
      {z: 0.645, y: 0.93, w: 0.19, up: 0.245, dn: 0.36, hump: 0.2 * HK, keel: 0.09 * KK, hw: 0.8, x: 0.012},
      {z: 0.735, y: 0.97, w: 0.162, up: 0.205, dn: 0.30, hump: 0.11 * HK, keel: 0.15 * KK, hw: 0.75},
      {z: 0.84, y: 1.01, w: 0.138, up: 0.17, dn: 0.215, keel: 0.17 * KK},
      {z: 0.94, y: 1.05, w: 0.118, up: 0.145, dn: 0.165, keel: 0.13 * KK},
      {z: 1.02, y: 1.085, w: 0.105, up: 0.13, dn: 0.135, keel: 0.08 * KK},
      {z: 1.08, y: 1.11, w: 0.092, up: 0.11, dn: 0.11, keel: 0.03 * KK},
      {z: 1.12, y: 1.125, w: 0.06, up: 0.07, dn: 0.07}
    ];
    if (SB) for (const s of TORSO) { s.sq = Math.min(s.sq || 2, 2.1); if (s.z > 0.8) { s.w *= 1.18; s.up *= 1.1; s.dn *= 1.05; } }
    // muscles and bones under the skin: [x, y, z, rx, ry, rz, push] (mirrored left and right)
    const BUMPS = [
      [0.25, 1.02, 0.47, 0.07, 0.17, 0.11, 0.022],     // shoulder blade
      [0.24, 0.76, 0.5, 0.06, 0.12, 0.10, 0.018],      // the big muscle behind the elbow
      [0.22, 0.86, 0.60, 0.07, 0.10, 0.07, 0.016],     // point of the shoulder
      [0.27, 0.80, -0.46, 0.06, 0.20, 0.15, 0.03],     // the round of the thigh
      [0.22, 0.95, -0.58, 0.07, 0.14, 0.08, 0.018],    // the back of the thigh
      [0.26, 1.12, -0.30, 0.05, 0.05, 0.06, 0.026],    // the hip bones ("hooks")
      [0.11, 1.08, -0.655, 0.035, 0.04, 0.04, 0.02],   // the pin bones
      [0.28, 0.88, -0.20, 0.05, 0.10, 0.07, -0.022],   // the hollow of the flank
      [0.15, 1.18, -0.02, 0.06, 0.06, 0.25, -0.01]     // the dip either side of the backbone
    ];
    const BK = SB ? 0.25 : 1;
    // folds down the dewlap and across the neck, the way the skin hangs in loose pleats (in the storybook, a few soft waves)
    function folds(p) {
      const neck = sstep(0.55, 0.72, p.z) * sstep(1.12, 1.0, p.z);
      if (!neck) return 0;
      const low = sstep(0.82, 0.62, p.y + (p.z - 0.6) * 0.5);
      if (SB) return neck * low * 0.012 * Math.sin(p.z * 24 + p.y * 5);
      const wob = noise(p.y * 6, p.z * 6, 2) * 2.5, side = sstep(0.04, 0.12, Math.abs(p.x)) * sstep(1.25, 1.1, p.y);
      // the dewlap's big pleats, and the fine upright wrinkles all down the side of the neck (Chris's photos)
      return neck * (0.011 * low * Math.sin(p.z * 42 + p.y * 14 + wob) * (0.6 + 0.6 * noise(p.z * 9, p.y * 4, 7))
        + 0.0032 * side * Math.sin(p.z * 170 + p.y * 9 + wob * 2.2) * (0.5 + 0.7 * noise(p.z * 30, p.y * 3, 5)) * sstep(0.62, 0.72, p.z));
    }
    function bodyDisp(p, n) {
      let d = 0;
      for (const [bx, by, bz, rx, ry, rz, a] of BUMPS) { const dx = (Math.abs(p.x) - bx) / rx, dy = (p.y - by) / ry, dz = (p.z - bz) / rz; d += a * BK * Math.exp(-(dx * dx + dy * dy + dz * dz)); }
      d += folds(p);
      if (SB) return d;
      // ribs, faintly, on the barrel's sides; the backbone, a soft ridge; the coat's lie
      d += 0.0035 * Math.sin(p.z * 38 + 1) * sstep(-0.3, -0.1, p.z) * sstep(0.35, 0.15, p.z) * gauss(p.y - 0.85, 0.12) * sstep(0.2, 0.28, Math.abs(p.x));
      d += 0.008 * gauss(p.x, 0.03) * sstep(-0.6, -0.4, p.z) * sstep(0.35, 0.2, p.z);
      d += 0.004 * (fbm(p.x * 9, p.y * 9, p.z * 9) - 0.5);
      return d;
    }
    function bodyW(p) {
      let w = along(p.z, [[-0.45, 'pelvis'], [-0.05, 'spine'], [0.36, 'chest'], [0.62, 'neck1'], [0.9, 'neck2'], [1.08, 'head']]);
      // the barrel swells with each breath
      const rb = gauss(p.z + 0.02, 0.3) * sstep(0.5, 0.65, p.y) * sstep(1.2, 1.05, p.y) * sstep(0.08, 0.2, Math.abs(p.x)); if (rb > 0.02) w = mix(w, [['ribs', 1]], rb * 0.7);
      // the hump rides on its own bone, and the dewlap on its own
      const hk = sstep(1.12, 1.28, p.y) * gauss(p.z - 0.58, 0.15); if (hk > 0) w = mix(w, [['hump', 1]], hk * 0.85);
      const dk = sstep(0.82, 0.62, p.y) * gauss(p.z - 0.78, 0.16) * gauss(p.x, 0.09); if (dk > 0) w = mix(w, [['dewlap', 1]], dk * 0.8);
      // the skin over the top of each leg moves with it
      const s = p.x >= 0 ? 'L' : 'R';
      const sh = gauss(Math.abs(p.x) - 0.24, 0.08) * gauss(p.y - 0.70, 0.13) * gauss(p.z - 0.50, 0.12); if (sh > 0.02) w = mix(w, [['sh' + s, 1]], sh * 0.6);
      const hp = gauss(Math.abs(p.x) - 0.25, 0.09) * gauss(p.y - 0.74, 0.16) * gauss(p.z + 0.42, 0.15); if (hp > 0.02) w = mix(w, [['hi' + s, 1]], hp * 0.6);
      return w;
    }
    const RAD = Q(SB ? 80 : 112, 28);
    put('coat', shade(loft(TORSO, RAD, Q(SB ? 9 : 12, 3), 0.16), bodyDisp), bodyCol, bodyW, p => 1);
    // a bull's sheath, and (not in the storybook) his scrotum
    if (look.bull) {
      put('coat', shade(loft([{z: 0.02, y: 0.56, w: 0.03, up: 0.03, dn: 0.03}, {z: 0.08, y: 0.53, w: 0.045, up: 0.05, dn: 0.05}, {z: 0.18, y: 0.50, w: 0.042, up: 0.06, dn: 0.045}, {z: 0.27, y: 0.505, w: 0.03, up: 0.05, dn: 0.035}, {z: 0.31, y: 0.51, w: 0.012, up: 0.02, dn: 0.02}], Q(20, 10), 3, 0.2)), coat, 'spine', 1);
      if (!SB) for (const s of [1, -1]) put('coat', shade(ball(0.05, 0.085, 0.055).translate(0.027 * s, 0.5, -0.565)), p => tmp.copy(cBelly).lerp(cSkin, 0.35), 'pelvis', 0.7);
    }

    // ---------- the head ----------
    const HEAD = SB ? [
      // the storybook head: a round skull and a short, broad muzzle with a big soft nose
      {z: -0.125, y: -0.015, w: 0.02, up: 0.02, dn: 0.02},
      {z: -0.11, y: -0.015, w: 0.072, up: 0.065, dn: 0.07},
      {z: -0.075, y: -0.02, w: 0.112, up: 0.095, dn: 0.11},
      {z: -0.025, y: -0.03, w: 0.132, up: 0.108, dn: 0.13, sq: 2.05},
      {z: 0.045, y: -0.04, w: 0.138, up: 0.108, dn: 0.14, sq: 2.05},
      {z: 0.12, y: -0.045, w: 0.128, up: 0.097, dn: 0.13, sq: 2.05},
      {z: 0.19, y: -0.05, w: 0.112, up: 0.082, dn: 0.112, sq: 2.1},
      {z: 0.245, y: -0.05, w: 0.108, up: 0.074, dn: 0.1, sq: 2.2},
      {z: 0.29, y: -0.05, w: 0.112, up: 0.072, dn: 0.096, sq: 2.3},
      {z: 0.325, y: -0.052, w: 0.104, up: 0.064, dn: 0.087, sq: 2.4},
      {z: 0.35, y: -0.055, w: 0.08, up: 0.047, dn: 0.064, sq: 2.3},
      {z: 0.362, y: -0.058, w: 0.03, up: 0.02, dn: 0.025}
    ] : [
      {z: -0.108, y: -0.03, w: 0.012, up: 0.012, dn: 0.014},
      {z: -0.1, y: -0.026, w: 0.045, up: 0.04, dn: 0.05},
      {z: -0.085, y: -0.022, w: 0.074, up: 0.058, dn: 0.075},
      {z: -0.06, y: -0.02, w: 0.098, up: 0.072, dn: 0.1},
      {z: -0.03, y: -0.025, w: 0.112, up: 0.08, dn: 0.118},
      {z: 0.0, y: -0.035, w: 0.118, up: 0.085, dn: 0.13, sq: 2.2},
      {z: 0.07, y: -0.045, w: 0.122, up: 0.085, dn: 0.145, sq: 2.3},
      {z: 0.14, y: -0.05, w: 0.112, up: 0.078, dn: 0.13, sq: 2.3},
      {z: 0.22, y: -0.05, w: 0.092, up: 0.064, dn: 0.108, sq: 2.2},
      {z: 0.31, y: -0.05, w: 0.077, up: 0.054, dn: 0.09, sq: 2.1},
      {z: 0.40, y: -0.05, w: 0.071, up: 0.05, dn: 0.08, sq: 2.1},
      {z: 0.47, y: -0.05, w: 0.077, up: 0.05, dn: 0.074, sq: 2.2},
      {z: 0.515, y: -0.055, w: 0.07, up: 0.043, dn: 0.062, sq: 2.3},
      {z: 0.54, y: -0.058, w: 0.05, up: 0.03, dn: 0.045, sq: 2.2},
      {z: 0.552, y: -0.06, w: 0.02, up: 0.012, dn: 0.02}
    ];
    const NOSE = SB ? 0.275 : 0.43;   // where the bare nose begins, along the face
    // the face's bones and hollows, in the head's own frame: [lx, ly, lz, rx, ry, rz, push]
    const FACE = SB ? [
      [0.0, 0.08, -0.03, 0.08, 0.035, 0.05, 0.012],     // the poll between the horns
      [0.1, -0.1, 0.1, 0.045, 0.05, 0.06, 0.01]         // round cheeks
    ] : [
      [0.093, 0.008, 0.13, 0.03, 0.03, 0.035, 0.016],   // the ridge of bone round each eye
      [0.088, -0.035, 0.17, 0.03, 0.02, 0.05, -0.01],   // the hollow under the eye
      [0.1, -0.1, 0.06, 0.035, 0.05, 0.06, 0.014],      // the cheek muscle
      [0.0, 0.075, -0.02, 0.075, 0.03, 0.045, 0.016],   // the poll, the ridge of bone between the horns
      [0.0, 0.05, 0.2, 0.025, 0.02, 0.12, 0.006],       // the bridge of the nose
      [0.032, -0.03, 0.535, 0.016, 0.014, 0.02, -0.013],// the nostrils
      [0.07, -0.02, 0.47, 0.02, 0.03, 0.04, 0.008],     // the flare of the muzzle
      [0.05, 0.03, 0.08, 0.03, 0.02, 0.05, -0.006]      // a little dip in front of the horn
    ];
    function headDisp(p) {
      const [lx, ly, lz] = toL(p); let d = 0;
      for (const [bx, by, bz, rx, ry, rz, a] of FACE) { const dx = (Math.abs(lx) - bx) / rx, dy = (ly - by) / ry, dz = (lz - bz) / rz; d += a * Math.exp(-(dx * dx + dy * dy + dz * dz)); }
      if (SB) return d;
      // the nostril slit, curving out and back; fine wrinkles of the muzzle's skin; the hair's lie
      const nx = Math.abs(lx) - 0.03 - (0.54 - lz) * 0.3; d -= 0.006 * gauss(nx, 0.006) * sstep(0.5, 0.53, lz) * gauss(ly + 0.03, 0.02);
      d += 0.0012 * Math.sin(lx * 260 + ly * 90) * sstep(0.45, 0.49, lz);
      d += 0.002 * (fbm(p.x * 14, p.y * 14, p.z * 14) - 0.5);
      return d;
    }
    const cBlush = COL(look.blush || 0xf2b4ab);
    function headCol(p) {
      const [lx, ly, lz] = toL(p); coat(p);
      if (SB) {
        tmp.lerp(cShade, sstep(0.02, -0.1, lz) * 0.5);
        tmp.lerp(cBlush, cl(gauss(Math.abs(lx) - 0.11, 0.035) * gauss(ly + 0.07, 0.035) * gauss(lz - 0.17, 0.04) * 1.3, 0, 0.8));
        return tmp.lerp(cMuzzle, sstep(NOSE - 0.012, NOSE + 0.012, lz + ly * 0.12));
      }
      tmp.lerp(cShade, (sstep(0.0, 0.25, lz) * 0.12 + gauss(Math.abs(lx) - 0.1, 0.03) * gauss(ly + 0.08, 0.06) * 0.2) * (isWhite ? 1 : 0.5));
      // dark rims round the eyes, as Zebu have
      const er = gauss(Math.abs(lx) - 0.098, 0.016) * gauss(ly + 0.012, 0.024) * gauss(lz - 0.137, 0.035); tmp.lerp(cMuzzle, cl(er * 1.2, 0, 0.85));
      // the bare black nose, with a soft edge into the hair
      const m = sstep(NOSE, NOSE + 0.04, lz + ly * 0.15 + noise(lx * 40, ly * 40, 3) * 0.012); tmp.lerp(cMuzzle, m);
      return tmp;
    }
    const headRough = p => { const [lx, ly, lz] = toL(p); return lerp(1, 0.32, sstep(NOSE + 0.01, NOSE + 0.05, lz + ly * 0.15)); };
    put('coat', shade(placeH(loft(HEAD, Q(SB ? 72 : 96, 24), Q(SB ? 8 : 10, 3), 0.12)), headDisp), headCol, 'head', headRough);
    // the lower jaw, its chin and lips
    const JAW = SB ? [{z: 0.06, y: -0.118, w: 0.07, up: 0.03, dn: 0.05}, {z: 0.15, y: -0.112, w: 0.07, up: 0.03, dn: 0.045}, {z: 0.25, y: -0.108, w: 0.072, up: 0.028, dn: 0.04}, {z: 0.31, y: -0.104, w: 0.06, up: 0.022, dn: 0.03}, {z: 0.335, y: -0.1, w: 0.03, up: 0.012, dn: 0.014}]
      : [{z: 0.08, y: -0.13, w: 0.06, up: 0.03, dn: 0.045}, {z: 0.2, y: -0.125, w: 0.052, up: 0.03, dn: 0.035}, {z: 0.34, y: -0.118, w: 0.048, up: 0.028, dn: 0.03}, {z: 0.46, y: -0.112, w: 0.05, up: 0.026, dn: 0.028}, {z: 0.505, y: -0.108, w: 0.04, up: 0.018, dn: 0.02}, {z: 0.52, y: -0.106, w: 0.015, up: 0.008, dn: 0.008}];
    const jawW = p => { const lz = toL(p)[2]; return lz > 0.25 ? [['jaw', 1]] : mix([['head', 1]], [['jaw', 1]], sstep(0.08, 0.25, lz)); };
    put('coat', shade(placeH(loft(JAW, Q(36, 14), Q(5, 2), 0.18)), headDisp), p => { const [lx, ly, lz] = toL(p); coat(p); return tmp.lerp(cMuzzle, sstep(NOSE - 0.01, NOSE + 0.03, lz)); }, jawW, headRough);
    // inside the mouth (seen when he moos or yawns), and the tongue
    const MOUTH = SB ? [0.25, -0.1, 0.05, 0.034, 0.07] : [0.42, -0.108, 0.04, 0.026, 0.075];
    put('mouth', shade(placeH(ball(MOUTH[2], MOUTH[3], MOUTH[4]).translate(0, MOUTH[1], MOUTH[0]))), COL(0x3a1a20), p => { const ly = toL(p)[1]; return mix([['head', 1]], [['jaw', 1]], sstep(MOUTH[1] + 0.012, MOUTH[1] - 0.012, ly)); }, 0.4);
    {
      const tz0 = SB ? 0.19 : 0.29, tz1 = SB ? 0.3 : 0.44, ty = SB ? -0.098 : -0.106, tr = SB ? 0.026 : 0.02;
      const g = sweep([toW(0, ty, tz0), toW(0, ty + 0.002, (tz0 + tz1) / 2), toW(0, ty + 0.004, tz1)], t => { const r = tr * (t < 0.85 ? 1 : Math.sqrt(Math.max(0.01, 1 - ((t - 0.85) / 0.15) ** 2))); return [r * 1.25, r * 0.55]; }, {n: Q(14, 6), m: Q(14, 8), tile: 0.05, side: V3(1, 0, 0)});
      put('tongue', shade(g), COL(SB ? 0xe58f99 : 0xb86a72), 'tongue', 0.35);
    }
    if (!SB) put('dark', shade(placeH(ball(0.052, 0.0045, 0.05).translate(0, -0.104, 0.47))), cMuzzle, 'jaw', 0.5);
    if (SB) {
      // the storybook nose: two dark nostrils and a shine
      for (const s of [1, -1]) put('coat', shade(placeH(ball(0.02, 0.013, 0.01).rotateZ(0.35 * s).translate(0.036 * s, -0.04, 0.356))), COL(0x15121d), 'head', 1);
      put('shine', shade(placeH(ball(0.016, 0.008, 0.006).rotateZ(-0.2).translate(0.022, 0.005, 0.352))), COL(0xffffff), 'head', 1);
    }

    // ---------- eyes ----------
    const eyeUV = {};
    for (const s of [1, -1]) {
      const n = s > 0 ? 'L' : 'R', c = eyeC[n], ax = eyeAx[n];
      if (SB) {
        // a big painted eye, its texture laid on flat from the front, so the catchlights point toward the nose
        const g = ellipsoidAt(c.clone().addScaledVector(ax, -0.004), ax, EYE.r, Q(40, 16), Q(28, 10));
        let ue = V3(0, 0, 1).addScaledVector(ax, -ax.z).normalize(); const ve = V3(0, 1, 0).addScaledVector(ax, -ax.y).addScaledVector(ue, -ue.y).normalize();
        const p = g.attributes.position, uv = new Float32Array(p.count * 2), d = V3(0, 0, 0), R0 = Math.max(EYE.r[0], EYE.r[1]) * 1.02;
        for (let i = 0; i < p.count; i++) { d.fromBufferAttribute(p, i).sub(c); uv[i * 2] = 0.5 + d.dot(ue) / (2 * R0); uv[i * 2 + 1] = 0.5 + d.dot(ve) / (2 * R0); }
        g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        put('eyeSB', shade(g), COL(0xffffff), 'eye' + n, 1);
        continue;
      }
      // envoi: a dark eye under a glossy cornea
      const eyeG = ellipsoidAt(c.clone().addScaledVector(ax, -0.006), ax, EYE.r, Q(24, 12), Q(18, 8));
      const ec = new THREE.Color(), iris = COL(0x2a1a12), pupil = COL(0x080605), white = COL(0xc9bba8);
      put('eye', shade(eyeG), (p) => { const d = p.clone().sub(c).normalize(), k = d.dot(ax); const up = Math.abs(d.y - ax.y * k); return ec.copy(white).lerp(iris, sstep(0.45, 0.62, k)).lerp(pupil, sstep(0.8, 0.88, k) * sstep(0.16, 0.08, up)); }, 'head', 0.7);
      put('cornea', shade(ellipsoidAt(c.clone().addScaledVector(ax, -0.0045), ax, [EYE.r[0] * 1.03, EYE.r[1] * 1.03, EYE.r[2] * 1.02], Q(24, 12), Q(18, 8))), COL(0x000000), 'head', 0.05);
      // the lower lid: a rim of dark skin
      { const pts = []; for (let i = 0; i <= 8; i++) { const a = lerp(-1.25, 1.25, i / 8); const q = toL(c); pts.push(toW(q[0] + s * 0.012 * Math.cos(a) * 0.4, q[1] - 0.017 * Math.cos(a * 0.9), q[2] + Math.sin(a) * 0.022)); }
        put('coat', shade(sweep(pts, t => 0.004 * Math.sin(PI * (0.08 + 0.84 * t)) + 0.0015, {n: Q(16, 8), m: 8, tile: 0.1})), cMuzzle, 'head', 0.6); }
      // the upper lid: a cap of skin over the top of the eye, on its own bone; it swings down over the eye to blink
      const up = V3(0, 1, 0).addScaledVector(ax, -ax.y).normalize(), lidR = Math.max(...EYE.r) * 1.2, open = 1.18;
      const lg = new THREE.SphereGeometry(lidR, Q(28, 12), Q(10, 5), 0, TAU, 0, open);
      lg.applyMatrix4(new THREE.Matrix4().makeBasis(V3(0, 0, 0).crossVectors(up, ax), up, ax)).translate(c.x, c.y, c.z);
      put('coat', shade(lg), p => { const d = p.clone().sub(c).normalize(), a = Math.acos(cl(d.dot(up), -1, 1)); coat(p); return tmp.lerp(cMuzzle, sstep(open - 0.45, open - 0.05, a)); }, 'lid' + n, 0.8);
      // lashes along the lid's edge, long and pale on a white animal
      const side = V3(0, 0, 0).crossVectors(up, ax).normalize(), nl = Q(16, 8);
      for (let i = 0; i < nl; i++) {
        const a = lerp(-1.1, 1.1, i / (nl - 1)), dir0 = up.clone().multiplyScalar(Math.cos(open)).addScaledVector(ax.clone().multiplyScalar(Math.cos(a)).addScaledVector(side, Math.sin(a)), Math.sin(open));
        const b = c.clone().addScaledVector(dir0, lidR), dir = dir0.clone().multiplyScalar(0.6).addScaledVector(up, 0.5).normalize(), L = 0.016 + 0.006 * Math.cos(a);
        put('hair', shade(sweep([b, b.clone().addScaledVector(dir, L * 0.5).add(V3(0, 0.002, 0)), b.clone().addScaledVector(dir, L).add(V3(0, -0.002, 0))], t => 0.0007 * (1 - t) + 0.0002, {n: 3, m: 3})), isWhite ? COL(0xe8e2d4) : cTuft, 'lid' + n, 0.6);
      }
      eyeUV[n] = {up, ax, side, close: 1.2};
    }

    // ---------- horns ----------
    // His left horn is whole: up from the poll, then curving in and back at the tip, pale at the base and dark grey to
    // nearly black from the middle up. His right one is broken: a pink stub two-thirds as long, pointing out and up, with
    // dark patches toward its blunt, broken end (Chris's photos).
    const hornCol = new THREE.Color(), hBase = COL(SB ? look.hornBase : 0xb8a898), hMid = COL(SB ? look.hornMid : 0x5a5250), hTip = COL(SB ? look.hornTip : 0x262224);
    for (const s of [1, -1]) {
      const side = s > 0 ? 'left' : 'right', Bp = toW(0.075 * s, SB ? 0.06 : 0.03, SB ? -0.02 : -0.005), Bin = toW(0.035 * s, -0.02, 0.01);   // Bin: buried inside the skull
      if (look.horn[side] === 'whole') {
        const hl = (look.hornLen || 1) * (SB ? 0.68 : 1.05), ho = look.hornOut || 1;
        const pts = key === 'henry' || (look.name === 'Henry') ? [[0, 0, 0], [0.05, 0.075, -0.02], [0.082, 0.16, -0.04], [0.07, 0.24, -0.05], [0.035, 0.3, -0.035]] : [[0, 0, 0], [0.045, 0.07, -0.035], [0.085, 0.15, -0.04], [0.085, 0.22, 0.02], [0.05, 0.265, 0.10]];
        const P = [Bin].concat(pts.map(p => Bp.clone().add(V3(p[0] * s * hl * ho, p[1] * hl, p[2] * hl))));
        const r0 = SB ? 0.052 : 0.05, r1 = SB ? 0.017 : 0.008;
        const g = sweep(P, (t, a) => { const r = lerp(r0, r1, Math.pow(cl((t - 0.12) / 0.88, 0, 1), 0.9)) * (SB ? 1 : 1 + 0.03 * Math.sin(t * 75) * sstep(0.6, 0.2, t)); return [r * 1.08, r * 0.95]; }, {n: Q(56, 16), m: Q(22, 10), tile: 0.06, side: V3(s, 0, 0)});
        const Lh = 0.36 * hl;
        put('horn', shade(g), p => { const t = cl(p.distanceTo(Bp) / Lh, 0, 1); hornCol.copy(hBase).lerp(hMid, sstep(0.2, 0.45, t)).lerp(hTip, sstep(0.5, 0.95, t)); if (!SB) hornCol.multiplyScalar(0.85 + 0.25 * noise(p.x * 60, p.y * 60, p.z * 60)); return hornCol.lerp(coat(p), sstep(0.06, 0.015, t)); }, 'head', p => 0.4);
      } else if (look.horn[side] === 'broken') {
        const hb = SB ? 0.72 : 1;
        const P = [Bin, Bp, Bp.clone().add(V3(0.055 * s * hb, 0.055 * hb, -0.005)), Bp.clone().add(V3(0.12 * s * hb, 0.1 * hb, -0.012)), Bp.clone().add(V3(0.165 * s * hb, 0.125 * hb, -0.016))];
        const end = P[4].clone(), dirT = end.clone().sub(P[3]).normalize();
        const g = sweep(P, (t, a) => { const r = lerp(SB ? 0.054 : 0.05, SB ? 0.036 : 0.03, Math.pow(cl((t - 0.15) / 0.85, 0, 1), 0.9)); return r * (1 + (SB ? 0.06 : 0.1) * sstep(0.88, 1, t) * (noise(a * 2.5, t * 9, 1) - 0.5)); }, {n: Q(30, 10), m: Q(28, 10), tile: 0.06, side: V3(s, 0, 0),
          end: (q, a) => { const k = SB ? 0.5 + 0.5 * Math.sin(a * 3) : noise(a * 1.6 + 3, 1, 2); q.addScaledVector(dirT, (k - 0.55) * (SB ? 0.018 : 0.016)); }, capAt: c => c.clone().addScaledVector(dirT, 0.004)});
        const spot = COL(SB ? look.stumpSpot : 0x3c3335), pink = COL(SB ? look.stump : 0xc98c7a), topC = COL(SB ? look.stumpTop : 0xd8a898), Ls = Bp.distanceTo(end);
        put('horn', shade(g), p => {
          const t = cl(p.distanceTo(Bp) / Ls, 0, 1.1), n2 = noise(p.x * (SB ? 45 : 70), p.y * (SB ? 45 : 70), p.z * (SB ? 45 : 70));
          hornCol.copy(pink); if (n2 > 0.56 - 0.12 * t) hornCol.lerp(spot, sstep(0.56 - 0.12 * t, 0.64 - 0.12 * t, n2) * sstep(0.25, 0.6, t) * 0.9);
          hornCol.lerp(topC, sstep(1.0, 1.06, t) * 0.5); if (!SB) hornCol.multiplyScalar(0.88 + 0.2 * noise(p.x * 200, p.y * 200, 0));
          return hornCol.lerp(coat(p), sstep(0.12, 0.04, t));
        }, 'head', p => 0.7);
      }
    }

    // ---------- ears: short, held straight out to the sides, cupped open to the front; two bones each, on springs ----------
    // (Chris's photos: white outside, pink skin and dark hair inside, rolled into a tube at the base)
    const cEarIn = COL(SB ? look.earIn : 0xc49088), cEarHair = COL(0x55463f);
    for (const s of [1, -1]) {
      const n = s > 0 ? 'L' : 'R', E = BW['ear' + n], d = V3(EAR.dir[0] * s, EAR.dir[1], EAR.dir[2]).normalize(), L = EAR.L;
      const P = [0, 0.3, 0.65, 1].map(t => E.clone().addScaledVector(d, L * t).add(V3(0, -0.02 * Math.sin(PI * t) * (SB ? 1.4 : 1), 0.012 * t)));
      const width = t => EAR.w * (0.42 + 0.58 * Math.pow(Math.sin(PI * (0.06 + 0.82 * t)), 0.8)) * (t > 0.85 ? Math.sqrt(Math.max(0.05, 1 - ((t - 0.85) / 0.15) ** 2)) : 1);
      // flat and thin with a rolled edge, curled into a cup whose open side faces forward; rolled tighter at the base
      const g = sweep(P, (t, a) => { const w = width(t), ca = Math.cos(a), th = (0.005 + 0.006 * (1 - t)) * (1 + 0.8 * Math.pow(Math.abs(ca), 10)) * (SB ? 1.4 : 1); return [w, th, -s * w * (0.62 - 0.35 * t) * (1 - ca * ca)]; }, {n: Q(30, 10), m: Q(30, 12), tile: 0.12, side: V3(0, 1, 0)});
      const NN = g.userData.rows, RR = g.userData.ring, inner = V3(s * 0.15, 0.1, 1).normalize();
      const earW = (p, i) => { const t = i >= NN * RR ? (i === NN * RR ? 0 : 1) : Math.floor(i / RR) / (NN - 1); return along(t, [[0.32, 'ear' + n], [0.62, 'ear' + n + '2']]); };
      put('coat', shade(g), (p, i) => {
        coat(p); const nn = g.attributes.normal, k = nn.getX(i) * inner.x + nn.getY(i) * inner.y + nn.getZ(i) * inner.z, row = Math.floor(i / RR) / (NN - 1), ring = (i % RR) / (RR - 1);
        const inside = sstep(-0.05, 0.4, k) * sstep(0.02, 0.15, row);
        if (SB) return tmp.lerp(cEarIn, inside * 0.9);
        // dark hair down the middle of the inside, pink skin toward the edges, white at the rim
        const mid = gauss(Math.cos(ring * TAU), 0.55);
        tmp2.copy(cEarIn).lerp(cEarHair, mid * 0.8 * sstep(0.1, 0.3, row) * (0.6 + 0.4 * noise(p.x * 80, p.y * 80, p.z * 80)));
        return tmp.lerp(tmp2, inside * 0.95);
      }, earW, 1);
      if (!SB) {
        // tufts of hair standing up inside the cup
        const fwd = V3(0, 0, 1);
        for (let i = 0; i < Q(36, 10); i++) {
          const t = 0.18 + 0.62 * (i / Q(36, 10)), c = g.userData.curve.getPointAt(t), b = c.clone().addScaledVector(V3(0, 1, 0), (Math.sin(i * 2.4)) * width(t) * 0.55).addScaledVector(fwd, 0.004);
          const dd = fwd.clone().multiplyScalar(0.8).addScaledVector(d, 0.5).normalize();
          put('hair', shade(sweep([b, b.clone().addScaledVector(dd, 0.01), b.clone().addScaledVector(dd, 0.018).add(V3(0, -0.003, 0))], t2 => 0.0009 * (1 - t2) + 0.0002, {n: 3, m: 3})), i % 3 ? cEarHair : COL(0xd8cfc4), () => along(t, [[0.32, 'ear' + n], [0.62, 'ear' + n + '2']]), 1);
        }
      }
    }

    // ---------- legs ----------
    // a smooth curve through [t, value] keys
    const keys = K => t => { if (t <= K[0][0]) return K[0][1]; for (let i = 0; i < K.length - 1; i++) if (t <= K[i + 1][0]) return lerp(K[i][1], K[i + 1][1], ease((t - K[i][0]) / (K[i + 1][0] - K[i][0]))); return K[K.length - 1][1]; };
    const grime = COL(0x8a7a62);
    const legCol = p => { coat(p); if (SB) return tmp.lerp(cShade, sstep(0.45, 0.15, p.y) * 0.25); tmp.lerp(cShade, sstep(0.5, 0.2, p.y) * 0.15); return tmp.lerp(grime, sstep(0.34, 0.06, p.y + 0.04 * (noise(p.x * 30, p.z * 30, 1) - 0.5)) * (isWhite ? 0.55 : 0.25)); };
    const LEGK = SB ? 1.16 : 1;   // the storybook's legs are chunkier
    function leg(s, front) {
      const n = s > 0 ? 'L' : 'R', X = a => V3(a[0] * s, a[1], a[2]);
      const J = front ? FL : HL;
      let P, R, bones;
      if (front) {
        // from inside the shoulder down: the forearm, the knee, the cannon, the fetlock, the pastern
        P = [X([0.1, 1.0, 0.50]), X([0.13, 0.9, 0.5]), X([0.155, 0.76, 0.475]), X(J.el), X([0.17, 0.52, 0.47]), X(J.kn), X([0.165, 0.25, 0.505]), X(J.fe), X([0.165, 0.07, 0.522])];
        const fr = keys([[0, 0.09], [0.2, 0.085], [0.36, 0.074], [0.5, 0.058], [0.57, 0.062], [0.63, 0.05], [0.8, 0.046], [0.87, 0.052], [0.93, 0.046], [1, 0.042]]);
        R = (t, a) => { const back = Math.max(0, -Math.sin(a)), r = fr(t) * (t > 0.4 ? LEGK : 1); return [r * 0.87, r * (1 + 0.25 * back * sstep(0.45, 0.25, t) + 0.1 * back * gauss(t - 0.72, 0.08))]; };
        bones = ['chest', 'sh' + n, 'el' + n, 'kn' + n, 'ff' + n];
      } else {
        P = [X([0.1, 1.02, -0.42]), X([0.14, 0.92, -0.40]), X([0.17, 0.78, -0.35]), X(J.st), X([0.195, 0.56, -0.44]), X(J.hk), X([0.168, 0.30, -0.54]), X(J.fe), X([0.165, 0.07, -0.505])];
        const hr = keys([[0, 0.11], [0.2, 0.1], [0.36, 0.078], [0.48, 0.066], [0.55, 0.062], [0.62, 0.05], [0.8, 0.045], [0.87, 0.051], [0.93, 0.046], [1, 0.042]]);
        R = (t, a) => {
          const back = Math.max(0, -Math.sin(a)), fwd = Math.max(0, Math.sin(a));
          const r = hr(t) * (t > 0.4 ? LEGK : 1);
          const hock = gauss(t - 0.545, 0.025) * back * (SB ? 0.015 : 0.035);   // the point of the hock sticks out behind
          return [r * 0.82, r * (1 + 0.3 * back * sstep(0.45, 0.2, t) + 0.12 * fwd * sstep(0.4, 0.25, t)) + hock];
        };
        bones = ['pelvis', 'hi' + n, 'st' + n, 'hk' + n, 'hf' + n];
      }
      const g = sweep(P, R, {n: Q(SB ? 80 : 110, 20), m: Q(SB ? 28 : 40, 12), tile: 0.12, side: V3(1, 0, 0)});
      const curve = g.userData.curve, jt = [J === FL ? J.sh : J.hi, J === FL ? J.el : J.st, J === FL ? J.kn : J.hk, J.fe].map(j => { let best = 0, bd = 1e9; for (let k = 0; k <= 200; k++) { const q = curve.getPointAt(k / 200), d = q.distanceTo(X(j)); if (d < bd) { bd = d; best = k / 200; } } return best; });
      const NN = g.userData.rows, RR = g.userData.ring;
      const legW = (p, i) => { const row = Math.min(NN - 1, Math.floor(i / RR)), t = i >= NN * RR ? (i === NN * RR ? 0 : 1) : row / (NN - 1); return along(t, [[jt[0] - 0.06, bones[0]], [jt[0] + 0.05, bones[1]], [jt[1] - 0.025, bones[1]], [jt[1] + 0.025, bones[2]], [jt[2] - 0.02, bones[2]], [jt[2] + 0.02, bones[3]], [jt[3] - 0.02, bones[3]], [jt[3] + 0.02, bones[4]]]); };
      put('coat', shade(g, SB ? null : p => 0.0025 * (fbm(p.x * 20, p.y * 20, p.z * 20) - 0.5)), legCol, legW, 1);
      // the hoof: two claws, split, with dew claws behind
      const hx = J.ho[0] * s, hz = J.ho[2], fb = bones[4], HKs = SB ? 1.2 : 1;
      for (const c of [1, -1]) {
        const cx = hx + c * 0.021 * HKs;
        const st = [];
        for (let k = 0; k <= 5; k++) { const t = k / 5, y = lerp(0.078 * (SB ? 1.15 : 1), 0.0, t); st.push({z: y, cx, cz: hz + lerp(-0.005, 0.03, t), w: lerp(0.019, 0.025, t) * HKs, d: lerp(0.032, 0.05, t) * HKs}); }
        const pos = [], idx = [], uv = [], M = Q(16, 8);
        st.forEach((r, k) => { for (let j = 0; j <= M; j++) { const a = (j % M) / M * TAU; let x = Math.cos(a) * r.w, z = Math.sin(a) * r.d; if (z > 0) z *= 1 + 0.35 * Math.pow(Math.max(0, Math.sin(a)), 4); if (c * Math.cos(a) < 0) x *= 0.45; pos.push(r.cx + x, r.z, r.cz + z); uv.push(j / M, r.z * 8); } });
        for (let k = 0; k < st.length - 1; k++) for (let j = 0; j < M; j++) { const a = k * (M + 1) + j, b = a + 1, cc = a + M + 1, d = cc + 1; idx.push(a, cc, b, b, cc, d); }
        const c0 = pos.length / 3; pos.push(cx, 0.08, hz); uv.push(0, 0); const c1 = c0 + 1; pos.push(cx, 0.0, hz + 0.012); uv.push(0, 0);
        const lastRow = (st.length - 1) * (M + 1); for (let j = 0; j < M; j++) { idx.push(c0, j + 1, j); idx.push(c1, lastRow + j, lastRow + j + 1); }
        const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); hg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); hg.setIndex(idx); hg.userData.ring = M + 1; hg.userData.rows = st.length;
        put('hoof', shade(hg), p => tmp2.copy(cHoof).multiplyScalar(SB ? 1 : 0.85 + 0.3 * sstep(0.0, 0.08, p.y)), fb, 0.55);
        if (!SB) put('hoof', shade(ball(0.011, 0.014, 0.013).translate(hx + c * 0.017, 0.105, hz - 0.055)), cHoof, fb, 0.6);
      }
    }
    for (const s of [1, -1]) { leg(s, true); leg(s, false); }

    // ---------- tail, and its switch ----------
    const tailW = p => along(-p.y, [[-1.08, 'tail0'], [-1.0, 'tail1'], [-0.86, 'tail2'], [-0.68, 'tail3'], [-0.5, 'tail4'], [-0.36, 'tail5']]);
    put('coat', shade(sweep(TAILP.slice(0, 6), t => lerp(SB ? 0.055 : 0.05, SB ? 0.024 : 0.02, Math.pow(t, 0.8)), {n: Q(30, 10), m: Q(12, 8), tile: 0.1, side: V3(1, 0, 0)})), p => coat(p), p => mix(tailW(p), [['pelvis', 1]], sstep(1.05, 1.1, p.y)), 1);
    if (SB) {
      // the storybook switch: a few soft dark tufts, like a paintbrush
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * TAU, r = i ? 0.03 : 0, L = i ? 0.16 : 0.2;
        const b = V3(Math.cos(a) * r * 0.5, 0.5, -0.742 + Math.sin(a) * r * 0.5), tip = V3(Math.cos(a) * r * 1.6, 0.5 - L, -0.742 + Math.sin(a) * r * 1.6);
        put('coat', shade(sweep([b, b.clone().lerp(tip, 0.5).add(V3(Math.cos(a) * r * 0.6, 0, Math.sin(a) * r * 0.6)), tip], t => 0.03 * Math.sin(PI * Math.min(1, 0.15 + t * 0.95)) + 0.004, {n: Q(10, 6), m: Q(10, 6), tile: 0.1})), cTuft, tailW, 1);
      }
    } else {
      let s = 11; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
      const nh = Q(260, 60), tc = cTuft;
      for (let i = 0; i < nh; i++) {
        const a = r() * TAU, rr = Math.sqrt(r()) * 0.022, y0 = 0.5 - r() * 0.08, L = 0.24 + r() * 0.16;
        const b = V3(Math.cos(a) * rr, y0, -0.742 + Math.sin(a) * rr), out = V3(Math.cos(a), 0, Math.sin(a));
        const pts = [b, b.clone().add(out.clone().multiplyScalar(0.02 + r() * 0.015)).add(V3(0, -L * 0.4, 0)), b.clone().add(out.clone().multiplyScalar(0.015 + r() * 0.03)).add(V3((r() - 0.5) * 0.02, -L * 0.8, (r() - 0.5) * 0.02)), b.clone().add(out.clone().multiplyScalar(r() * 0.04)).add(V3((r() - 0.5) * 0.03, -L, (r() - 0.5) * 0.03))];
        put('hair', shade(sweep(pts, t => 0.0016 * (1 - t * 0.7), {n: 5, m: 3})), tc.clone().multiplyScalar(0.8 + r() * 0.5), tailW, 0.6);
      }
    }

    // ---------- the storybook's proportions ----------
    // Everything is built at Henry's real proportions (so the weights, colours and shapes line up), then the storybook
    // squeezes it: shorter legs, a shorter, wider body, a short neck and a big head. Smooth everywhere, so no creases.
    const SBW = {legK: 0.62, y0: 0.44, y1: 0.68, zK: 0.86, nK: 0.5, z0: 0.52, z1: 0.72, wK: 1.14, headK: 1.5};
    const f1 = (x, k0, k1, a, b) => { if (x <= a) return k0 * x; const w = b - a, t = Math.min(1, (x - a) / w); return k0 * x + (k1 - k0) * (w * (t * t * t - t * t * t * t / 2) + Math.max(0, x - b)); };
    const d1 = (x, k0, k1, a, b) => k0 + (k1 - k0) * sstep(a, b, x);
    const pivot = BW.head.clone();
    function warpBody(v, o) { return o.set(v.x * SBW.wK, f1(v.y, SBW.legK, 1, SBW.y0, SBW.y1), f1(v.z, SBW.zK, SBW.nK, SBW.z0, SBW.z1)); }
    const pivotW = warpBody(pivot, new THREE.Vector3());
    function warpHead(v, o) { return o.copy(v).sub(pivot).multiplyScalar(SBW.headK).add(pivotW); }
    const HEADSET = new Set(['head', 'jaw', 'tongue', 'earL', 'earL2', 'earR', 'earR2', 'eyeL', 'eyeR', 'lidL', 'lidR'].map(n => BI[n]).filter(i => i != null));
    const W2 = {};
    for (const n in BW) W2[n] = SB ? (HEADSET.has(BI[n]) ? warpHead(BW[n], new THREE.Vector3()) : warpBody(BW[n], new THREE.Vector3())) : BW[n].clone();
    for (const b of B) { const p = b.parent && b.parent.isBone ? W2[b.parent.name] : V3(0, 0, 0); b.position.copy(W2[b.name]).sub(p); }

    // ---------- materials ----------
    function patch(m, o) {
      m.onBeforeCompile = sh => {
        sh.vertexShader = 'attribute float aRough;\nvarying float vRough;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vRough = aRough;');
        let fs = 'varying float vRough;\n' + sh.fragmentShader.replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness * vRough;');
        // soft light carried round into the shade, as through a thin white coat and skin
        if (o.soft) {
          fs = fs.replace('#include <lights_pars_begin>', '#include <lights_pars_begin>\nvec3 zebuSoft(IncidentLight dl, GeometricContext g) { float d = dot(g.normal, dl.direction); float w = clamp((d + .45) / 1.45, 0., 1.); return dl.color * max(0., w * w - max(d, 0.)) * vec3(' + o.soft.join(',') + '); }');
          fs = fs.replace('#include <lights_fragment_begin>', THREE.ShaderChunk.lights_fragment_begin.split('RE_Direct( directLight, geometry, material, reflectedLight );').join('RE_Direct( directLight, geometry, material, reflectedLight );\n\t\treflectedLight.directDiffuse += zebuSoft(directLight, geometry) * material.diffuseColor;'));
        }
        sh.fragmentShader = fs;
      };
      m.customProgramCacheKey = () => 'zebuhd-' + (o.soft ? 's' : '') + (o.key || '');
      return m;
    }
    // the storybook's cel shading: three hard steps and a cool rim of light (wren-3d's ramp and rim)
    const ramp = (() => { const t = new THREE.DataTexture(new Uint8Array([128, 128, 128, 255, 196, 196, 196, 255, 242, 242, 242, 255]), 3, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
    const toon = (o) => { const m = new THREE.MeshToonMaterial(Object.assign({vertexColors: true, gradientMap: ramp, skinning: true}, o)); m.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vec3(.62, .71, 1.) * .16 * smoothstep(.55, .85, 1. - abs(dot(normal, normalize(vViewPosition))));'); }; m.customProgramCacheKey = () => 'zebusb-rim'; return m; };
    const MATS = SOFT ? {
      // the cartoon lit by a real place: velvet on the coat, light carried round into the shade, glossy eyes that sparkle
      coat: patch(new THREE.MeshPhysicalMaterial({vertexColors: true, roughness: 0.72, metalness: 0, sheen: new THREE.Color(0x4a4a4a), skinning: true}), {soft: [0.62, 0.42, 0.34], key: 'sbcoat'}),
      horn: patch(new THREE.MeshStandardMaterial({vertexColors: true, roughness: 0.5, skinning: true}), {key: 'sbhorn'}),
      hoof: patch(new THREE.MeshStandardMaterial({vertexColors: true, roughness: 0.45, skinning: true}), {key: 'sbhoof'}),
      tongue: patch(new THREE.MeshPhysicalMaterial({vertexColors: true, roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.3, skinning: true}), {soft: [0.5, 0.18, 0.15], key: 'sbtongue'}),
      mouth: patch(new THREE.MeshStandardMaterial({vertexColors: true, roughness: 0.5, skinning: true}), {key: 'sbmouth'}),
      eyeSB: new THREE.MeshPhysicalMaterial({map: eyeTexture(look.iris || 0x3d2c2a, 'lit'), emissiveMap: eyeTexture(0, 'sparkle'), emissive: new THREE.Color(1, 1, 1), emissiveIntensity: 0.55, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.04, skinning: true}),
      shine: new THREE.MeshStandardMaterial({color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 0.25, skinning: true})
    } : SB ? {
      coat: toon(), horn: toon(), hoof: toon(), tongue: toon(),
      mouth: new THREE.MeshBasicMaterial({vertexColors: true, skinning: true}),
      eyeSB: new THREE.MeshBasicMaterial({map: eyeTexture(look.iris || 0x3d2c2a), skinning: true}),
      shine: new THREE.MeshBasicMaterial({color: 0xffffff, skinning: true})
    } : {
      coat: patch(new THREE.MeshPhysicalMaterial({vertexColors: true, map: TX.hairCol, normalMap: TX.hairNrm, normalScale: new THREE.Vector2(0.9, 0.9), roughness: 0.85, metalness: 0, sheen: new THREE.Color(isWhite ? 0x2a2a2a : 0x1a1a1a), skinning: true}), {soft: [0.55, 0.32, 0.26], key: 'coat'}),
      horn: patch(new THREE.MeshPhysicalMaterial({vertexColors: true, normalMap: TX.hornNrm, normalScale: new THREE.Vector2(0.7, 0.7), roughness: 1, clearcoat: 0.25, clearcoatRoughness: 0.5, skinning: true}), {key: 'horn'}),
      hoof: patch(new THREE.MeshStandardMaterial({vertexColors: true, normalMap: TX.hoofNrm, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 1, skinning: true}), {key: 'hoof'}),
      eye: patch(new THREE.MeshStandardMaterial({vertexColors: true, roughness: 1, skinning: true}), {key: 'eye'}),
      cornea: new THREE.MeshPhysicalMaterial({color: 0x000000, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, envMapIntensity: 0.55, skinning: true}),
      hair: patch(new THREE.MeshStandardMaterial({vertexColors: true, roughness: 0.7, skinning: true}), {key: 'hair'}),
      dark: patch(new THREE.MeshStandardMaterial({vertexColors: true, roughness: 0.6, skinning: true}), {key: 'dark'}),
      mouth: patch(new THREE.MeshStandardMaterial({vertexColors: true, roughness: 0.35, skinning: true}), {key: 'mouth'}),
      tongue: patch(new THREE.MeshPhysicalMaterial({vertexColors: true, roughness: 0.5, clearcoat: 0.5, clearcoatRoughness: 0.35, skinning: true}), {soft: [0.5, 0.18, 0.15], key: 'tongue'})
    };
    // the ink outline: the skin drawn again, a little fatter and inside out, in the game's ink, moving with the bones
    const ink = SB ? new THREE.ShaderMaterial({
      uniforms: {uInk: {value: opts.ink == null ? 0.011 : opts.ink}, uC: {value: COL(0x1d1b2c)}}, side: THREE.BackSide, skinning: true,
      vertexShader: ['#include <common>', '#include <skinning_pars_vertex>', 'attribute vec3 inkn;', 'uniform float uInk;', 'void main() {', '#include <skinbase_vertex>',
        'vec3 objectNormal = inkn;', '#include <skinnormal_vertex>', 'vec3 transformed = vec3(position);', '#include <skinning_vertex>',
        'transformed += normalize(objectNormal) * uInk;', '#include <project_vertex>', '}'].join('\n'),
      fragmentShader: 'uniform vec3 uC; void main() { gl_FragColor = vec4(uC, 1.); }'
    }) : null;
    const INKING = SB && (!SOFT || opts.ink > 0);
    const INKED = new Set(['coat', 'horn', 'hoof', 'tongue']);

    // ---------- bind everything to the skeleton ----------
    const R = new THREE.Group(); R.name = (look.name || 'Zebu') + (SB ? ' (storybook)' : ' (envoi)');
    R.add(B[BI.base]); R.updateMatrixWorld(true);
    const skeleton = new THREE.Skeleton(B);
    let TRIS = 0;
    const meshes = [], v = new THREE.Vector3(), hv = new THREE.Vector3(), nn = new THREE.Vector3();
    for (const [name, P] of Object.entries(PILES)) {
      if (!MATS[name]) continue;
      const pos = new Float32Array(P.pos), nor = new Float32Array(P.nor);
      if (SB) {
        // squeeze into the storybook's proportions; a point that follows the head grows with it
        for (let i = 0; i < pos.length / 3; i++) {
          let b = 0; for (let k = 0; k < 4; k++) if (HEADSET.has(P.si[i * 4 + k])) b += P.sw[i * 4 + k];
          v.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
          const jx = SBW.wK, jy = d1(v.y, SBW.legK, 1, SBW.y0, SBW.y1), jz = d1(v.z, SBW.zK, SBW.nK, SBW.z0, SBW.z1);
          warpHead(v, hv); warpBody(v, v); v.lerp(hv, b);
          pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
          // the normal: by the squeeze's own slopes
          const ax = lerp(jx, SBW.headK, b), ay = lerp(jy, SBW.headK, b), az = lerp(jz, SBW.headK, b);
          nn.set(nor[i * 3] / ax, nor[i * 3 + 1] / ay, nor[i * 3 + 2] / az).normalize(); nor[i * 3] = nn.x; nor[i * 3 + 1] = nn.y; nor[i * 3 + 2] = nn.z;
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(P.uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(P.col, 3));
      g.setAttribute('aRough', new THREE.Float32BufferAttribute(P.rough, 1));
      g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(P.si, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(P.sw, 4));
      g.setIndex(pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(P.idx, 1) : new THREE.Uint16BufferAttribute(P.idx, 1));
      g.computeBoundingSphere(); g.boundingSphere.radius += 1;
      const m = new THREE.SkinnedMesh(g, MATS[name]); m.frustumCulled = false; m.castShadow = !['cornea', 'eyeSB', 'shine', 'mouth'].includes(name); m.receiveShadow = name === 'coat';
      if (name === 'cornea') m.renderOrder = 2;
      R.add(m); m.bind(skeleton); meshes.push(m); TRIS += P.idx.length / 3;
      if (INKING && INKED.has(name)) {
        // normals that agree wherever two points meet, so the line doesn't split at seams
        const map = new Map(), out = new Float32Array(pos.length), key = i => Math.round(pos[i * 3] * 1e4) + ',' + Math.round(pos[i * 3 + 1] * 1e4) + ',' + Math.round(pos[i * 3 + 2] * 1e4);
        for (let i = 0; i < pos.length / 3; i++) { const k = key(i), a = map.get(k) || [0, 0, 0]; a[0] += nor[i * 3]; a[1] += nor[i * 3 + 1]; a[2] += nor[i * 3 + 2]; map.set(k, a); }
        for (let i = 0; i < pos.length / 3; i++) { const a = map.get(key(i)), l = Math.hypot(a[0], a[1], a[2]) || 1; out[i * 3] = a[0] / l; out[i * 3 + 1] = a[1] / l; out[i * 3 + 2] = a[2] / l; }
        g.setAttribute('inkn', new THREE.BufferAttribute(out, 3));
        const o = new THREE.SkinnedMesh(g, ink); o.frustumCulled = false; o.castShadow = false; R.add(o); o.bind(skeleton); TRIS += P.idx.length / 3;
      }
    }
    const size = look.size || 1;
    R.scale.setScalar(size);

    // ---------- the rig for zebu-moves.js ----------
    const Bn = {}; for (const b of B) Bn[b.name] = b;
    const tipOf = (a, b) => W2[b].clone().sub(W2[a]);
    const springs = [['hump', 260, 18, 0.12, V3(0, 0.15, 0)], ['dewlap', 110, 9, 0.3, V3(0, -0.22, 0.06)]];
    for (const n of ['L', 'R']) {
      const d = V3(EAR.dir[0] * (n === 'L' ? 1 : -1), EAR.dir[1], EAR.dir[2]).normalize().multiplyScalar(EAR.L * 0.52 * (SB ? SBW.headK : 1));
      springs.push(['ear' + n, SB ? 65 : 95, SB ? 6 : 9, 0.9, tipOf('ear' + n, 'ear' + n + '2')], ['ear' + n + '2', SB ? 55 : 80, SB ? 5 : 8, 0.9, d]);
    }
    for (let i = 0; i < 6; i++) springs.push(['tail' + i, lerp(150, 45, i / 5), lerp(12, 4, i / 5), i ? 0.75 : 0.45, i < 5 ? tipOf('tail' + i, 'tail' + (i + 1)) : V3(0, -0.14, 0)]);
    const lidAxis = {};
    if (!SB) for (const n of ['L', 'R']) { const e = eyeUV[n]; lidAxis[n] = V3(0, 0, 0).crossVectors(e.up, e.ax).normalize(); }
    const rig = {
      B: Bn, BW: W2, R, style, springs,
      dropK: SB ? f1(0.49, SBW.legK, 1, SBW.y0, SBW.y1) / 0.49 : 1,
      legLen: {front: W2.shL.y, hind: W2.hiL.y}, headScale: SB ? SBW.headK : 1,
      tongueAxis: toW(0, 0, 1).sub(toW(0, 0, 0)).normalize(),
      blink: SB ? k => { const y = Math.max(0.07, 1 - k * 0.93); Bn.eyeL.scale.set(1, y, 1); Bn.eyeR.scale.set(1, y, 1); }
        : k => { for (const n of ['L', 'R']) Bn['lid' + n].quaternion.setFromAxisAngle(lidAxis[n], k * eyeUV[n].close); },
      squash: SB ? s => R.scale.set(size * (1 - s * 0.45), size * (1 + s), size * (1 - s * 0.45)) : null,
      // the storybook stands on shorter legs, so its lying and grazing poses differ (solved the same way)
      poses: SB ? {graze: {nx: 1.15, n2x: -0.05, hx: -0.75, by: -0.02, bp: 0.07}} : {}
    };
    const mv = root.makeZebuMoves(rig);
    const AN = {head: toW(0, 0, SB ? 0.1 : 0.2), mouth: toW(0, -0.08, SB ? 0.32 : 0.5), poll: toW(0, 0.05, 0)};
    for (const k in AN) AN[k] = (SB ? warpHead(AN[k], new THREE.Vector3()) : AN[k]).sub(W2.head);
    function anchor(name, out) {
      out = out || new THREE.Vector3(); R.updateMatrixWorld(true);
      if (name === 'chest') return out.set(0, 0, 0).applyMatrix4(Bn.chest.matrixWorld);
      return out.copy(AN[name] || AN.head).applyMatrix4(Bn.head.matrixWorld);
    }
    mv.update(0, 0, {});
    return {root: R, look, style, moves: mv, events: mv.events, skeleton, meshes, bones: Bn, anchor,
      update: (dt, t, o) => mv.update(dt, t, o), animate: (dt, t, speed, turn) => mv.update(dt, t, {speed, turn}),
      act: n => mv.act(n), play: n => mv.play(n), lookAt: (p, h) => mv.lookAt(p, h), pose: n => mv.jump(n), setPose: (n, o) => mv.setPose(n, o),
      get state() { return mv.state; }, get busy() { return mv.busy; }, get tris() { return TRIS; }, MOVES: mv.MOVES};
  }
  root.makeZebuHD = makeZebuHD;
})(typeof window !== 'undefined' ? window : globalThis);
