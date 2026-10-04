// zebu.js: Zebu cattle, built in code. three.js r128 (global THREE). Defines makeZebu(look, opts) and ZEBU_LOOKS.
//
// Made the way Stranded makes its animals (the-clearing-stranded/living/beasts.js and survivor.js): rigid parts on a
// skeleton of joints, each joint baked into one mesh with its colours in the vertices, toon-shaded with a thin dark
// outline. The shapes are measured off Chris's photos of Henry (zebu-cattle/henry/).
//
// Units are metres, y is up, the animal faces +z and its feet touch y = 0. Its left side is +x, so seen from the
// front its right horn (Henry's broken one) is on the viewer's left.
//
//   const z = makeZebu('henry');  scene.add(z.root);
//   z.animate(dt, t, speed)   every frame; speed in m/s (0 standing, about 1 walking; turning on the spot counts too)
//   z.act(name)               'stand', 'eat' (head down in the hay, chewing) or 'lie'. Cattle lie down front knees
//                             first and then the hind end, and get up hind end first; z.busy is true while they do.
//   z.state                   'stand', 'eat', 'lie', 'lying-down' or 'getting-up'
//   z.anchor(name, v)         world position of 'mouth', 'head' or 'poll'
(function (root) {
  'use strict';
  const PI = Math.PI, TAU = PI * 2;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v), lerp = (a, b, t) => a + (b - a) * t, ease = t => t * t * (3 - 2 * t);
  const sstep = (a, b, x) => ease(cl((x - a) / (b - a), 0, 1));
  function hash(x, y, z) { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); }
  function noise(x, y, z) {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), u = ease(x - ix), v = ease(y - iy), w = ease(z - iz);
    let r = 0;
    for (let c = 0; c < 8; c++) { const dx = c & 1, dy = (c >> 1) & 1, dz = c >> 2; r += hash(ix + dx, iy + dy, iz + dz) * (dx ? u : 1 - u) * (dy ? v : 1 - v) * (dz ? w : 1 - w); }
    return r;
  }

  // ---------- shapes ----------
  // A body made of oval cross-sections along z. Each section {z, y, w, up, dn, x, sq} is centred at (x, y), reaches w out to
  // each side, up above its centre and dn below it; sq above 2 squares the oval off. Smoothed between sections, ends closed.
  function loft(S, radial, sub) {
    radial = radial || 24; sub = sub || 3;
    const K = ['z', 'y', 'w', 'up', 'dn', 'x', 'sq'], def = {x: 0, sq: 2};
    const g = (s, k) => (s[k] != null ? s[k] : def[k] || 0);
    const cr = (a, b, c, d, t) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
    const rows = [];
    for (let i = 0; i < S.length - 1; i++) {
      const a = S[Math.max(0, i - 1)], b = S[i], c = S[i + 1], d = S[Math.min(S.length - 1, i + 2)];
      for (let j = 0; j < sub; j++) { const t = j / sub, r = {}; for (const k of K) r[k] = cr(g(a, k), g(b, k), g(c, k), g(d, k), t); rows.push(r); }
    }
    const last = {}; for (const k of K) last[k] = g(S[S.length - 1], k); rows.push(last);
    const pos = [], idx = [];
    for (const r of rows) {
      const w = Math.max(1e-4, r.w), up = Math.max(1e-4, r.up), dn = Math.max(1e-4, r.dn), e = 2 / Math.max(1, r.sq);
      for (let j = 0; j < radial; j++) {
        const a = j / radial * TAU, sx = Math.sin(a), cy = Math.cos(a);
        const px = Math.sign(sx) * Math.pow(Math.abs(sx), e), py = Math.sign(cy) * Math.pow(Math.abs(cy), e);
        pos.push(r.x + w * px, r.y + (py > 0 ? up : dn) * py, r.z);
      }
    }
    const n = rows.length;
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < radial; j++) {
      const a = i * radial + j, b = i * radial + (j + 1) % radial, c = a + radial, d = b + radial;
      idx.push(a, c, b, b, c, d);
    }
    const c0 = pos.length / 3; pos.push(rows[0].x, rows[0].y, rows[0].z);
    const c1 = c0 + 1; pos.push(rows[n - 1].x, rows[n - 1].y, rows[n - 1].z);
    for (let j = 0; j < radial; j++) { const j2 = (j + 1) % radial; idx.push(c0, j, j2); idx.push(c1, (n - 1) * radial + j2, (n - 1) * radial + j); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    return geo;
  }
  // A tube through the points P, with radius R(t) (or [sideways, other] for an oval), closed at both ends. col(t, a) can
  // colour it along its length and around; rough roughens the far end like a broken horn.
  function sweep(P, R, o) {
    o = o || {}; const N = o.n || 12, M = o.m || 10, side0 = o.side || V3(1, 0, 0);
    const curve = P.length > 2 ? new THREE.CatmullRomCurve3(P) : new THREE.LineCurve3(P[0], P[1]);
    const pos = [], col = [], idx = [], T = new THREE.Vector3(), S = new THREE.Vector3(), U = new THREE.Vector3(), c3 = new THREE.Color();
    const ends = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, c = curve.getPointAt(t); curve.getTangentAt(t, T);
      S.copy(side0).addScaledVector(T, -side0.dot(T)); if (S.lengthSq() < 1e-6) S.set(0, 0, 1).addScaledVector(T, -T.z); S.normalize(); U.crossVectors(T, S);
      const r = R(t), rx = Array.isArray(r) ? r[0] : r, ry = Array.isArray(r) ? r[1] : r;
      for (let j = 0; j < M; j++) {
        const a = j / M * TAU, cs = Math.cos(a), sn = Math.sin(a);
        let k = 1, dz = 0; if (o.rough && i === N) { k = 0.9 + 0.2 * hash(j, 3, 7); dz = (hash(j, 5, 1) - 0.5) * o.rough; }
        pos.push(c.x + (S.x * cs * rx + U.x * sn * ry) * k + T.x * dz, c.y + (S.y * cs * rx + U.y * sn * ry) * k + T.y * dz, c.z + (S.z * cs * rx + U.z * sn * ry) * k + T.z * dz);
        if (o.col) { c3.set(o.col(t, a)); col.push(c3.r, c3.g, c3.b); }
      }
      if (i === 0 || i === N) ends.push(c.clone());
    }
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) { const a = i * M + j, b = i * M + (j + 1) % M, c = a + M, d = b + M; idx.push(a, b, c, b, d, c); }
    const c0 = pos.length / 3; pos.push(ends[0].x, ends[0].y, ends[0].z); if (o.col) { c3.set(o.col(0, 0)); col.push(c3.r, c3.g, c3.b); }
    const c1 = c0 + 1; pos.push(ends[1].x, ends[1].y, ends[1].z); if (o.col) { c3.set(o.capCol != null ? o.capCol : o.col(1, 0)); col.push(c3.r, c3.g, c3.b); }
    for (let j = 0; j < M; j++) { const j2 = (j + 1) % M; idx.push(c0, j2, j); idx.push(c1, N * M + j, N * M + j2); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    if (o.col) geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx); geo.computeVertexNormals(); return geo;
  }
  const ball = (rx, ry, rz, ws, hs) => { const g = new THREE.SphereGeometry(1, ws || 14, hs || 10); g.scale(rx, ry, rz); return g; };

  // ---------- the herd's looks ----------
  const LOOKS = {
    // Henry, the white Zebu bull (Chris's photos, October 4, 2026). His right horn is broken off short.
    henry: {
      name: 'Henry', bull: true, size: 1,
      coat: 0xeceae3, shade: 0xbab6ae, belly: 0xf2ede2, fold: 0xc4bfb6, knee: 0xb9b5ae,
      muzzle: 0x3d3936, hoof: 0x2e2a27, tuft: 0x1d1b1a, earIn: 0xd2b2a8, earRim: 0x9e928a, eye: 0x17120f, lid: 0x5a544e,
      horn: {left: 'whole', right: 'broken'}, hornBase: 0xcda58c, hornMid: 0x6f6258, hornTip: 0x2a2421,
      stump: 0xdba095, stumpSpot: 0x6d4943, stumpTop: 0xead2c8
    },
    // The cows of the herd, after their character sheets (zebu-cattle/<folder>/character-sheet.png). Their real names
    // aren't known yet, so they go by how they look.
    'tan-cow': {name: 'Tan cow', bull: false, size: 0.9, hump: 0.55, topShade: 0.5,
      coat: 0xc9a46e, shade: 0xa8834f, belly: 0xdcc39c, fold: 0xa4824f, knee: 0xb08d5e, earIn: 0xc7957a, earRim: 0x8e6c45,
      horn: {left: 'whole', right: 'whole'}, hornLen: 1.25, hornOut: 0.85, hornBase: 0xcfb08c, hornMid: 0x8a7563, hornTip: 0x2e2724},
    'black-cow': {name: 'Black cow', bull: false, size: 0.9, hump: 0.6, topShade: 0.6,
      coat: 0x2e2a28, shade: 0x1f1c1b, belly: 0x3b3633, fold: 0x1c1a19, knee: 0x262321, muzzle: 0x161413, earIn: 0x5a4642, earRim: 0x1c1a19,
      horn: {left: 'whole', right: 'whole'}, hornLen: 0.9, hornOut: 1.1, hornBase: 0x7e6d60, hornMid: 0x4e443d, hornTip: 0x1e1a18},
    'red-brown-cow': {name: 'Red-brown cow', bull: false, size: 0.88, hump: 0.55, topShade: 0.5,
      coat: 0x8f4b2d, shade: 0x6c3720, belly: 0xa9694a, fold: 0x6a3a24, knee: 0x7a3f26, earIn: 0xb7836c, earRim: 0x5e3320,
      horn: {left: 'whole', right: 'whole'}, hornLen: 0.6, hornOut: 1.2, hornBase: 0xb59a80, hornMid: 0x6e5a4c, hornTip: 0x2a2320},
    'speckled-cow': {name: 'Speckled cow', bull: false, size: 0.9, hump: 0.55, topShade: 0.3,
      coat: 0xe7dfcf, shade: 0xcfc4b0, belly: 0xefe8da, fold: 0xc8bba3, knee: 0xd5c9b4, earIn: 0xd9a99a, earRim: 0xa88a6a,
      spots: {color: 0xa0714a, scale: 6, cut: 0.56},
      horn: {left: 'whole', right: 'whole'}, hornLen: 1.1, hornOut: 1.0, hornBase: 0xd2b896, hornMid: 0x857060, hornTip: 0x2e2724},
    // the young black one in the photo of the herd by the barn
    calf: {name: 'Calf', bull: false, size: 0.62, hump: 0.3, topShade: 0.6,
      coat: 0x2b2826, shade: 0x1f1c1b, belly: 0x3b3633, fold: 0x1c1a19, knee: 0x262321, muzzle: 0x161413, earIn: 0x5a4642, earRim: 0x1c1a19,
      horn: {left: 'none', right: 'none'}}
  };

  function makeZebu(look, opts) {
    if (typeof look === 'string') look = LOOKS[look];
    look = Object.assign({}, LOOKS.henry, look || {}); opts = opts || {};
    const RAD = opts.detail === 'low' ? 16 : 26, HK = look.hump == null ? 1 : look.hump;
    const col = c => new THREE.Color(c);

    // ---------- materials ----------
    const grad = (() => { const d = new Uint8Array([96, 96, 96, 255, 172, 172, 172, 255, 232, 232, 232, 255, 255, 255, 255, 255]); const t = new THREE.DataTexture(d, 4, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
    const skin = new THREE.MeshToonMaterial({vertexColors: true, gradientMap: grad});
    const outMat = new THREE.ShaderMaterial({
      uniforms: {uW: {value: opts.outline == null ? 0.009 : opts.outline}, uC: {value: new THREE.Color(0x2a221c)}},
      vertexShader: 'uniform float uW; void main(){ vec3 p = position + normal * uW; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.); }',
      fragmentShader: 'uniform vec3 uC; void main(){ gl_FragColor = vec4(uC, 1.); }',
      side: THREE.BackSide
    });

    // ---------- the skeleton ----------
    // Every joint is placed by where it sits when the animal stands, and every part is drawn where it sits then too.
    const R = new THREE.Group(); R.name = look.name || 'Zebu';
    const J = {root: R}, W = {root: V3(0, 0, 0)};
    function joint(name, parent, x, y, z) { const g = new THREE.Group(); g.name = name; const p = W[parent]; g.position.set(x - p.x, y - p.y, z - p.z); J[parent].add(g); J[name] = g; W[name] = V3(x, y, z); return g; }
    const buckets = new Map();
    // add a part to a joint, coloured by a colour or by a function of where each point is (standing position)
    function add(name, geo, color, noLine) {
      let g = geo.index ? geo.toNonIndexed() : geo;
      if (!g.attributes.normal) g.computeVertexNormals();
      if (color != null) {
        const p = g.attributes.position, n = p.count, a = new Float32Array(n * 3), c = new THREE.Color();
        for (let i = 0; i < n; i++) { c.set(typeof color === 'function' ? color(p.getX(i), p.getY(i), p.getZ(i)) : color); a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
        g.setAttribute('color', new THREE.BufferAttribute(a, 3));
      }
      const w = W[name]; g.translate(-w.x, -w.y, -w.z);
      if (!buckets.has(name)) buckets.set(name, {all: [], lines: []});
      const b = buckets.get(name); b.all.push(g); if (!noLine) b.lines.push(g);
    }
    function merge(list) {
      let n = 0; for (const g of list) n += g.attributes.position.count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), cc = new Float32Array(n * 3); let o = 0;
      for (const g of list) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); cc.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; }
      const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); m.setAttribute('color', new THREE.BufferAttribute(cc, 3));
      m.computeBoundingSphere(); return m;
    }
    let TRIS = 0;
    function bake() {
      for (const [name, b] of buckets) {
        const g = merge(b.all); TRIS += g.attributes.position.count / 3;
        const mesh = new THREE.Mesh(g, skin); mesh.frustumCulled = false; J[name].add(mesh);
        if (b.lines.length) { const o = new THREE.Mesh(merge(b.lines), outMat); o.frustumCulled = false; J[name].add(o); }
      }
      buckets.clear();
    }

    // ---------- coat ----------
    const cSpot = col(look.spots ? look.spots.color : 0), cCoat = col(look.coat), cShade = col(look.shade), cBelly = col(look.belly), cFold = col(look.fold), cKnee = col(look.knee), tmp = new THREE.Color();
    // white with grey over the hump, neck and shoulders, warmer under the belly, and faint mottling
    function coat(x, y, z) {
      tmp.copy(cCoat);
      const top = sstep(0.95, 1.25, y) * sstep(0.15, 0.6, z) * 0.55 + sstep(0.55, 0.95, z) * sstep(0.85, 1.2, y) * 0.25;
      tmp.lerp(cShade, cl(top * (look.topShade == null ? 1 : look.topShade), 0, 0.7));
      tmp.lerp(cBelly, sstep(0.62, 0.42, y) * 0.6);
      if (look.spots) { const sp = look.spots, n2 = noise(x * sp.scale + 11, y * sp.scale, z * sp.scale) * 0.7 + noise(x * sp.scale * 2.3, y * sp.scale * 2.3 + 5, z * sp.scale * 2.3) * 0.3; if (n2 > sp.cut) tmp.copy(cSpot).multiplyScalar(0.94 + 0.12 * noise(x * 30, y * 30, z * 30)); }
      const n = noise(x * 9, y * 9, z * 9) - 0.5; tmp.multiplyScalar(1 + n * 0.06);
      return tmp;
    }
    // the neck and dewlap hang in loose upright folds
    function folds(x, y, z) {
      coat(x, y, z);
      const f = (z * 13 + Math.sin(y * 7 + x * 3) * 0.35) % 1; const k = f < 0 ? f + 1 : f;
      if (k < 0.14) tmp.lerp(cFold, 0.4 * sstep(0.5, 0.8, z));
      return tmp;
    }
    function legCoat(x, y, z) {
      coat(x, y, z);
      tmp.lerp(cKnee, Math.max(0, 1 - Math.abs(y - 0.29) / 0.07) * 0.3);
      return tmp;
    }

    // ---------- body ----------
    joint('body', 'root', 0, 0.80, 0);
    add('body', loft([
      {z: -0.645, y: 0.80, w: 0.05, up: 0.06, dn: 0.10},
      {z: -0.60, y: 0.80, w: 0.19, up: 0.19, dn: 0.24, sq: 2.1},
      {z: -0.50, y: 0.80, w: 0.25, up: 0.28, dn: 0.29, sq: 2.15},
      {z: -0.32, y: 0.81, w: 0.27, up: 0.32, dn: 0.27, sq: 2.15},
      {z: -0.05, y: 0.80, w: 0.285, up: 0.33, dn: 0.32, sq: 2.1},
      {z: 0.22, y: 0.80, w: 0.28, up: 0.33, dn: 0.33, sq: 2.1},
      {z: 0.45, y: 0.82, w: 0.25, up: 0.32, dn: 0.33, sq: 2.1},
      {z: 0.60, y: 0.83, w: 0.20, up: 0.29, dn: 0.33, sq: 2.05},
      {z: 0.68, y: 0.85, w: 0.10, up: 0.16, dn: 0.18}
    ], RAD + 6, 4), coat);
    // the hump over the shoulders: a gentle slope behind, steep in front
    add('body', loft([
      {z: 0.18, y: 1.10, w: 0.10, up: 0.02, dn: 0.07},
      {z: 0.32, y: 1.12, w: 0.17, up: 0.08 * HK, dn: 0.12, sq: 2.3},
      {z: 0.46, y: 1.15, w: 0.20, up: 0.16 * HK, dn: 0.14, sq: 2.4},
      {z: 0.58, y: 1.17, w: 0.20, up: 0.20 * HK, dn: 0.15, sq: 2.4},
      {z: 0.67, y: 1.16, w: 0.17, up: 0.17 * HK, dn: 0.16, sq: 2.3},
      {z: 0.74, y: 1.12, w: 0.10, up: 0.07 * HK, dn: 0.11}
    ], RAD, 4), coat);
    if (look.bull) {
      // a bull: the sheath under the belly and the scrotum between the hind legs
      add('body', ball(0.035, 0.05, 0.11).rotateX(-0.25).translate(0, 0.50, 0.12), coat);
      add('body', ball(0.05, 0.09, 0.05).translate(0, 0.45, -0.47), x => tmp.copy(cBelly).lerp(col(look.earIn), 0.25));
    }

    // ---------- neck and dewlap ----------
    joint('neck', 'body', 0, 1.02, 0.62);
    add('neck', loft([
      {z: 0.50, y: 0.97, w: 0.17, up: 0.22, dn: 0.26},
      {z: 0.66, y: 1.01, w: 0.15, up: 0.21, dn: 0.22},
      {z: 0.82, y: 1.04, w: 0.125, up: 0.18, dn: 0.18},
      {z: 0.96, y: 1.07, w: 0.105, up: 0.15, dn: 0.15},
      {z: 1.06, y: 1.09, w: 0.09, up: 0.12, dn: 0.12},
      {z: 1.11, y: 1.10, w: 0.05, up: 0.06, dn: 0.06}
    ], RAD, 5), folds);
    add('neck', loft([
      {z: 0.54, y: 0.70, w: 0.12, up: 0.20, dn: 0.20},
      {z: 0.66, y: 0.71, w: 0.08, up: 0.22, dn: 0.23},
      {z: 0.78, y: 0.74, w: 0.055, up: 0.20, dn: 0.21},
      {z: 0.90, y: 0.82, w: 0.045, up: 0.16, dn: 0.15},
      {z: 1.00, y: 0.90, w: 0.038, up: 0.11, dn: 0.09},
      {z: 1.08, y: 0.95, w: 0.025, up: 0.05, dn: 0.03}
    ], 16, 6), folds);

    // ---------- head ----------
    // drawn along its own line from the poll to the nose, then tipped down the way Henry holds it
    const HA = 1.02, HP = V3(0, 1.21, 1.07), hc = Math.cos(HA), hs = Math.sin(HA);
    const toW = (lx, ly, lz) => V3(lx, HP.y + ly * hc - lz * hs, HP.z + ly * hs + lz * hc);
    const toL = (x, y, z) => { const y0 = y - HP.y, z0 = z - HP.z; return [x, y0 * hc + z0 * hs, -y0 * hs + z0 * hc]; };
    const place = g => { g.rotateX(HA); g.translate(HP.x, HP.y, HP.z); return g; };
    joint('head', 'neck', 0, 1.17, 1.06);
    const cMuzzle = col(look.muzzle);
    add('head', place(loft([
      {z: -0.06, y: -0.01, w: 0.05, up: 0.04, dn: 0.05},
      {z: -0.02, y: -0.03, w: 0.095, up: 0.065, dn: 0.10},
      {z: 0.06, y: -0.05, w: 0.11, up: 0.075, dn: 0.13},
      {z: 0.15, y: -0.05, w: 0.10, up: 0.068, dn: 0.12},
      {z: 0.26, y: -0.05, w: 0.08, up: 0.052, dn: 0.095},
      {z: 0.38, y: -0.05, w: 0.07, up: 0.046, dn: 0.075},
      {z: 0.46, y: -0.05, w: 0.075, up: 0.046, dn: 0.07},
      {z: 0.51, y: -0.055, w: 0.064, up: 0.036, dn: 0.056},
      {z: 0.535, y: -0.06, w: 0.03, up: 0.018, dn: 0.03}
    ], RAD, 4)), (x, y, z) => {
      const [lx, ly, lz] = toL(x, y, z); coat(x, y, z);
      tmp.lerp(cShade, sstep(0.0, 0.3, lz) * 0.15);
      return tmp.lerp(cMuzzle, sstep(0.42, 0.47, lz + ly * 0.15));
    });
    // nostrils, mouth line
    for (const s of [1, -1]) add('head', place(ball(0.014, 0.02, 0.012).translate(0.032 * s, -0.04, 0.528)), 0x141110, true);
    add('head', place(ball(0.05, 0.004, 0.035).translate(0, -0.105, 0.47)), 0x1a1614, true);
    // eyes, with the dark rims Zebu have
    for (const s of [1, -1]) {
      add('head', place(ball(0.012, 0.03, 0.04).rotateX(-0.2).translate(0.097 * s, -0.012, 0.135)), look.lid, true);
      add('head', place(ball(0.014, 0.02, 0.028).rotateX(-0.2).translate(0.101 * s, -0.012, 0.137)), look.eye, true);
      add('head', place(ball(0.004, 0.005, 0.005).translate(0.112 * s, 0.0, 0.148)), 0xe8e4dc, true);
    }
    // the jaw, so it can chew
    joint('jaw', 'head', 0, toW(0, -0.1, 0.08).y, toW(0, -0.1, 0.08).z);
    add('jaw', place(loft([
      {z: 0.10, y: -0.12, w: 0.06, up: 0.03, dn: 0.04},
      {z: 0.30, y: -0.115, w: 0.05, up: 0.03, dn: 0.03},
      {z: 0.46, y: -0.11, w: 0.05, up: 0.025, dn: 0.025},
      {z: 0.50, y: -0.105, w: 0.035, up: 0.015, dn: 0.015}
    ], 14, 3)), (x, y, z) => { const lz = toL(x, y, z)[2]; coat(x, y, z); return tmp.lerp(cMuzzle, sstep(0.42, 0.47, lz)); });

    // ---------- horns ----------
    const hornCol = t => (t < 0.14 ? look.hornBase : t < 0.4 ? tmp.set(look.hornBase).lerp(col(look.hornMid), (t - 0.14) / 0.26).getHex() : tmp.set(look.hornMid).lerp(col(look.hornTip), (t - 0.4) / 0.6).getHex());
    const stumpCol = (t, a) => { const n = noise(t * 6, Math.cos(a) * 3, Math.sin(a) * 3); return n > 0.62 ? look.stumpSpot : t > 0.85 ? look.stumpTop : look.stump; };
    for (const s of [1, -1]) {
      const side = s > 0 ? 'left' : 'right', B = toW(0.075 * s, 0.02, 0.0);
      if (look.horn[side] === 'broken') {
        // broken off short: a pink, spotted stump with a ragged top, pointing out and up
        add('head', sweep([B, B.clone().add(V3(0.05 * s, 0.07, 0.03)), B.clone().add(V3(0.078 * s, 0.108, 0.045))], t => lerp(0.047, 0.037, t), {n: 6, m: 12, col: stumpCol, rough: 0.025, capCol: look.stumpTop}), null);
      } else if (look.horn[side] === 'whole') {
        // up, out, and curving back in at the tip
        const hl = look.hornLen || 1, ho = look.hornOut || 1, P = [[0, 0, 0], [0.045, 0.07, -0.035], [0.085, 0.15, -0.04], [0.085, 0.22, 0.02], [0.05, 0.265, 0.10]].map(p => B.clone().add(V3(p[0] * s * hl * ho, p[1] * hl, p[2] * hl)));
        add('head', sweep(P, t => lerp(0.046, 0.009, Math.pow(t, 0.9)), {n: 18, m: 10, col: hornCol}), null);
      }
    }
    // ---------- ears ----------
    for (const s of [1, -1]) {
      const name = s > 0 ? 'earL' : 'earR', E = toW(0.085 * s, -0.035, 0.03);
      joint(name, 'head', E.x, E.y, E.z);
      const outer = ball(0.13, 0.045, 0.016).translate(0.12 * s, 0, 0), inner = ball(0.10, 0.03, 0.008).translate(0.115 * s, 0, 0.011);
      for (const g of [outer, inner]) { g.rotateY(0.45 * s); g.rotateZ(-0.95 * s); g.translate(E.x, E.y, E.z); }
      add(name, outer, (x, y, z) => tmp.set(look.coat).lerp(col(look.earRim), 0.25));
      add(name, inner, look.earIn, true);
    }

    // ---------- legs ----------
    const hoofCol = col(look.hoof);
    function hooves(name, x, y, z) {
      for (const s of [1, -1]) add(name, ball(0.03, 0.034, 0.05).translate(x + 0.024 * s, y, z), hoofCol);
      for (const s of [1, -1]) add(name, ball(0.012, 0.014, 0.012).translate(x + 0.018 * s, 0.10, z - 0.06), hoofCol, true);
    }
    // front legs: the shoulder and forearm, then the knee down
    for (const s of [1, -1]) {
      const x = 0.135 * s, u = s > 0 ? 'fluL' : 'fluR', l = s > 0 ? 'fllL' : 'fllR';
      joint(u, 'body', x, 0.76, 0.50);
      add(u, sweep([V3(x, 0.86, 0.49), V3(x, 0.64, 0.51), V3(x, 0.46, 0.52), V3(x, 0.29, 0.51)],
        t => t < 0.6 ? [lerp(0.10, 0.075, t / 0.6), lerp(0.14, 0.09, t / 0.6)] : [lerp(0.075, 0.046, (t - 0.6) / 0.4), lerp(0.09, 0.05, (t - 0.6) / 0.4)], {n: 10, m: 12}), legCoat);
      joint(l, u, x, 0.29, 0.51);
      add(l, sweep([V3(x, 0.31, 0.51), V3(x, 0.17, 0.513), V3(x, 0.09, 0.515), V3(x, 0.045, 0.53)],
        t => t < 0.12 ? 0.054 : t < 0.55 ? lerp(0.045, 0.041, (t - 0.12) / 0.43) : t < 0.72 ? 0.048 : 0.04, {n: 10, m: 10}), legCoat);
      hooves(l, x, 0.032, 0.54);
    }
    // hind legs: the big thigh and gaskin down to the hock, then the cannon
    for (const s of [1, -1]) {
      const x = 0.15 * s, u = s > 0 ? 'hluL' : 'hluR', l = s > 0 ? 'hllL' : 'hllR';
      joint(u, 'body', x, 0.82, -0.40);
      add(u, sweep([V3(x, 0.98, -0.38), V3(x * 1.03, 0.70, -0.43), V3(x, 0.47, -0.49), V3(x * 0.97, 0.30, -0.535)],
        t => t < 0.45 ? [lerp(0.13, 0.115, t / 0.45), lerp(0.20, 0.15, t / 0.45)] : [lerp(0.10, 0.044, (t - 0.45) / 0.55), lerp(0.13, 0.06, (t - 0.45) / 0.55)], {n: 12, m: 12}), legCoat);
      add(u, ball(0.03, 0.035, 0.03).translate(x * 0.97, 0.31, -0.585), legCoat);   // the point of the hock
      joint(l, u, x * 0.97, 0.30, -0.535);
      add(l, sweep([V3(x * 0.97, 0.32, -0.54), V3(x * 0.97, 0.17, -0.515), V3(x * 0.97, 0.09, -0.50), V3(x * 0.97, 0.045, -0.485)],
        t => t < 0.12 ? 0.052 : t < 0.55 ? lerp(0.044, 0.04, (t - 0.12) / 0.43) : t < 0.72 ? 0.047 : 0.04, {n: 10, m: 10}), legCoat);
      hooves(l, x * 0.97, 0.032, -0.47);
    }

    // ---------- tail ----------
    joint('tail', 'body', 0, 1.05, -0.585);
    add('tail', sweep([V3(0, 1.08, -0.55), V3(0, 1.03, -0.62), V3(0, 0.88, -0.655), V3(0, 0.70, -0.66)], t => lerp(0.04, 0.022, t), {n: 8, m: 8}), coat);
    joint('tail2', 'tail', 0, 0.70, -0.66);
    add('tail2', sweep([V3(0, 0.71, -0.66), V3(0, 0.5, -0.66), V3(0, 0.38, -0.655)], t => lerp(0.022, 0.017, t), {n: 6, m: 8}), coat);
    add('tail2', sweep([V3(0, 0.45, -0.66), V3(0, 0.33, -0.66), V3(0, 0.22, -0.655), V3(0, 0.12, -0.65)], t => Math.sin(PI * Math.pow(t, 0.7)) * 0.04 + 0.006, {n: 10, m: 9}), look.tuft);

    bake();
    R.scale.setScalar(look.size || 1);

    // ---------- moving ----------
    // A pose is a set of joint angles (radians) plus how far the body drops (by), shifts (bz), pitches nose-down (bp)
    // and rolls onto its right side (br). Everything missing is 0, which is standing as drawn.
    const CH = ['by', 'bz', 'bp', 'br', 'nx', 'ny', 'hx', 'hy', 'hz', 'tx', 'fluL', 'fllL', 'fluR', 'fllR', 'hluL', 'hllL', 'hluR', 'hllR', 'fzL', 'fzR', 'hzL', 'hzR', 'hyL', 'hyR'];
    const IX = {}; CH.forEach((k, i) => { IX[k] = i; });
    const pose = o => { const a = new Float32Array(CH.length); for (const k in o) a[IX[k]] = o[k]; return a; };
    const P = {
      stand: pose({nx: -0.02, hx: 0.0}),
      eat: pose({nx: 0.30, hx: 0.40, by: -0.01}),
      sniff: pose({nx: 0.55, hx: 0.25, by: -0.02}),
      // on his front knees, hind end still up
      kneel: pose({by: -0.20, bz: 0.05, bp: 0.24, nx: 0.0, hx: 0.1, fluL: -0.62, fllL: 2.35, fluR: -0.62, fllR: 2.35, hluL: 0.06, hluR: 0.06, hllL: -0.1, hllR: -0.1}),
      // lying on his brisket, leaning onto his right hip, hind legs folded out to his left
      lie: pose({by: -0.40, bz: 0.02, bp: -0.02, br: 0.10, nx: -0.05, ny: 0.05, hx: -0.05,
        fluL: -1.05, fllL: 2.5, fluR: -1.0, fllR: 2.5, fzL: 0.06, fzR: -0.06,
        hluL: -1.15, hllL: 2.0, hluR: -1.05, hllR: 2.1, hzL: 0.55, hzR: 0.35, hyL: 0.2, hyR: 0.3}),
      // getting up: hind end first, still on the front knees
      rumpUp: pose({by: -0.17, bz: 0.06, bp: 0.30, nx: -0.1, hx: 0.0, fluL: -0.66, fllL: 2.35, fluR: -0.66, fllR: 2.35, hluL: 0.02, hluR: 0.02})
    };
    const SEQ = {
      down: [[0, 'stand'], [0.9, 'sniff'], [1.9, 'kneel'], [3.3, 'lie']],
      up: [[0, 'lie'], [1.1, 'rumpUp'], [2.3, 'stand']]
    };
    const cur = P.stand.slice(), tgt = P.stand.slice(), out = new Float32Array(CH.length);
    const st = {state: 'stand', seq: null, seqName: '', t: 0, then: null, walkW: 0, phase: 0, flick: [0, 0], flickT: [2, 3.5], tailT: 4, tailK: 0, bite: 0};
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
      const [t0, a] = S[i], [t1, b] = S[i + 1], k = ease(cl((st.t - t0) / (t1 - t0), 0, 1));
      const A = P[a], B = P[b]; for (let c = 0; c < CH.length; c++) cur[c] = lerp(A[c], B[c], k);
      if (st.t >= end) {
        st.seq = null; const then = st.then; st.then = null;
        if (st.seqName === 'down') { st.state = 'lie'; tgt.set(P.lie); if (then && then !== 'lie') act(then); }
        else { st.state = 'stand'; tgt.set(P.stand); if (then && then !== 'stand') act(then); }
      }
    }
    // the walk: four beats, left hind, left fore, right hind, right fore, each foot on the ground about two thirds of the time
    function legSwing(p, front) {
      const duty = 0.66, A = front ? 0.34 : 0.30;
      if (p < duty) { const s = p / duty; return [lerp(-A, A, s), 0]; }
      const s = (p - duty) / (1 - duty), up = Math.sin(PI * s);
      return [lerp(A, -A, ease(s)), front ? 1.15 * up : -0.95 * up];
    }
    function animate(dt, t, speed) {
      dt = Math.min(dt, 0.1); speed = speed || 0;
      if (st.seq) evalSeq(dt); else { const k = 1 - Math.exp(-dt * 3.2); for (let c = 0; c < CH.length; c++) cur[c] += (tgt[c] - cur[c]) * k; }
      const canWalk = !st.seq && st.state !== 'lie';
      st.walkW += ((speed > 0.04 && canWalk ? 1 : 0) - st.walkW) * Math.min(1, dt * 6);
      st.phase = (st.phase + dt * (0.2 + 1.05 * Math.min(1.6, speed))) % 1;
      out.set(cur);
      const w = st.walkW, O = IX;
      if (w > 0.001) {
        const legs = [['hluL', 'hllL', 0, false], ['fluL', 'fllL', 0.25, true], ['hluR', 'hllR', 0.5, false], ['fluR', 'fllR', 0.75, true]];
        for (const [u, l, off, front] of legs) { const [a, b] = legSwing((st.phase + off) % 1, front); out[O[u]] += a * w; out[O[l]] += b * w; }
        out[O.by] += Math.cos(st.phase * TAU * 2) * 0.012 * w; out[O.br] += Math.sin(st.phase * TAU) * 0.025 * w;
        out[O.nx] += (Math.sin(st.phase * TAU * 2) * 0.04 + 0.08) * w;
      }
      // eating: bite into the hay, lift the head a little and chew, bite again
      let chew = 0;
      if (st.state === 'eat' && !st.seq) { st.bite = (st.bite + dt / 7) % 1; const up = sstep(0.55, 0.65, st.bite) * (1 - sstep(0.92, 1, st.bite)); out[O.nx] -= 0.32 * up; out[O.hx] -= 0.1 * up; chew = 1; }
      else if (st.state === 'lie') chew = 0.6;   // chewing the cud
      // looking about when standing
      const idle = (1 - w) * (st.state === 'stand' || st.state === 'lie' ? 1 : 0.2);
      out[O.ny] += Math.sin(t * 0.31) * 0.22 * idle; out[O.hy] += Math.sin(t * 0.53 + 1) * 0.12 * idle; out[O.hz] += Math.sin(t * 0.41) * 0.05 * idle;
      // apply
      const b = J.body; b.position.set(0, W.body.y + out[O.by], out[O.bz]); b.rotation.set(out[O.bp], 0, out[O.br]);
      J.neck.rotation.set(out[O.nx], out[O.ny], 0); J.head.rotation.set(out[O.hx], out[O.hy], out[O.hz]);
      J.jaw.rotation.set(chew * Math.max(0, Math.sin(t * 9)) * 0.07, chew * Math.sin(t * 4.5) * 0.04, 0);
      J.fluL.rotation.set(out[O.fluL], 0, out[O.fzL]); J.fllL.rotation.x = out[O.fllL];
      J.fluR.rotation.set(out[O.fluR], 0, out[O.fzR]); J.fllR.rotation.x = out[O.fllR];
      J.hluL.rotation.set(out[O.hluL], out[O.hyL], out[O.hzL]); J.hllL.rotation.x = out[O.hllL];
      J.hluR.rotation.set(out[O.hluR], out[O.hyR], out[O.hzR]); J.hllR.rotation.x = out[O.hllR];
      // ears flick now and then; the tail swings and swats flies
      for (let i = 0; i < 2; i++) { st.flickT[i] -= dt; if (st.flickT[i] < 0) { st.flick[i] = 1; st.flickT[i] = 2 + Math.random() * 5; } st.flick[i] = Math.max(0, st.flick[i] - dt * 4); }
      const f0 = Math.sin(st.flick[0] * PI) * 0.5, f1 = Math.sin(st.flick[1] * PI) * 0.5;
      J.earL.rotation.set(0, -f0 * 0.5, f0); J.earR.rotation.set(0, f1 * 0.5, -f1);
      st.tailT -= dt; if (st.tailT < 0) { st.tailK = 1; st.tailT = 3 + Math.random() * 6; } st.tailK = Math.max(0, st.tailK - dt * 0.9);
      const sw = Math.sin(t * 1.4) * 0.08 + Math.sin(t * 7) * 0.45 * st.tailK, lying = st.state === 'lie' ? 1 : 0;
      J.tail.rotation.set(-0.05 * w + out[O.tx], 0, sw - lying * 0.5); J.tail2.rotation.set(0.05 * w + lying * -0.9, 0, Math.sin(t * 1.4 - 0.9) * 0.12 + Math.sin(t * 7 - 1.2) * 0.5 * st.tailK);
    }
    const mouthL = toW(0, -0.08, 0.5);
    function anchor(name, v) {
      v = v || new THREE.Vector3(); R.updateMatrixWorld(true);
      if (name === 'mouth') return v.copy(mouthL).sub(W.head).applyMatrix4(J.head.matrixWorld);
      if (name === 'poll') return v.set(0, 0, 0).applyMatrix4(J.head.matrixWorld);
      return v.copy(toW(0, 0, 0.25)).sub(W.head).applyMatrix4(J.head.matrixWorld);
    }
    animate(0, 0, 0);
    return {root: R, look, act, animate, anchor, joints: J, POSES: P, pose: name => { st.seq = null; st.state = name; cur.set(P[name]); tgt.set(P[name]); },
      get state() { return st.state; }, get busy() { return !!st.seq; }, get tris() { return TRIS; }};
  }
  root.makeZebu = makeZebu; root.ZEBU_LOOKS = LOOKS;
})(typeof window !== 'undefined' ? window : globalThis);
