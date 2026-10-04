// zebu-hd.js: the herd's Zebu cattle at full detail, built in code. three.js r128 (global THREE). Needs zebu.js first
// (for ZEBU_LOOKS). Defines makeZebuHD(look, opts).
//
// The same animals as zebu.js with the quality turned all the way up, made the way envoi makes its best models
// (envoi-on-the-longest-night 3d-model-main-characters/io and 3d-model-new-character-ideas/emberback): one continuous
// skin from rump to throat, a head with its bones showing through, real leg joints, all bound to a skeleton so the body
// bends as one piece; muscles, hip bones, the folds of the dewlap and neck pushed into the surface; hair painted into a
// normal map so the coat catches the light; glossy eyes, ringed horns, split hooves and a tail switch of single hairs.
// Shaded with physical materials (sheen on the coat, wet nose), for a renderer with sRGB output and ACES tone mapping.
//
// Units are metres, y is up, the animal faces +z with its feet at y = 0, its left side is +x (Henry's whole horn).
//   const z = makeZebuHD('henry', {detail: 1});   detail 0.4 to 1 (1 is about 250,000 triangles)
//   z.root, z.animate(dt, t, speed), z.act('stand' | 'eat' | 'lie'), z.state, z.busy, z.pose(name), z.tris, z.anchor(name)
// The same interface as makeZebu, so a game can use either.
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

  // ---------- painted in code: the coat's hair, as a tiling colour and a tiling normal map ----------
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
    // skin pores and a fine grain for the bare skin (muzzle), in the blue channel's place: a second small map
    const nrm = normalFrom(hc, 2.2);
    const mk = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; if (srgb) t.encoding = THREE.sRGBEncoding; return t; };
    // the horn: rings around it and fine lengthwise grain
    const hh = cvs(256, 256), hg = hh.getContext('2d'); hg.fillStyle = 'rgb(128,128,128)'; hg.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 3 + r() * 9) { const v = 90 + r() * 60; hg.fillStyle = `rgba(${v},${v},${v},0.8)`; hg.fillRect(0, y, 256, 1 + r() * 2); }
    for (let i = 0; i < 900; i++) { const x = r() * 256, y = r() * 256, v = 100 + r() * 90; hg.strokeStyle = `rgba(${v},${v},${v},0.5)`; hg.lineWidth = 0.8; hg.beginPath(); hg.moveTo(x, y); hg.lineTo(x + (r() - 0.5) * 2, y + 6 + r() * 20); hg.stroke(); }
    // the hoof: growth rings across it
    const fh = cvs(128, 128), fg = fh.getContext('2d'); fg.fillStyle = 'rgb(128,128,128)'; fg.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 2 + r() * 5) { const v = 95 + r() * 70; fg.fillStyle = `rgba(${v},${v},${v},0.7)`; fg.fillRect(0, y, 128, 1); }
    TEX = {size, hairCol: mk(col, true), hairNrm: mk(nrm), hornNrm: mk(normalFrom(hh, 1.6)), hoofNrm: mk(normalFrom(fh, 1.2))};
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

  function makeZebuHD(key, opts) {
    opts = opts || {};
    const LOOKS = root.ZEBU_LOOKS || {};
    const look = Object.assign({}, LOOKS.henry, typeof key === 'string' ? LOOKS[key] : key || {});
    const DET = cl(opts.detail == null ? 1 : opts.detail, 0.3, 1.5), Q = (n, m) => Math.max(m || 3, Math.round(n * DET));
    const LIN = opts.linear !== false;
    const COL = hex => { const c = new THREE.Color(hex); if (LIN) c.convertSRGBToLinear(); return c; };
    const TX = textures(DET < 0.6 ? 256 : 512);

    // ---------- the skeleton, where it sits when the animal stands ----------
    const B = [], BI = {}, BW = {};
    function bone(name, parent, x, y, z) {
      const b = new THREE.Bone(); b.name = name; const p = parent ? BW[parent] : V3(0, 0, 0); b.position.set(x - p.x, y - p.y, z - p.z);
      if (parent) B[BI[parent]].add(b); BI[name] = B.length; B.push(b); BW[name] = V3(x, y, z); return b;
    }
    bone('base', null, 0, 0.95, 0);
    bone('pelvis', 'base', 0, 0.95, -0.38); bone('spine', 'base', 0, 0.96, 0.02); bone('chest', 'spine', 0, 0.98, 0.42);
    bone('hump', 'chest', 0, 1.22, 0.56); bone('dewlap', 'chest', 0, 0.72, 0.80);
    bone('neck1', 'chest', 0, 0.98, 0.6); bone('neck2', 'neck1', 0, 1.06, 0.87);
    const HA = 1.02, HP = V3(0, 1.23, 1.07), hc = Math.cos(HA), hs = Math.sin(HA);
    const toW = (lx, ly, lz) => V3(lx, HP.y + ly * hc - lz * hs, HP.z + ly * hs + lz * hc);
    const toL = p => { const y0 = p.y - HP.y, z0 = p.z - HP.z; return [p.x, y0 * hc + z0 * hs, -y0 * hs + z0 * hc]; };
    bone('head', 'neck2', 0, 1.19, 1.06);
    { const j = toW(0, -0.1, 0.08); bone('jaw', 'head', 0, j.y, j.z); }
    for (const s of [1, -1]) { const e = toW(0.088 * s, -0.03, 0.035); bone(s > 0 ? 'earL' : 'earR', 'head', e.x, e.y, e.z); }
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
    // PI/2 faces T x side). Frames are carried along without twisting. Ends closed.
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

    // ---------- weights ----------
    // a smooth hand-over from one bone to the next along a coordinate: stops = [[value, bone], ...] in order
    function along(v, stops) {
      if (v <= stops[0][0]) return [[stops[0][1], 1]];
      for (let i = 0; i < stops.length - 1; i++) { const [a, ba] = stops[i], [b, bb] = stops[i + 1]; if (v <= b) { const t = ease((v - a) / (b - a)); return [[ba, 1 - t], [bb, t]]; } }
      return [[stops[stops.length - 1][1], 1]];
    }
    const mix = (A, Bw, k) => A.map(([b, w]) => [b, w * (1 - k)]).concat(Bw.map(([b, w]) => [b, w * k]));

    // ---------- colours ----------
    const cCoat = COL(look.coat), cShade = COL(look.shade), cBelly = COL(look.belly), cFold = COL(look.fold), cMuzzle = COL(look.muzzle), cSkin = COL(look.earIn), cHoof = COL(look.hoof), cTuft = COL(look.tuft);
    const cSpot = COL(look.spots ? look.spots.color : 0), tmp = new THREE.Color(), tmp2 = new THREE.Color();
    const isWhite = (cCoat.r + cCoat.g + cCoat.b) > 2.0;
    function coat(p) {
      const x = p.x, y = p.y, z = p.z;
      tmp.copy(cCoat);
      // white Zebu go grey over the hump, the neck and the shoulders; coloured ones go darker there
      const top = sstep(1.0, 1.32, y) * sstep(0.1, 0.55, z) * 0.6 + sstep(0.5, 0.95, z) * sstep(0.88, 1.25, y) * 0.35 + sstep(0.35, 0.6, z) * sstep(0.6, 0.95, y) * gauss(Math.abs(x) - 0.27, 0.06) * 0.25;
      tmp.lerp(cShade, cl(top * (look.topShade == null ? 1 : look.topShade) * (isWhite ? 1.5 : 1), 0, 0.85));
      if (isWhite) tmp.multiplyScalar(0.97 - 0.06 * noise(x * 2.5, y * 2.5 + 3, z * 2.5));
      tmp.lerp(cBelly, sstep(0.66, 0.46, y) * sstep(-0.5, -0.2, z) * 0.5);
      if (look.spots) { const sp = look.spots, n2 = noise(x * sp.scale + 11, y * sp.scale, z * sp.scale) * 0.7 + noise(x * sp.scale * 2.3, y * sp.scale * 2.3 + 5, z * sp.scale * 2.3) * 0.3; const k = sstep(sp.cut - 0.02, sp.cut + 0.02, n2); if (k > 0) tmp.lerp(cSpot, k); }
      tmp.multiplyScalar(0.93 + 0.12 * fbm(x * 7, y * 7, z * 7));
      return tmp;
    }
    const cDirt = COL(0x9a8a70);
    function bodyCol(p) {
      coat(p);
      let occ = 0;
      occ += sstep(0.58, 0.48, p.y) * 0.18;                                               // under the belly
      occ += gauss(Math.abs(p.x) - 0.2, 0.07) * gauss(p.y - 0.62, 0.1) * (gauss(p.z - 0.4, 0.1) + gauss(p.z + 0.3, 0.12)) * 0.35;   // behind the elbows, in front of the stifles
      occ += Math.max(0, -folds(p)) * 22;                                                 // in the folds of the dewlap
      occ += gauss(p.z + 0.66, 0.05) * gauss(p.x, 0.05) * sstep(1.0, 0.8, p.y) * 0.3;     // under the tail
      tmp.multiplyScalar(1 - cl(occ, 0, 0.45));
      // a little dried mud and dust low down on the flanks
      const mud = sstep(0.62, 0.45, p.y + 0.05 * (noise(p.x * 12, p.z * 12, 4) - 0.5)) * sstep(0.45, 0.65, noise(p.x * 5, p.y * 5, p.z * 5)) * (isWhite ? 0.3 : 0.12);
      return tmp.lerp(cDirt, mud);
    }
    // ---------- the body: rump to throat in one skin ----------
    const HK = look.hump == null ? 1 : look.hump, KK = look.bull ? 1 : 0.7;
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
    // folds down the dewlap and across the neck, the way the skin hangs in loose pleats
    function folds(p) {
      const neck = sstep(0.55, 0.72, p.z) * sstep(1.12, 1.0, p.z);
      if (!neck) return 0;
      const low = sstep(0.82, 0.62, p.y + (p.z - 0.6) * 0.5), wob = noise(p.y * 6, p.z * 6, 2) * 2.5;
      return neck * (0.011 * low * Math.sin(p.z * 42 + p.y * 14 + wob) * (0.6 + 0.6 * noise(p.z * 9, p.y * 4, 7)) + 0.0025 * (1 - low) * Math.sin(p.z * 50 + p.y * 20 + wob));
    }
    function bodyDisp(p, n) {
      let d = 0;
      for (const [bx, by, bz, rx, ry, rz, a] of BUMPS) { const dx = (Math.abs(p.x) - bx) / rx, dy = (p.y - by) / ry, dz = (p.z - bz) / rz; d += a * Math.exp(-(dx * dx + dy * dy + dz * dz)); }
      // ribs, faintly, on the barrel's sides
      d += 0.0035 * Math.sin(p.z * 38 + 1) * sstep(-0.3, -0.1, p.z) * sstep(0.35, 0.15, p.z) * gauss(p.y - 0.85, 0.12) * sstep(0.2, 0.28, Math.abs(p.x));
      // the backbone, a soft ridge
      d += 0.008 * gauss(p.x, 0.03) * sstep(-0.6, -0.4, p.z) * sstep(0.35, 0.2, p.z);
      d += folds(p);
      d += 0.004 * (fbm(p.x * 9, p.y * 9, p.z * 9) - 0.5);
      return d;
    }
    function bodyW(p) {
      let w = along(p.z, [[-0.45, 'pelvis'], [-0.05, 'spine'], [0.36, 'chest'], [0.62, 'neck1'], [0.9, 'neck2'], [1.08, 'head']]);
      // the hump rides on its own bone, and the dewlap on its own
      const hk = sstep(1.12, 1.28, p.y) * gauss(p.z - 0.58, 0.15); if (hk > 0) w = mix(w, [['hump', 1]], hk * 0.85);
      const dk = sstep(0.82, 0.62, p.y) * gauss(p.z - 0.78, 0.16) * gauss(p.x, 0.09); if (dk > 0) w = mix(w, [['dewlap', 1]], dk * 0.8);
      // the skin over the top of each leg moves with it
      const s = p.x >= 0 ? 'L' : 'R';
      const sh = gauss(Math.abs(p.x) - 0.24, 0.08) * gauss(p.y - 0.70, 0.13) * gauss(p.z - 0.50, 0.12); if (sh > 0.02) w = mix(w, [['sh' + s, 1]], sh * 0.6);
      const hp = gauss(Math.abs(p.x) - 0.25, 0.09) * gauss(p.y - 0.74, 0.16) * gauss(p.z + 0.42, 0.15); if (hp > 0.02) w = mix(w, [['hi' + s, 1]], hp * 0.6);
      return w;
    }
    const RAD = Q(112, 28);
    put('coat', shade(loft(TORSO, RAD, Q(12, 3), 0.16), bodyDisp), bodyCol, bodyW, p => 1);
    // a bull's sheath, and his scrotum
    if (look.bull) {
      put('coat', shade(loft([{z: 0.02, y: 0.56, w: 0.03, up: 0.03, dn: 0.03}, {z: 0.08, y: 0.53, w: 0.045, up: 0.05, dn: 0.05}, {z: 0.18, y: 0.50, w: 0.042, up: 0.06, dn: 0.045}, {z: 0.27, y: 0.505, w: 0.03, up: 0.05, dn: 0.035}, {z: 0.31, y: 0.51, w: 0.012, up: 0.02, dn: 0.02}], Q(20, 10), 3, 0.2)), coat, 'spine', 1);
      for (const s of [1, -1]) put('coat', shade(ball(0.05, 0.085, 0.055).translate(0.027 * s, 0.5, -0.565)), p => tmp.copy(cBelly).lerp(cSkin, 0.35), 'pelvis', 0.7);
    }

    // ---------- the head ----------
    const placeH = g => { g.rotateX(HA); g.translate(HP.x, HP.y, HP.z); return g; };
    const HEAD = [
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
    // the face's bones and hollows, in the head's own frame: [lx, ly, lz, rx, ry, rz, push]
    const FACE = [
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
      // the nostril slit, curving out and back
      const nx = Math.abs(lx) - 0.03 - (0.54 - lz) * 0.3; d -= 0.006 * gauss(nx, 0.006) * sstep(0.5, 0.53, lz) * gauss(ly + 0.03, 0.02);
      // fine wrinkles of the muzzle's skin
      d += 0.0012 * Math.sin(lx * 260 + ly * 90) * sstep(0.45, 0.49, lz);
      d += 0.002 * (fbm(p.x * 14, p.y * 14, p.z * 14) - 0.5);
      return d;
    }
    function headCol(p) {
      const [lx, ly, lz] = toL(p); coat(p);
      tmp.lerp(cShade, (sstep(0.0, 0.25, lz) * 0.12 + gauss(Math.abs(lx) - 0.1, 0.03) * gauss(ly + 0.08, 0.06) * 0.2) * (isWhite ? 1 : 0.5));
      // dark rims round the eyes, as Zebu have
      const er = gauss(Math.abs(lx) - 0.098, 0.016) * gauss(ly + 0.012, 0.024) * gauss(lz - 0.137, 0.035); tmp.lerp(cMuzzle, cl(er * 1.2, 0, 0.85));
      // the bare black nose, with a soft edge into the hair
      const m = sstep(0.43, 0.47, lz + ly * 0.15 + noise(lx * 40, ly * 40, 3) * 0.012); tmp.lerp(cMuzzle, m);
      return tmp;
    }
    const headRough = p => { const [lx, ly, lz] = toL(p); return lerp(1, 0.32, sstep(0.44, 0.48, lz + ly * 0.15)); };
    put('coat', shade(placeH(loft(HEAD, Q(96, 24), Q(10, 3), 0.12)), headDisp), headCol, 'head', headRough);
    // the lower jaw, its chin and lips
    const JAW = [{z: 0.08, y: -0.13, w: 0.06, up: 0.03, dn: 0.045}, {z: 0.2, y: -0.125, w: 0.052, up: 0.03, dn: 0.035}, {z: 0.34, y: -0.118, w: 0.048, up: 0.028, dn: 0.03}, {z: 0.46, y: -0.112, w: 0.05, up: 0.026, dn: 0.028}, {z: 0.505, y: -0.108, w: 0.04, up: 0.018, dn: 0.02}, {z: 0.52, y: -0.106, w: 0.015, up: 0.008, dn: 0.008}];
    put('coat', shade(placeH(loft(JAW, Q(36, 14), Q(5, 2), 0.18)), headDisp), p => { const [lx, ly, lz] = toL(p); coat(p); return tmp.lerp(cMuzzle, sstep(0.43, 0.47, lz)); }, p => { const lz = toL(p)[2]; return lz > 0.3 ? [['jaw', 1]] : mix([['head', 1]], [['jaw', 1]], sstep(0.1, 0.3, lz)); }, headRough);
    // the mouth line
    put('dark', shade(placeH(ball(0.052, 0.0045, 0.05).translate(0, -0.104, 0.47))), cMuzzle, 'jaw', 0.5);

    // ---------- eyes: a dark eye under a glossy cornea, lids, lashes ----------
    for (const s of [1, -1]) {
      const c = toW(0.1 * s, -0.012, 0.137), eye = new THREE.Group();
      const ax = V3(s, 0.05, 0.25).normalize();   // the way the eye looks: out to the side, a little forward
      const eyeG = ball(0.021, 0.019, 0.023, Q(24, 12), Q(18, 8)); const m4 = new THREE.Matrix4().lookAt(V3(0, 0, 0), ax.clone().multiplyScalar(-1), V3(0, 1, 0)); eyeG.applyMatrix4(m4).translate(c.x - ax.x * 0.006, c.y - ax.y * 0.006, c.z - ax.z * 0.006);
      const ec = new THREE.Color(), iris = COL(0x2a1a12), pupil = COL(0x080605), white = COL(0xc9bba8);
      put('eye', shade(eyeG), (p) => { const d = p.clone().sub(c).normalize(), k = d.dot(ax); const up = Math.abs(d.y - ax.y * k); return ec.copy(white).lerp(iris, sstep(0.45, 0.62, k)).lerp(pupil, sstep(0.8, 0.88, k) * sstep(0.16, 0.08, up)); }, 'head', 0.7);
      const cornea = ball(0.0215, 0.0195, 0.0235, Q(24, 12), Q(18, 8)); cornea.applyMatrix4(m4).translate(c.x - ax.x * 0.0045, c.y - ax.y * 0.0045, c.z - ax.z * 0.0045);
      put('cornea', shade(cornea), COL(0x000000), 'head', 0.05);
      // lids: rings of dark skin above and below, the upper one heavier
      for (const up of [1, -1]) {
        const pts = []; for (let i = 0; i <= 8; i++) { const a = lerp(-1.25, 1.25, i / 8); const q = toL(c); pts.push(toW(q[0] + s * 0.012 * Math.cos(a) * 0.4, q[1] + up * 0.017 * Math.cos(a * 0.9) , q[2] + Math.sin(a) * 0.022)); }
        put('coat', shade(sweep(pts, t => (up > 0 ? 0.0055 : 0.004) * Math.sin(PI * (0.08 + 0.84 * t)) + 0.0015, {n: Q(16, 8), m: 8, tile: 0.1})), cMuzzle, 'head', 0.6);
      }
      // lashes along the upper lid, long and pale on a white animal
      for (let i = 0; i < Q(16, 8); i++) {
        const a = lerp(-1.0, 1.0, i / (Q(16, 8) - 1)), q = toL(c), b = toW(q[0] + s * 0.012, q[1] + 0.017 * Math.cos(a * 0.9), q[2] + Math.sin(a) * 0.022);
        const dir = V3(s * 0.5, 0.75, 0.35 + a * 0.2).normalize(), L = 0.016 + 0.006 * Math.cos(a);
        put('hair', shade(sweep([b, b.clone().addScaledVector(dir, L * 0.5).add(V3(0, 0.002, 0)), b.clone().addScaledVector(dir, L).add(V3(0, -0.002, 0))], t => 0.0007 * (1 - t) + 0.0002, {n: 3, m: 3})), isWhite ? COL(0xe8e2d4) : cTuft, 'head', 0.6);
      }
    }

    // ---------- horns ----------
    const hornCol = new THREE.Color(), hBase = COL(look.hornBase), hMid = COL(look.hornMid), hTip = COL(look.hornTip);
    for (const s of [1, -1]) {
      const side = s > 0 ? 'left' : 'right', Bp = toW(0.075 * s, 0.025, 0.0), Bin = toW(0.035 * s, -0.02, 0.01);   // Bin: buried inside the skull
      if (look.horn[side] === 'whole') {
        const hl = look.hornLen || 1, ho = look.hornOut || 1;
        const P = [Bin].concat([[0, 0, 0], [0.045, 0.07, -0.035], [0.085, 0.15, -0.04], [0.085, 0.22, 0.02], [0.05, 0.265, 0.10]].map(p => Bp.clone().add(V3(p[0] * s * hl * ho, p[1] * hl, p[2] * hl))));
        const g = sweep(P, (t, a) => { const r = lerp(0.046, 0.007, Math.pow(cl((t - 0.1) / 0.9, 0, 1), 0.85)) * (1 + 0.035 * Math.sin(t * 70) * sstep(0.75, 0.25, t)); return [r * 1.08, r * 0.95]; }, {n: Q(48, 16), m: Q(20, 10), tile: 0.06, side: V3(s, 0, 0)});
        put('horn', shade(g), p => { const t = cl(p.distanceTo(Bp) / (0.33 * hl), 0, 1); hornCol.copy(hBase).lerp(hMid, sstep(0.05, 0.3, t)).lerp(hTip, sstep(0.3, 0.9, t)).multiplyScalar(0.85 + 0.25 * noise(p.x * 60, p.y * 60, p.z * 60)); return hornCol.lerp(coat(p), sstep(0.07, 0.02, t)); }, 'head', p => 0.45);
      } else if (look.horn[side] === 'broken') {
        // broken off short: a thick stump of pink, spotted horn core, ragged and splintered at the top
        const P = [Bin, Bp, Bp.clone().add(V3(0.04 * s, 0.055, 0.025)), Bp.clone().add(V3(0.064 * s, 0.092, 0.038))];
        const top = P[3].clone(), dirT = top.clone().sub(P[2]).normalize();
        const g = sweep(P, (t, a) => { const r = lerp(0.05, 0.036, Math.pow(cl((t - 0.25) / 0.75, 0, 1), 0.8)); return r * (1 + 0.08 * sstep(0.85, 1, t) * (noise(a * 2.5, t * 9, 1) - 0.5)); }, {n: Q(24, 8), m: Q(28, 10), tile: 0.06, side: V3(s, 0, 0),
          end: (q, a) => { const k = noise(a * 1.6 + 3, 1, 2); q.addScaledVector(dirT, (k - 0.55) * 0.022); }, capAt: c => c.clone().addScaledVector(dirT, 0.002)});
        const spot = COL(look.stumpSpot), pink = COL(look.stump), topC = COL(look.stumpTop);
        put('horn', shade(g), p => { const d = p.distanceTo(Bp), n2 = noise(p.x * 90, p.y * 90, p.z * 90); hornCol.copy(pink).lerp(topC, sstep(0.085, 0.11, d)); if (n2 > 0.6) hornCol.lerp(spot, sstep(0.6, 0.68, n2) * 0.85); hornCol.multiplyScalar(0.88 + 0.2 * noise(p.x * 200, p.y * 200, 0)); return hornCol.lerp(coat(p), sstep(0.035, 0.012, d)); }, 'head', p => 0.75);
      }
    }

    // ---------- ears: long, drooping, cupped, pink inside ----------
    for (const s of [1, -1]) {
      const name = s > 0 ? 'earL' : 'earR', E = BW[name];
      const fwd = toW(0, 0, 1).sub(toW(0, 0, 0)).normalize();
      const dir = V3(s * 0.5, -0.84, 0.1).normalize(), L = 0.27;
      const P = [0, 0.3, 0.65, 1].map(t => E.clone().addScaledVector(dir, L * t).add(V3(s * 0.025 * Math.sin(PI * t), 0, 0.012 * t)));
      const width = t => 0.047 * Math.pow(Math.sin(PI * (0.1 + 0.85 * t)), 0.6) + 0.007;
      // flat and thin, curled into a cup whose open side faces forward and in
      const g = sweep(P, (t, a) => { const w = width(t), ca = Math.cos(a), th = (0.006 + 0.006 * (1 - t)) * (1 + 0.6 * Math.pow(Math.abs(ca), 8)); return [w, th, -0.018 * (1 - ca * ca) * sstep(0.0, 0.25, t) * (1 - t * 0.4)]; }, {n: Q(28, 10), m: Q(28, 12), tile: 0.12, side: fwd});
      const inner = V3(-s * 0.45, 0.15, 0.9).normalize();
      put('coat', shade(g), (p, i) => { coat(p); const n = g.attributes.normal; const k = n.getX(i) * inner.x + n.getY(i) * inner.y + n.getZ(i) * inner.z; tmp.lerp(cSkin, sstep(0.0, 0.5, k) * 0.55); return tmp.lerp(COL(look.earRim), sstep(0.8, 1, p.distanceTo(E) / L) * 0.4); }, name, 1);
      // hair at the rim of the ear's cup
      for (let i = 0; i < Q(30, 10); i++) {
        const t = 0.15 + 0.7 * (i / Q(30, 10)), c = g.userData.curve.getPointAt(t), b = c.clone().addScaledVector(fwd, (i % 2 ? 1 : -1) * width(t) * 0.9);
        const d = inner.clone().multiplyScalar(0.6).addScaledVector(dir, 0.6).normalize();
        put('hair', shade(sweep([b, b.clone().addScaledVector(d, 0.012), b.clone().addScaledVector(d, 0.022).add(V3(0, -0.004, 0))], t2 => 0.0009 * (1 - t2) + 0.0002, {n: 3, m: 3})), isWhite ? COL(0xf2ede4) : coat(b).clone(), name, 1);
      }
    }

    // ---------- legs ----------
    // a smooth curve through [t, value] keys
    const keys = K => t => { if (t <= K[0][0]) return K[0][1]; for (let i = 0; i < K.length - 1; i++) if (t <= K[i + 1][0]) return lerp(K[i][1], K[i + 1][1], ease((t - K[i][0]) / (K[i + 1][0] - K[i][0]))); return K[K.length - 1][1]; };
    const grime = COL(0x8a7a62); const legCol = p => { coat(p); tmp.lerp(cShade, sstep(0.5, 0.2, p.y) * (isWhite ? 0.15 : 0.15)); return tmp.lerp(grime, sstep(0.3, 0.06, p.y + 0.03 * (noise(p.x * 30, p.z * 30, 1) - 0.5)) * (isWhite ? 0.45 : 0.25)); };
    function leg(s, front) {
      const n = s > 0 ? 'L' : 'R', X = a => V3(a[0] * s, a[1], a[2]);
      const J = front ? FL : HL;
      let P, R, bones, ts;
      if (front) {
        // from inside the shoulder down: the forearm, the knee, the cannon, the fetlock, the pastern
        P = [X([0.1, 1.0, 0.50]), X([0.13, 0.9, 0.5]), X([0.155, 0.76, 0.475]), X(J.el), X([0.17, 0.52, 0.47]), X(J.kn), X([0.165, 0.25, 0.505]), X(J.fe), X([0.165, 0.07, 0.522])];
        const fr = keys([[0, 0.09], [0.2, 0.085], [0.36, 0.074], [0.5, 0.058], [0.57, 0.062], [0.63, 0.05], [0.8, 0.046], [0.87, 0.052], [0.93, 0.046], [1, 0.042]]);
        R = (t, a) => { const back = Math.max(0, -Math.sin(a)), r = fr(t); return [r * 0.87, r * (1 + 0.25 * back * sstep(0.45, 0.25, t) + 0.1 * back * gauss(t - 0.72, 0.08))]; };
        bones = ['chest', 'sh' + n, 'el' + n, 'kn' + n, 'ff' + n];
      } else {
        P = [X([0.1, 1.02, -0.42]), X([0.14, 0.92, -0.40]), X([0.17, 0.78, -0.35]), X(J.st), X([0.195, 0.56, -0.44]), X(J.hk), X([0.168, 0.30, -0.54]), X(J.fe), X([0.165, 0.07, -0.505])];
        const hr = keys([[0, 0.11], [0.2, 0.1], [0.36, 0.078], [0.48, 0.066], [0.55, 0.062], [0.62, 0.05], [0.8, 0.045], [0.87, 0.051], [0.93, 0.046], [1, 0.042]]);
        R = (t, a) => {
          const back = Math.max(0, -Math.sin(a)), fwd = Math.max(0, Math.sin(a));
          const r = hr(t);
          const hock = gauss(t - 0.545, 0.025) * back * 0.035;   // the point of the hock sticks out behind
          return [r * 0.82, r * (1 + 0.3 * back * sstep(0.45, 0.2, t) + 0.12 * fwd * sstep(0.4, 0.25, t)) + hock];
        };
        bones = ['pelvis', 'hi' + n, 'st' + n, 'hk' + n, 'hf' + n];
      }
      const g = sweep(P, R, {n: Q(110, 20), m: Q(40, 12), tile: 0.12, side: V3(1, 0, 0)});
      const curve = g.userData.curve, jt = [J === FL ? J.sh : J.hi, J === FL ? J.el : J.st, J === FL ? J.kn : J.hk, J.fe].map(j => { let best = 0, bd = 1e9; for (let k = 0; k <= 200; k++) { const q = curve.getPointAt(k / 200), d = q.distanceTo(X(j)); if (d < bd) { bd = d; best = k / 200; } } return best; });
      const NN = g.userData.rows, RR = g.userData.ring;
      const legW = (p, i) => { const row = Math.min(NN - 1, Math.floor(i / RR)), t = i >= NN * RR ? (i === NN * RR ? 0 : 1) : row / (NN - 1); return along(t, [[jt[0] - 0.06, bones[0]], [jt[0] + 0.05, bones[1]], [jt[1] - 0.025, bones[1]], [jt[1] + 0.025, bones[2]], [jt[2] - 0.02, bones[2]], [jt[2] + 0.02, bones[3]], [jt[3] - 0.02, bones[3]], [jt[3] + 0.02, bones[4]]]); };
      put('coat', shade(g, p => 0.0025 * (fbm(p.x * 20, p.y * 20, p.z * 20) - 0.5)), legCol, legW, 1);
      // the hoof: two claws, split, with dew claws behind
      const hx = J.ho[0] * s, hz = J.ho[2], fb = bones[4];
      for (const c of [1, -1]) {
        const cx = hx + c * 0.021;
        const st = [];
        for (let k = 0; k <= 5; k++) { const t = k / 5, y = lerp(0.078, 0.0, t); st.push({z: y, cx, cz: hz + lerp(-0.005, 0.03, t), w: lerp(0.019, 0.025, t), d: lerp(0.032, 0.05, t)}); }
        const pos = [], idx = [], uv = [], M = Q(16, 8);
        st.forEach((r, k) => { for (let j = 0; j <= M; j++) { const a = (j % M) / M * TAU; let x = Math.cos(a) * r.w, z = Math.sin(a) * r.d; if (z > 0) z *= 1 + 0.35 * Math.pow(Math.max(0, Math.sin(a)), 4); if (c * Math.cos(a) < 0) x *= 0.45; pos.push(r.cx + x, r.z, r.cz + z); uv.push(j / M, r.z * 8); } });
        for (let k = 0; k < st.length - 1; k++) for (let j = 0; j < M; j++) { const a = k * (M + 1) + j, b = a + 1, cc = a + M + 1, d = cc + 1; idx.push(a, cc, b, b, cc, d); }
        const c0 = pos.length / 3; pos.push(cx, 0.08, hz); uv.push(0, 0); const c1 = c0 + 1; pos.push(cx, 0.0, hz + 0.012); uv.push(0, 0);
        const lastRow = (st.length - 1) * (M + 1); for (let j = 0; j < M; j++) { idx.push(c0, j + 1, j); idx.push(c1, lastRow + j, lastRow + j + 1); }
        const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); hg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); hg.setIndex(idx); hg.userData.ring = M + 1; hg.userData.rows = st.length;
        put('hoof', shade(hg), p => tmp2.copy(cHoof).multiplyScalar(0.85 + 0.3 * sstep(0.0, 0.08, p.y)), fb, 0.55);
        put('hoof', shade(ball(0.011, 0.014, 0.013).translate(hx + c * 0.017, 0.105, hz - 0.055)), cHoof, fb, 0.6);
      }
    }
    for (const s of [1, -1]) { leg(s, true); leg(s, false); }

    // ---------- tail and its switch of single hairs ----------
    const tailW = p => along(-p.y, [[-1.08, 'tail0'], [-1.0, 'tail1'], [-0.86, 'tail2'], [-0.68, 'tail3'], [-0.5, 'tail4'], [-0.36, 'tail5']]);
    put('coat', shade(sweep(TAILP.slice(0, 6), t => lerp(0.05, 0.02, Math.pow(t, 0.8)), {n: Q(30, 10), m: Q(12, 8), tile: 0.1, side: V3(1, 0, 0)})), p => coat(p), p => mix(tailW(p), [['pelvis', 1]], sstep(1.05, 1.1, p.y)), 1);
    {
      let s = 11; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
      const nh = Q(260, 60), tc = cTuft;
      for (let i = 0; i < nh; i++) {
        const a = r() * TAU, rr = Math.sqrt(r()) * 0.022, y0 = 0.5 - r() * 0.08, L = 0.24 + r() * 0.16;
        const b = V3(Math.cos(a) * rr, y0, -0.742 + Math.sin(a) * rr), out = V3(Math.cos(a), 0, Math.sin(a));
        const pts = [b, b.clone().add(out.clone().multiplyScalar(0.02 + r() * 0.015)).add(V3(0, -L * 0.4, 0)), b.clone().add(out.clone().multiplyScalar(0.015 + r() * 0.03)).add(V3((r() - 0.5) * 0.02, -L * 0.8, (r() - 0.5) * 0.02)), b.clone().add(out.clone().multiplyScalar(r() * 0.04)).add(V3((r() - 0.5) * 0.03, -L, (r() - 0.5) * 0.03))];
        put('hair', shade(sweep(pts, t => 0.0016 * (1 - t * 0.7), {n: 5, m: 3})), tc.clone().multiplyScalar(0.8 + r() * 0.5), tailW, 0.6);
      }
    }
    // a tuft of longer hair on the poll, between the horns (off: at this size it read as fuzz)
    if (opts.pollTuft) {
      let s = 5; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
      for (let i = 0; i < Q(60, 16); i++) {
        const b = toW((r() - 0.5) * 0.09, 0.08 + r() * 0.01, -0.02 + r() * 0.05), d = V3((r() - 0.5) * 0.6, 0.6, 0.6 + r() * 0.3).normalize(), L = 0.03 + r() * 0.03;
        put('hair', shade(sweep([b, b.clone().addScaledVector(d, L * 0.5), b.clone().addScaledVector(d, L).add(V3(0, -L * 0.3, 0.004))], t => 0.0012 * (1 - t * 0.6), {n: 3, m: 3})), coat(b).clone().multiplyScalar(0.95), 'head', 1);
      }
    }

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
    const MATS = {
      coat: patch(new THREE.MeshPhysicalMaterial({vertexColors: true, map: TX.hairCol, normalMap: TX.hairNrm, normalScale: new THREE.Vector2(0.9, 0.9), roughness: 0.85, metalness: 0, sheen: new THREE.Color(isWhite ? 0x2a2a2a : 0x1a1a1a), skinning: true}), {soft: [0.55, 0.32, 0.26], key: 'coat'}),
      horn: patch(new THREE.MeshPhysicalMaterial({vertexColors: true, normalMap: TX.hornNrm, normalScale: new THREE.Vector2(0.7, 0.7), roughness: 1, clearcoat: 0.25, clearcoatRoughness: 0.5, skinning: true}), {key: 'horn'}),
      hoof: patch(new THREE.MeshStandardMaterial({vertexColors: true, normalMap: TX.hoofNrm, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 1, skinning: true}), {key: 'hoof'}),
      eye: patch(new THREE.MeshStandardMaterial({vertexColors: true, roughness: 1, skinning: true}), {key: 'eye'}),
      cornea: new THREE.MeshPhysicalMaterial({color: 0x000000, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, envMapIntensity: 0.55, skinning: true}),
      hair: patch(new THREE.MeshStandardMaterial({vertexColors: true, roughness: 0.7, skinning: true}), {key: 'hair'}),
      dark: patch(new THREE.MeshStandardMaterial({vertexColors: true, roughness: 0.6, skinning: true}), {key: 'dark'})
    };

    // ---------- bind everything to the skeleton ----------
    const R = new THREE.Group(); R.name = (look.name || 'Zebu') + ' (full detail)';
    R.add(B[BI.base]); R.updateMatrixWorld(true);
    const skeleton = new THREE.Skeleton(B);
    let TRIS = 0;
    const meshes = [];
    for (const [name, P] of Object.entries(PILES)) {
      if (!MATS[name]) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(P.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(P.nor, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(P.uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(P.col, 3));
      g.setAttribute('aRough', new THREE.Float32BufferAttribute(P.rough, 1));
      g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(P.si, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(P.sw, 4));
      g.setIndex(P.pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(P.idx, 1) : new THREE.Uint16BufferAttribute(P.idx, 1));
      g.computeBoundingSphere(); g.boundingSphere.radius += 1;
      const m = new THREE.SkinnedMesh(g, MATS[name]); m.frustumCulled = false; m.castShadow = name !== 'cornea'; m.receiveShadow = name === 'coat';
      if (name === 'cornea') m.renderOrder = 2;
      R.add(m); m.bind(skeleton); meshes.push(m); TRIS += P.idx.length / 3;
    }
    R.scale.setScalar(look.size || 1);

    // ---------- moving ----------
    // A pose is a set of joint angles (radians), and how far the body drops (by), shifts (bz), pitches nose-down (bp)
    // and rolls onto its right side (br). Anything missing is 0: standing as built.
    const CH = ['by', 'bz', 'bp', 'br', 'sp', 'nx', 'ny', 'n2', 'hx', 'hy', 'hz', 'tx'];
    for (const n of ['L', 'R']) CH.push('sh' + n, 'el' + n, 'kn' + n, 'ff' + n, 'hi' + n, 'st' + n, 'hk' + n, 'hf' + n, 'shz' + n, 'hiz' + n, 'hiy' + n);
    const IX = {}; CH.forEach((k, i) => { IX[k] = i; });
    const pose = o => { const a = new Float32Array(CH.length); for (const k in o) a[IX[k]] = o[k]; return a; };
    const both = (o, k, v) => { o[k + 'L'] = v; o[k + 'R'] = v; return o; };
    // the lying-down poses were solved for where the joints rest (front knees and fetlocks on the ground, hooves planted)
    const KNEEL = Object.assign({by: -0.17, bz: 0.02, bp: 0.27, nx: 0.05, hx: 0.12}, both({}, 'sh', -0.56), both({}, 'el', 0.23), both({}, 'kn', 1.62), both({}, 'ff', 0.25), both({}, 'hi', -0.34), both({}, 'st', 0.25), both({}, 'hk', -0.07));
    const P = {
      stand: pose({nx: -0.04}),
      // grazing: the neck reaches down and the head hangs nearly straight, muzzle in the grass
      eat: pose({nx: 1.35, n2: -0.1, hx: -0.85, by: -0.03, bp: 0.05}),
      sniff: pose({nx: 0.8, hx: -0.3, by: -0.02}),
      // down on his front knees, the back end still up
      kneel: pose(KNEEL),
      // lying on his brisket, leaning onto his right hip, the hind legs folded out to his left
      lie: pose({by: -0.47, br: 0.09, nx: -0.12, ny: 0.06, shL: -0.21, elL: -0.77, knL: 2.44, ffL: 0.5, shR: -0.16, elR: -0.86, knR: 2.56, ffR: 0.5,
        hiL: -0.46, stL: 0.35, hkL: -1.22, hfL: 0.3, hizL: 0.33, hiR: -0.4, stR: 0.55, hkR: -1.47, hfR: 0.3, hizR: -0.06}),
      // getting up: the back end first, still on the front knees
      rumpUp: pose(Object.assign({}, KNEEL, {nx: -0.05, hx: 0}))
    };
    const SEQ = {down: [[0, 'stand'], [0.9, 'sniff'], [1.9, 'kneel'], [3.4, 'lie']], up: [[0, 'lie'], [1.1, 'rumpUp'], [2.3, 'stand']]};
    const cur = P.stand.slice(), tgt = P.stand.slice(), out = new Float32Array(CH.length);
    const st = {state: 'stand', seq: null, seqName: '', t: 0, then: null, walkW: 0, phase: 0, flick: [0, 0], flickT: [2, 3.5], tailT: 4, tailK: 0, bite: 0, breath: 0, swing: [0, 0, 0, 0, 0, 0]};
    function startSeq(name, then) { st.seq = SEQ[name]; st.seqName = name; st.t = 0; st.then = then; st.state = name === 'down' ? 'lying-down' : 'getting-up'; }
    function act(name) {
      if (st.seq) { st.then = name; return; }
      if (name === 'lie') { if (st.state !== 'lie') startSeq('down', 'lie'); return; }
      if (st.state === 'lie') { startSeq('up', name); return; }
      st.state = name; tgt.set(P[name] || P.stand);
    }
    function evalSeq(dt) {
      st.t += dt; const S = st.seq, end = S[S.length - 1][0];
      let i = 0; while (i < S.length - 2 && st.t > S[i + 1][0]) i++;
      const [t0, a] = S[i], [t1, b] = S[i + 1], k = ease(cl((st.t - t0) / (t1 - t0), 0, 1)), A = P[a], Bp = P[b];
      for (let c = 0; c < CH.length; c++) cur[c] = lerp(A[c], Bp[c], k);
      if (st.t >= end) {
        st.seq = null; const then = st.then; st.then = null;
        if (st.seqName === 'down') { st.state = 'lie'; tgt.set(P.lie); if (then && then !== 'lie') act(then); }
        else { st.state = 'stand'; tgt.set(P.stand); if (then && then !== 'stand') act(then); }
      }
    }
    // the walk: four beats (left hind, left fore, right hind, right fore), each foot down about two thirds of the time
    function legSwing(p, front) {
      const duty = 0.64, A = front ? 0.3 : 0.27;
      if (p < duty) { const s = p / duty; return [lerp(-A, A, s), 0, 0, s > 0.8 ? (s - 0.8) * 1.2 : 0]; }
      const s = (p - duty) / (1 - duty), up = Math.sin(PI * s);
      return [lerp(A, -A, ease(s)), up, up * up, 0];
    }
    const BN = name => B[BI[name]], E = new THREE.Euler();
    function animate(dt, t, speed) {
      dt = Math.min(dt, 0.1); speed = speed || 0;
      if (st.seq) evalSeq(dt); else { const k = 1 - Math.exp(-dt * 3.2); for (let c = 0; c < CH.length; c++) cur[c] += (tgt[c] - cur[c]) * k; }
      const canWalk = !st.seq && st.state !== 'lie';
      st.walkW += ((speed > 0.04 && canWalk ? 1 : 0) - st.walkW) * Math.min(1, dt * 6);
      st.phase = (st.phase + dt * (0.2 + 1.0 * Math.min(1.6, speed))) % 1;
      out.set(cur);
      const w = st.walkW, O = IX;
      if (w > 0.001) {
        for (const [n, off, front] of [['L', 0.25, true], ['R', 0.75, true], ['L', 0, false], ['R', 0.5, false]]) {
          const [a, up, up2, roll] = legSwing((st.phase + off) % 1, front);
          if (front) { out[O['sh' + n]] += a * w; out[O['el' + n]] += (0.15 * up) * w; out[O['kn' + n]] += 1.25 * up * w; out[O['ff' + n]] += (0.7 * up2 + roll) * w; }
          else { out[O['hi' + n]] += a * w; out[O['st' + n]] += 0.35 * up * w; out[O['hk' + n]] += -0.9 * up * w; out[O['hf' + n]] += (0.75 * up2 + roll) * w; }
        }
        out[O.by] += Math.cos(st.phase * TAU * 2) * 0.012 * w; out[O.br] += Math.sin(st.phase * TAU) * 0.022 * w;
        out[O.nx] += (Math.sin(st.phase * TAU * 2) * 0.035 + 0.06) * w;
      }
      let chew = 0;
      if (st.state === 'eat' && !st.seq) { st.bite = (st.bite + dt / 7) % 1; const up = sstep(0.55, 0.65, st.bite) * (1 - sstep(0.92, 1, st.bite)); out[O.nx] -= 0.45 * up; out[O.hx] += 0.15 * up; chew = 1; }
      else if (st.state === 'lie') chew = 0.6;
      const idle = (1 - w) * (st.state === 'stand' || st.state === 'lie' ? 1 : 0.2);
      out[O.ny] += Math.sin(t * 0.31) * 0.2 * idle; out[O.hy] += Math.sin(t * 0.53 + 1) * 0.1 * idle; out[O.hz] += Math.sin(t * 0.41) * 0.05 * idle;
      // apply to the bones (their rest is the identity, so these angles are from standing)
      const base = BN('base'); base.position.set(0, BW.base.y + out[O.by], out[O.bz]); base.rotation.set(out[O.bp], 0, out[O.br]);
      BN('spine').rotation.x = out[O.sp];
      BN('neck1').rotation.set(out[O.nx] * 0.6, out[O.ny] * 0.6, 0); BN('neck2').rotation.set(out[O.nx] * 0.4 + out[O.n2], out[O.ny] * 0.4, 0);
      BN('head').rotation.set(out[O.hx], out[O.hy], out[O.hz]);
      BN('jaw').rotation.set(chew * Math.max(0, Math.sin(t * 9)) * 0.08, chew * Math.sin(t * 4.5) * 0.035, 0);
      for (const n of ['L', 'R']) {
        BN('sh' + n).rotation.set(out[O['sh' + n]], 0, out[O['shz' + n]]); BN('el' + n).rotation.x = out[O['el' + n]]; BN('kn' + n).rotation.x = out[O['kn' + n]]; BN('ff' + n).rotation.x = out[O['ff' + n]];
        BN('hi' + n).rotation.set(out[O['hi' + n]], out[O['hiy' + n]], out[O['hiz' + n]]); BN('st' + n).rotation.x = out[O['st' + n]]; BN('hk' + n).rotation.x = out[O['hk' + n]]; BN('hf' + n).rotation.x = out[O['hf' + n]];
      }
      // the hump and the dewlap swing a little after the body
      const sw = st.swing, ka = Math.min(1, dt * 60);
      for (const [i, target] of [[0, -out[O.br] * 1.4 + Math.sin(st.phase * TAU) * 0.03 * w], [1, (out[O.bp] - (cur[O.bp] || 0)) * 0.5], [2, out[O.nx] * 0.3 + Math.sin(st.phase * TAU * 2) * 0.04 * w]]) { sw[i + 3] += ((target - sw[i]) * 40 - sw[i + 3] * 6) * dt * ka; sw[i] += sw[i + 3] * dt; }
      BN('hump').rotation.set(sw[1], 0, sw[0]); BN('dewlap').rotation.set(-sw[2] * 0.6, 0, -sw[0] * 0.8);
      for (let i = 0; i < 2; i++) { st.flickT[i] -= dt; if (st.flickT[i] < 0) { st.flick[i] = 1; st.flickT[i] = 2 + Math.random() * 5; } st.flick[i] = Math.max(0, st.flick[i] - dt * 4); }
      const f0 = Math.sin(st.flick[0] * PI) * 0.4, f1 = Math.sin(st.flick[1] * PI) * 0.4;
      BN('earL').rotation.set(0.05 * Math.sin(t * 1.3), -f0 * 0.5, f0); BN('earR').rotation.set(0.05 * Math.sin(t * 1.3 + 1), f1 * 0.5, -f1);
      st.tailT -= dt; if (st.tailT < 0) { st.tailK = 1; st.tailT = 3 + Math.random() * 6; } st.tailK = Math.max(0, st.tailK - dt * 0.9);
      const lying = st.state === 'lie' ? 1 : 0;
      for (let i = 0; i < 6; i++) { const k = i / 5; BN('tail' + i).rotation.set((i === 0 ? -0.05 * w : 0.02 * w) + lying * (i < 2 ? -0.25 : 0.12), 0, Math.sin(t * 1.4 - k * 1.2) * 0.04 + Math.sin(t * 7 - k * 2.2) * 0.16 * st.tailK + (i === 0 ? -lying * 0.35 : 0)); }
    }
    const mouthL = toW(0, -0.08, 0.5);
    function anchor(name, v) {
      v = v || new THREE.Vector3(); R.updateMatrixWorld(true); const hb = BN('head');
      if (name === 'mouth') return v.copy(mouthL).sub(BW.head).applyMatrix4(hb.matrixWorld);
      if (name === 'poll') return v.set(0, 0, 0).applyMatrix4(hb.matrixWorld);
      return v.copy(toW(0, 0, 0.25)).sub(BW.head).applyMatrix4(hb.matrixWorld);
    }
    animate(0, 0, 0);
    // change a pose's angles (for tuning): z.setPose('lie', {knL: 2.7})
    const setPose = (name, o) => { const a = P[name] || (P[name] = pose({})); for (const k in o) if (k in IX) a[IX[k]] = o[k]; };
    return {root: R, look, act, animate, anchor, skeleton, meshes, POSES: P, setPose,
      pose: name => { st.seq = null; st.state = name; cur.set(P[name]); tgt.set(P[name]); },
      get state() { return st.state; }, get busy() { return !!st.seq; }, get tris() { return TRIS; }};
  }
  root.makeZebuHD = makeZebuHD;
})(typeof window !== 'undefined' ? window : globalThis);
