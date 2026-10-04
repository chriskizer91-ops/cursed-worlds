// survivor.js: the survivor, built in code. three.js r128 (global THREE). Defines makeSurvivor(opts).
//
// A grown-up as the game has always drawn them: blaze-orange cap, slate-blue work shirt, dark work trousers, boots, and a
// canvas pack with a rolled bedroll (the partner in a two-person game: an olive shirt and no pack). About 1.77 m tall
// with the cap. Toon-shaded with a thin dark outline, so the figure reads against a busy painting at a phone's size.
// Built as rigid parts on a skeleton of joints, one merged mesh per joint, so the whole figure is about 30 draw calls.
//
// Units are metres; y is up; the figure faces +z; its feet touch y = 0.
// m.root (set its position and rotation.y), m.animate(dt, t, speed) every frame (speed in m/s: 0 standing, about 1.3
// walking, 2.6 running), m.play(name) for a move, m.hold(name) for a pose that lasts (kneel, sit, sleep), m.stop(),
// m.carry(kind or null) for what is held in the arms ('wood'), m.state = { cold 0 to 1, hot 0 to 1, tired 0 to 1, wet 0 to 1 },
// m.anchor(name) (head, chest, handL, handR, feet), m.MOVES.
(function (root) {
  'use strict';

  function makeSurvivor(opts) {
    opts = opts || {};
    const partner = !!opts.partner;
    const C = Object.assign({
      skin: '#c69474', hair: '#3a2f28', shirt: partner ? '#6f7a4f' : '#4e6576', pants: '#2f3b45', pack: '#7d7350', bedroll: '#8a6a4a',
      cap: '#e0521b', boot: '#3b2e25', sole: '#231b16', belt: '#46321f', strap: '#4b3f2c', eye: '#1b1410', brow: '#2b2019', lip: '#a46a58',
      metal: '#a8a597', bark: '#6b5238', wood: '#b89466', cord: '#cdbf96'
    }, opts.colors || {});
    const shade = (hex, k) => { const c = new THREE.Color(hex); c.multiplyScalar(k); return c; };
    C.shirt2 = shade(C.shirt, 0.78); C.pants2 = shade(C.pants, 0.82); C.pack2 = shade(C.pack, 0.8); C.cap2 = shade(C.cap, 0.82);
    const TAU = Math.PI * 2, PI = Math.PI;
    const V2 = (x, y) => new THREE.Vector2(x, y);
    const cl = (v, a, b) => (v < a ? a : v > b ? b : v), lerp = (a, b, t) => a + (b - a) * t, ease = t => t * t * (3 - 2 * t);
    const SEG = opts.detail === 'low' ? 8 : 12;

    // ---------- shapes ----------
    // a capsule hanging down from its joint: radius r0 at the top, r1 at the bottom, len between them
    function capsule(len, r0, r1, seg) {
      const P = [], n = 5;
      for (let i = 0; i <= n; i++) { const a = -PI / 2 + PI / 2 * i / n; P.push(V2(Math.cos(a) * r1, -len + Math.sin(a) * r1)); }
      for (let i = 1; i <= n; i++) { const a = PI / 2 * i / n; P.push(V2(Math.cos(a) * r0, Math.sin(a) * r0)); }
      P[0].x = 0.0001; P[P.length - 1].x = 0.0001;
      return new THREE.LatheGeometry(P, seg || SEG);
    }
    // a body of revolution from [y, radius] pairs, bottom to top, squashed front to back by zk
    function body(prof, zk, seg) {
      const g = new THREE.LatheGeometry(prof.map(p => V2(Math.max(0.0001, p[1]), p[0])), seg || SEG + 4);
      g.scale(1, 1, zk || 1); g.computeVertexNormals(); return g;
    }
    const ball = (rx, ry, rz, ws, hs) => { const g = new THREE.SphereGeometry(1, ws || SEG, hs || Math.max(6, SEG - 3)); g.scale(rx, ry, rz); return g; };
    function rbox(w, h, d, r, s) {
      s = s || 3; const g = new THREE.BoxGeometry(w, h, d, s, s, s), p = g.attributes.position, v = new THREE.Vector3(), q = new THREE.Vector3();
      const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i); q.set(cl(v.x, -hx, hx), cl(v.y, -hy, hy), cl(v.z, -hz, hz));
        const d0 = v.clone().sub(q); if (d0.lengthSq() > 1e-9) v.copy(q).add(d0.normalize().multiplyScalar(r)); p.setXYZ(i, v.x, v.y, v.z);
      }
      g.computeVertexNormals(); return g;
    }
    const cyl = (r0, r1, h, s, open) => new THREE.CylinderGeometry(r0, r1, h, s || SEG, 1, !!open);
    const torus = (R, r, a, b) => new THREE.TorusGeometry(R, r, a || 6, b || 20);
    // place a shape: move, turn, and scale it
    function put(g, x, y, z, rx, ry, rz, sx, sy, sz) {
      if (sx) g.scale(sx, sy || sx, sz || sx);
      if (rx) g.rotateX(rx); if (ry) g.rotateY(ry); if (rz) g.rotateZ(rz);
      g.translate(x || 0, y || 0, z || 0); return g;
    }

    // ---------- materials ----------
    const grad = (() => { const d = new Uint8Array([92, 92, 92, 255, 168, 168, 168, 255, 235, 235, 235, 255, 255, 255, 255, 255]); const t = new THREE.DataTexture(d, 4, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
    const skinMat = new THREE.MeshToonMaterial({vertexColors: true, gradientMap: grad});
    const outMat = new THREE.ShaderMaterial({
      uniforms: {uW: {value: opts.outline == null ? 0.013 : opts.outline}, uC: {value: new THREE.Color(0x231a14)}, uA: {value: 1}},
      vertexShader: 'uniform float uW; void main(){ vec3 p = position + normal * uW; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.); }',
      fragmentShader: 'uniform vec3 uC; void main(){ gl_FragColor = vec4(uC, 1.); }',
      side: THREE.BackSide
    });

    // every part of a joint goes into one geometry with its colors baked in
    const buckets = new Map();
    function add(joint, g, color, noLine) {
      g = g.index ? g.toNonIndexed() : g;
      if (!g.attributes.normal) g.computeVertexNormals();
      const c = new THREE.Color(color), n = g.attributes.position.count, col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const key = joint.uuid; if (!buckets.has(key)) buckets.set(key, {joint, list: [], lines: []});
      buckets.get(key)[noLine ? 'list' : 'lines'].push(g);
    }
    function merge(list) {
      let n = 0; for (const g of list) n += g.attributes.position.count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0;
      for (const g of list) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); col.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; }
      const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); m.setAttribute('color', new THREE.BufferAttribute(col, 3));
      m.computeBoundingSphere(); return m;
    }
    let TRIS = 0;
    function bake() {
      for (const b of buckets.values()) {
        const all = b.lines.concat(b.list); if (!all.length) continue;
        const g = merge(all); TRIS += g.attributes.position.count / 3;
        const mesh = new THREE.Mesh(g, skinMat); mesh.frustumCulled = false; b.joint.add(mesh);
        if (b.lines.length) { const og = merge(b.lines); const o = new THREE.Mesh(og, outMat); o.frustumCulled = false; b.joint.add(o); }
      }
      buckets.clear();
    }

    // ---------- the skeleton ----------
    const R = new THREE.Group(); R.name = 'Survivor';
    const J = {};
    const joint = (name, parent, x, y, z) => { const g = new THREE.Group(); g.name = name; g.position.set(x, y, z); parent.add(g); J[name] = g; return g; };
    const hips = joint('hips', R, 0, 0.9, 0);
    const spine = joint('spine', hips, 0, 0.1, 0);
    const chest = joint('chest', spine, 0, 0.12, 0);
    const neck = joint('neck', chest, 0, 0.32, 0);
    const head = joint('head', neck, 0, 0.07, 0);
    const headS = joint('headS', head, 0, 0, 0); headS.scale.setScalar(1.16);
    for (const s of [1, -1]) {
      const L = s > 0 ? 'L' : 'R';
      const sh = joint('sh' + L, chest, 0.19 * s, 0.25, -0.005), el = joint('el' + L, sh, 0, -0.27, 0), wr = joint('wr' + L, el, 0, -0.235, 0), wrS = joint('wrS' + L, wr, 0, 0, 0); wrS.scale.setScalar(1.18);
      const hp = joint('hip' + L, hips, 0.095 * s, -0.03, 0), kn = joint('kn' + L, hp, 0, -0.39, 0), an = joint('an' + L, kn, 0, -0.39, 0), anS = joint('anS' + L, an, 0, 0, 0); anS.scale.setScalar(1.1);
      // the leg: thigh, shin, the trouser cuff, and the boot
      add(hp, capsule(0.39, 0.098, 0.074), C.pants);
      add(kn, capsule(0.37, 0.073, 0.058), C.pants);
      add(kn, put(cyl(0.066, 0.07, 0.06, SEG, true), 0, -0.34, 0), C.pants2, true);
      add(anS, put(cyl(0.056, 0.058, 0.12, SEG), 0, 0.0, -0.005), C.boot);
      add(anS, put(rbox(0.105, 0.075, 0.245, 0.034), 0, -0.045, 0.045), C.boot);
      add(anS, put(rbox(0.112, 0.022, 0.26, 0.01, 2), 0, -0.07, 0.045), C.sole, true);
      add(anS, put(torus(0.057, 0.006, 4, 14), 0, 0.045, -0.005, PI / 2), C.sole, true);
      // the arm: sleeve, rolled cuff, wrist and a work-worn hand
      add(sh, put(ball(0.07, 0.068, 0.066), 0, -0.005, 0), C.shirt);
      add(sh, capsule(0.26, 0.064, 0.052), C.shirt);
      add(el, capsule(0.19, 0.052, 0.044), C.shirt);
      add(el, put(torus(0.045, 0.013, 5, 14), 0, -0.18, 0, PI / 2), C.shirt2, true);
      add(el, put(capsule(0.05, 0.034, 0.032), 0, -0.19, 0), C.skin, true);
      add(wrS, put(ball(0.022, 0.05, 0.04), 0, -0.045, 0.004), C.skin);
      add(wrS, put(capsule(0.035, 0.012, 0.011), -0.016 * s, -0.03, 0.03, 0.6, 0, 0.5 * s), C.skin, true);
    }

    // the pelvis, the belt and a knife on the hip
    add(hips, body([[-0.13, 0.04], [-0.12, 0.11], [-0.07, 0.158], [0, 0.168], [0.07, 0.16], [0.13, 0.152]], 0.7), C.pants);
    add(hips, put(torus(0.154, 0.017, 5, 24), 0, 0.085, 0, PI / 2, 0, 0, 1, 1, 0.72), C.belt, true);
    add(hips, put(rbox(0.05, 0.035, 0.012, 0.005, 1), 0, 0.085, 0.112), C.metal, true);
    add(hips, put(rbox(0.035, 0.15, 0.045, 0.012, 2), -0.168, -0.03, 0.03, 0, 0, 0.1), C.belt);
    add(hips, put(capsule(0.06, 0.016, 0.014), -0.172, 0.1, 0.03, 0, 0, 0.1), '#5a4030', true);
    // the belly, tucked shirt
    add(spine, body([[-0.04, 0.152], [0.06, 0.156], [0.15, 0.163]], 0.69), C.shirt);
    // the chest and shoulders, collar, placket and pockets
    add(chest, body([[-0.05, 0.158], [0.06, 0.168], [0.16, 0.178], [0.24, 0.182], [0.285, 0.17], [0.315, 0.13], [0.335, 0.07], [0.345, 0.0]], 0.66), C.shirt);
    add(chest, put(torus(0.062, 0.02, 6, 18), 0, 0.31, 0.004, PI / 2 - 0.25, 0, 0, 1, 1, 0.9), C.shirt2, true);
    add(chest, put(rbox(0.022, 0.26, 0.012, 0.004, 1), 0, 0.15, 0.115), C.shirt2, true);
    for (const s of [1, -1]) add(chest, put(rbox(0.075, 0.075, 0.014, 0.006, 1), 0.075 * s, 0.2, 0.111, -0.12), C.shirt2, true);
    // the neck and the head: skull, jaw, ears, nose, eyes, brows, and hair under the cap
    add(neck, put(capsule(0.08, 0.05, 0.052), 0, 0.08, 0), C.skin);
    add(headS, put(ball(0.1, 0.112, 0.104), 0, 0.085, 0), C.skin);
    add(headS, put(ball(0.078, 0.06, 0.08), 0, 0.03, 0.022), C.skin);
    for (const s of [1, -1]) {
      add(headS, put(ball(0.016, 0.03, 0.022, 8, 6), 0.1 * s, 0.075, -0.004), C.skin);
      add(headS, put(ball(0.013, 0.016, 0.008, 8, 6), 0.037 * s, 0.09, 0.096), C.eye, true);
      add(headS, put(rbox(0.036, 0.008, 0.01, 0.003, 1), 0.037 * s, 0.117, 0.095, 0, 0, -0.12 * s), C.brow, true);
    }
    add(headS, put(ball(0.016, 0.024, 0.022, 8, 6), 0, 0.068, 0.106), C.skin, true);
    add(headS, put(rbox(0.032, 0.007, 0.008, 0.003, 1), 0, 0.034, 0.1), C.lip, true);
    add(headS, put(new THREE.SphereGeometry(0.108, SEG + 2, 8, PI * 0.82, PI * 1.36, 0, PI * 0.6), 0, 0.09, -0.006, 0, 0, 0, 1, 1.06, 1.02), C.hair);
    // the cap: crown, brim and button
    add(headS, put(new THREE.SphereGeometry(0.112, SEG + 4, 8, 0, TAU, 0, PI * 0.46), 0, 0.132, -0.008, -0.14, 0, 0, 1, 0.78, 1.03), C.cap);
    add(headS, put(new THREE.CylinderGeometry(0.1, 0.1, 0.011, 16, 1, false, -PI * 0.42, PI * 0.84), 0, 0.142, 0.03, -0.05, 0, 0, 1, 1, 1.12), C.cap2);
    add(headS, put(ball(0.012, 0.008, 0.012, 8, 4), 0, 0.218, -0.02), C.cap2, true);

    // the pack and its bedroll, with straps over the shoulders
    if (!partner && opts.pack !== false) {
      add(chest, put(rbox(0.3, 0.38, 0.16, 0.05), 0, 0.12, -0.19), C.pack);
      add(chest, put(rbox(0.31, 0.12, 0.17, 0.04), 0, 0.27, -0.19, 0.06), C.pack2);
      add(chest, put(rbox(0.2, 0.13, 0.05, 0.02), 0, 0.03, -0.285), C.pack2);
      for (const s of [1, -1]) add(chest, put(rbox(0.06, 0.2, 0.08, 0.025), 0.165 * s, 0.07, -0.19), C.pack2);
      add(chest, put(cyl(0.075, 0.075, 0.44, SEG + 2), 0, 0.37, -0.18, 0, 0, PI / 2), C.bedroll);
      for (const s of [1, -1]) add(chest, put(torus(0.078, 0.008, 4, 16), 0.13 * s, 0.37, -0.18, 0, PI / 2), C.strap, true);
      for (const s of [1, -1]) {
        add(chest, put(rbox(0.045, 0.016, 0.24, 0.006, 1), 0.105 * s, 0.322, -0.02, 0.1), C.strap, true);
        add(chest, put(rbox(0.042, 0.25, 0.014, 0.006, 1), 0.098 * s, 0.17, 0.112, -0.08, 0, 0.06 * s), C.strap, true);
      }
    }

    // ---------- things it can hold ----------
    const props = {};
    function prop(name, parent, build) { const g = new THREE.Group(); g.name = name; g.visible = false; parent.add(g); props[name] = g; build(g); return g; }
    const stick = (len, r) => capsule(len, r, r * 0.85, 6);
    // an armload of firewood, carried across the chest
    prop('wood', chest, g => {
      const W = new THREE.Group(); g.add(W);
      [[0, 0, 0.62], [0.02, 0.045, 0.7], [-0.03, 0.04, 0.58], [0.015, -0.04, 0.66], [-0.02, 0.085, 0.64], [0.03, -0.0, 0.55]].forEach((q, i) => {
        const s = stick(q[2], 0.026 + 0.006 * (i % 2)); put(s, -q[2] / 2, 0, 0, 0, 0, PI / 2); s.translate(q[0] * 3, q[1] * 0.9, q[1] * 0.7);
        add(W, s, i % 2 ? C.bark : shade(C.bark, 0.85));
      });
      g.position.set(0, 0.0, 0.2);
    });
    // the bow of the bow drill, in the right hand, and the spindle and hearth board on the ground
    prop('bow', J.wrR, g => {
      const P = new THREE.Group(); g.add(P);
      const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.0, 0.05, 0.28), new THREE.Vector3(0, 0, 0.56));
      add(P, new THREE.TubeGeometry(curve, 10, 0.012, 5), C.bark);
      add(P, new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(0, 0.0, 0.02), new THREE.Vector3(0, -0.0, 0.54)), 2, 0.004, 3), C.cord, true);
      g.position.set(0, -0.07, 0.0); g.rotation.set(0, 0, 0);
    });
    prop('hearth', R, g => {
      const P = new THREE.Group(); g.add(P);
      add(P, put(rbox(0.36, 0.022, 0.085, 0.008, 1), 0, 0.011, 0), C.wood);
      add(P, put(capsule(0.24, 0.012, 0.011, 6), 0, 0.26, 0), C.wood);
      add(P, put(rbox(0.07, 0.03, 0.05, 0.01, 1), 0, 0.27, 0), C.bark);
      g.position.set(0.08, 0, 0.42);
    });
    // a single long stick, held in both hands to snap over a knee
    prop('stick', J.wrR, g => { const P = new THREE.Group(); g.add(P); add(P, put(stick(0.8, 0.022), 0, 0.4, 0, 0, 0, PI / 2), C.bark); g.position.set(0.0, -0.07, 0.03); });
    prop('knife', J.wrR, g => { const P = new THREE.Group(); g.add(P); add(P, put(rbox(0.024, 0.085, 0.024, 0.008, 1), 0, 0, 0), '#5a4030'); add(P, put(rbox(0.006, 0.1, 0.022, 0.002, 1), 0, -0.09, 0.004), C.metal, true); g.position.set(0, -0.07, 0.02); g.rotation.x = -PI / 2; });
    bake();

    // ---------- moves ----------
    // a pose: joint name -> [x, y, z] turns, plus drop (how far the hips sink), fwd (hips forward), tilt (the hips' tilt)
    const NAMES = ['hips', 'spine', 'chest', 'neck', 'head', 'shL', 'elL', 'wrL', 'shR', 'elR', 'wrR', 'hipL', 'knL', 'anL', 'hipR', 'knR', 'anR'];
    const newPose = () => { const p = {drop: 0, fwd: 0, side: 0, roll: 0}; for (const n of NAMES) p[n] = [0, 0, 0]; return p; };
    const blendInto = (a, b, w) => { if (w <= 0) return; for (const k in b) { if (Array.isArray(b[k])) { const A = a[k], B = b[k]; A[0] = lerp(A[0], B[0], w); A[1] = lerp(A[1], B[1], w); A[2] = lerp(A[2], B[2], w); } else a[k] = lerp(a[k], b[k], w); } };
    // keyframes: [[u, pose], ...] with the in-between eased
    function key(frames, u) {
      if (u <= frames[0][0]) return frames[0][1];
      for (let i = 1; i < frames.length; i++) if (u <= frames[i][0]) { const a = frames[i - 1], b = frames[i], f = ease((u - a[0]) / (b[0] - a[0])), o = {}; for (const k in b[1]) { const A = a[1][k] == null ? b[1][k] : a[1][k], B = b[1][k]; o[k] = Array.isArray(B) ? [lerp(A[0], B[0], f), lerp(A[1], B[1], f), lerp(A[2], B[2], f)] : lerp(A, B, f); } return o; }
      return frames[frames.length - 1][1];
    }
    // kneeling on the right knee, the left foot planted forward
    const KNEEL = {drop: -0.43, fwd: -0.02, hips: [0.12, 0, 0], spine: [0.15, 0, 0], chest: [0.1, 0, 0], hipL: [-1.5, 0, 0.06], knL: [1.62, 0, 0], anL: [-0.12, 0, 0], hipR: [-0.05, 0, -0.06], knR: [1.95, 0, 0], anR: [0.55, 0, 0], shL: [-0.35, 0, 0.12], elL: [-0.6, 0, 0], shR: [-0.35, 0, -0.12], elR: [-0.6, 0, 0]};
    const SIT = {drop: -0.74, fwd: -0.1, hips: [-0.2, 0, 0], spine: [0.24, 0, 0], chest: [0.14, 0, 0], neck: [-0.08, 0, 0], head: [-0.12, 0, 0], hipL: [-1.95, 0, 0.22], knL: [2.3, 0, 0], anL: [-0.3, 0, 0], hipR: [-1.95, 0, -0.22], knR: [2.3, 0, 0], anR: [-0.3, 0, 0], shL: [-0.95, 0, 0.12], elL: [-0.55, 0, 0], wrL: [0.2, 0, 0], shR: [-0.95, 0, -0.12], elR: [-0.55, 0, 0], wrR: [0.2, 0, 0]};
    const MOVES = {
      // a bow drill: kneeling over the hearth board, left hand pressing the spindle, the right sawing the bow
      drill: {dur: 3.2, loop: true, hold: true, props: ['bow', 'hearth'], f: (u, t) => {
        const saw = Math.sin(t * 13), p = Object.assign({}, KNEEL, {spine: [0.42, 0, 0], chest: [0.22, 0.1, 0], neck: [0.2, 0, 0], head: [0.25, 0, 0]});
        p.shL = [-0.62, 0, 0.32]; p.elL = [-1.25, 0.2, 0]; p.wrL = [0.4, 0, 0];
        p.shR = [-0.42 + saw * 0.32, 0.25, -0.25]; p.elR = [-1.05 + saw * 0.35, 0, 0]; p.wrR = [0.1, 0, 0]; p.side = 0.02 * saw; return p; }},
      // blowing a coal in a tinder bundle into flame: low over the ground, hands cupped at the face
      blow: {dur: 2.4, loop: true, hold: true, f: (u, t) => {
        const puff = Math.max(0, Math.sin(t * 3.2)), p = Object.assign({}, KNEEL, {drop: -0.5, spine: [0.62, 0, 0], chest: [0.3 - 0.06 * puff, 0, 0], neck: [0.3, 0, 0], head: [0.1, 0, 0]});
        p.shL = [-1.05, 0, 0.32]; p.elL = [-1.45, 0, 0]; p.wrL = [0.3, 0, -0.4]; p.shR = [-1.05, 0, -0.32]; p.elR = [-1.45, 0, 0]; p.wrR = [0.3, 0, 0.4]; return p; }},
      // working at the ground: feeding the fire, setting a snare, digging
      work: {dur: 2.2, loop: true, hold: true, f: (u, t) => {
        const a = Math.sin(t * 4.4), b = Math.sin(t * 4.4 + 2), p = Object.assign({}, KNEEL, {spine: [0.48, 0.1 * a, 0], chest: [0.2, 0, 0], neck: [0.25, 0, 0]});
        p.shL = [-0.85 + 0.2 * b, 0, 0.25]; p.elL = [-0.7 + 0.25 * a, 0, 0]; p.shR = [-0.9 + 0.22 * a, 0, -0.25]; p.elR = [-0.6 + 0.2 * b, 0, 0]; return p; }},
      kneel: {dur: 1, hold: true, f: () => KNEEL},
      // bending to pick something up and standing with it
      gather: {dur: 1.6, f: u => key([[0, {}], [0.38, {drop: -0.2, hips: [0.3, 0, 0], spine: [0.55, 0, 0], chest: [0.25, 0, 0], neck: [0.2, 0, 0], hipL: [-0.75, 0, 0], knL: [0.95, 0, 0], anL: [-0.2, 0, 0], hipR: [-0.35, 0, 0], knR: [0.85, 0, 0], anR: [-0.5, 0, 0], shR: [-1.25, 0, -0.1], elR: [-0.15, 0, 0], shL: [-0.4, 0, 0.2], elL: [-0.5, 0, 0]}],
        [0.55, {drop: -0.21, hips: [0.3, 0, 0], spine: [0.58, 0, 0], chest: [0.25, 0, 0], neck: [0.2, 0, 0], hipL: [-0.75, 0, 0], knL: [0.95, 0, 0], anL: [-0.2, 0, 0], hipR: [-0.35, 0, 0], knR: [0.85, 0, 0], anR: [-0.5, 0, 0], shR: [-1.3, 0, -0.05], elR: [-0.25, 0, 0], shL: [-0.45, 0, 0.2], elL: [-0.5, 0, 0]}],
        [1, {}]], u)},
      // snapping a long stick over a raised knee
      snap: {dur: 1.5, props: ['stick'], f: u => key([[0, {}], [0.3, {shL: [-0.7, 0, 0.1], elL: [-0.9, 0, 0], shR: [-0.7, 0, -0.1], elR: [-0.9, 0, 0], wrR: [0, 0.4, 0], hipL: [-0.2, 0, 0]}],
        [0.5, {shL: [-0.5, 0, 0.1], elL: [-0.6, 0, 0], shR: [-0.5, 0, -0.1], elR: [-0.6, 0, 0], wrR: [0, 0.4, 0], hipL: [-1.1, 0, 0], knL: [1.2, 0, 0], spine: [0.2, 0, 0], drop: -0.03}],
        [0.6, {shL: [-0.15, 0, 0.25], elL: [-0.3, 0, 0], shR: [-0.15, 0, -0.25], elR: [-0.3, 0, 0], wrR: [0, 0.4, 0], hipL: [-1.0, 0, 0], knL: [1.1, 0, 0], spine: [0.28, 0, 0], drop: -0.03}],
        [1, {}]], u)},
      // drinking from cupped hands, kneeling at the water
      drink: {dur: 2.6, loop: true, hold: true, f: u => { const k = key([[0, {up: 0}], [0.35, {up: 0}], [0.55, {up: 1}], [0.85, {up: 1}], [1, {up: 0}]], u).up, p = Object.assign({}, KNEEL);
        p.spine = [lerp(0.7, 0.15, k), 0, 0]; p.chest = [lerp(0.25, 0.05, k), 0, 0]; p.neck = [lerp(0.25, -0.15, k), 0, 0]; p.head = [lerp(0.1, -0.25, k), 0, 0];
        p.shL = [lerp(-1.1, -1.35, k), 0, 0.15]; p.elL = [lerp(-0.4, -1.75, k), 0, 0]; p.wrL = [0.3, 0, -0.5]; p.shR = [lerp(-1.1, -1.35, k), 0, -0.15]; p.elR = [lerp(-0.4, -1.75, k), 0, 0]; p.wrR = [0.3, 0, 0.5]; return p; }},
      sit: {dur: 1.2, hold: true, f: (u, t) => { const p = Object.assign({}, SIT); p.chest = [0.12 + 0.015 * Math.sin(t * 1.4), 0, 0]; return p; }},
      // asleep on one side, knees drawn up
      sleep: {dur: 1.6, hold: true, f: (u, t) => ({drop: -0.8, roll: 1.5, fwd: 0, hips: [0, 0, 0], spine: [0.15, 0, 0], chest: [0.1 + 0.03 * Math.sin(t * 0.9), 0, 0], neck: [0.25, 0, 0], head: [0.1, 0, 0.15],
        hipL: [-0.9, 0, 0.05], knL: [1.3, 0, 0], anL: [0.2, 0, 0], hipR: [-0.75, 0, -0.05], knR: [1.2, 0, 0], anR: [0.2, 0, 0], shL: [-1.0, 0, 0.1], elL: [-1.4, 0, 0], shR: [-0.9, 0, -0.1], elR: [-1.6, 0, 0], wrR: [0, 0, 0]})},
      wave: {dur: 2.2, f: (u, t) => { const k = key([[0, {k: 0}], [0.2, {k: 1}], [0.85, {k: 1}], [1, {k: 0}]], u).k, w = Math.sin(t * 9) * 0.35; return {shR: [-0.2 * k, 0, -2.5 * k], elR: [-0.5 * k, 0, w * k], wrR: [0, 0, 0], head: [0, -0.15 * k, 0], chest: [0, 0.1 * k, -0.05 * k]}; }},
      // scanning the distance, a hand shading the eyes
      look: {dur: 3.6, f: u => { const k = key([[0, {k: 0}], [0.15, {k: 1}], [0.85, {k: 1}], [1, {k: 0}]], u).k, turn = Math.sin(u * TAU) * 0.6;
        return {shR: [-2.3 * k, 0, -0.4 * k], elR: [-1.9 * k, 0, 0], wrR: [0.4 * k, 0, 0], neck: [-0.1 * k, turn * 0.5 * k, 0], head: [-0.1 * k, turn * 0.5 * k, 0], chest: [0, turn * 0.25 * k, 0]}; }},
      // wiping the sweat off the brow on a hot day
      wipe: {dur: 1.6, f: u => { const k = key([[0, {k: 0}], [0.3, {k: 1}], [0.7, {k: 1}], [1, {k: 0}]], u).k, s = Math.sin(u * PI * 3) * 0.3;
        return {shL: [-2.1 * k, 0.2, 0.3 * k + s * k], elL: [-2.2 * k, 0, 0], head: [-0.15 * k, 0, 0]}; }},
      stretch: {dur: 2.4, f: u => { const k = key([[0, {k: 0}], [0.35, {k: 1}], [0.7, {k: 1}], [1, {k: 0}]], u).k;
        return {shL: [-0.3 * k, 0, 2.7 * k], elL: [-0.3 * k, 0, 0], shR: [-0.3 * k, 0, -2.7 * k], elR: [-0.3 * k, 0, 0], spine: [-0.15 * k, 0, 0], chest: [-0.1 * k, 0, 0], head: [-0.3 * k, 0, 0]}; }},
      hurt: {dur: 0.6, f: u => { const k = Math.sin(u * PI); return {spine: [0.35 * k, 0, 0], chest: [0.2 * k, 0, 0], head: [0.3 * k, 0, 0], shL: [-0.6 * k, 0, 0.3 * k], shR: [-0.6 * k, 0, -0.3 * k], elL: [-0.8 * k, 0, 0], elR: [-0.8 * k, 0, 0], drop: -0.05 * k}; }}
    };
    // carrying an armload: arms only, so the legs keep walking
    const CARRY = {shL: [-0.55, 0, 0.18], elL: [-1.35, 0.25, 0], wrL: [0, 0, -0.3], shR: [-0.55, 0, -0.18], elR: [-1.35, -0.25, 0], wrR: [0, 0, 0.3], chest: [-0.06, 0, 0]};
    // shivering: arms hugged in, shoulders up, a fast tremble
    const SHIVER = t => ({shL: [-0.45, 0, -0.05], elL: [-2.0, 0.55, 0], shR: [-0.45, 0, 0.05], elR: [-2.0, -0.55, 0], chest: [0.12, 0.03 * Math.sin(t * 40), 0.02 * Math.sin(t * 37)], neck: [0.15, 0, 0], head: [0.1, 0, 0]});

    // ---------- what it is doing ----------
    const st = {move: null, u: 0, w: 0, hold: null, holdW: 0, carry: null, carryW: 0, phase: 0, walkW: 0, runW: 0, t: 0, blink: 2, look: 0, lookT: 0, lookTo: 0, idleNext: 6};
    const state = {cold: 0, hot: 0, tired: 0, wet: 0};
    function showProps() {
      const want = {}; const mv = st.hold && st.holdW > 0.4 ? MOVES[st.hold] : st.move ? MOVES[st.move] : null;
      if (mv && mv.props) for (const p of mv.props) want[p] = 1;
      if (st.carry && st.carryW > 0.3) want[st.carry] = 1;
      for (const k in props) props[k].visible = !!want[k];
    }
    function play(name) { if (!MOVES[name]) return false; if (MOVES[name].hold) return hold(name); st.move = name; st.u = 0; return true; }
    function hold(name) { if (name && !MOVES[name]) return false; st.prevHold = st.hold; st.hold = name || null; if (name) st.holdU = 0; return true; }
    function stop() { st.hold = null; st.move = null; }

    const pose = newPose();
    function animate(dt, t, speed) {
      st.t = t; speed = speed || 0;
      // walking and running
      const walking = speed > 0.05 ? 1 : 0;
      st.walkW = lerp(st.walkW, walking, 1 - Math.exp(-dt * 10));
      st.runW = lerp(st.runW, cl((speed - 1.6) / 1.2, 0, 1), 1 - Math.exp(-dt * 6));
      st.phase += speed * dt * (4.4 - 0.9 * st.runW);
      // moves and holds blend in and out
      if (st.move) { const M = MOVES[st.move]; st.u += dt / M.dur; st.w = Math.min(1, st.w + dt * 7); if (st.u >= 1) { if (M.loop) st.u -= 1; else { st.move = null; } } }
      else st.w = Math.max(0, st.w - dt * 6);
      if (st.hold) { st.holdW = Math.min(1, st.holdW + dt * 2.6); st.holdU = (st.holdU || 0) + dt / MOVES[st.hold].dur; }
      else { st.holdW = Math.max(0, st.holdW - dt * 3); if (st.holdW === 0) st.prevHold = null; }
      st.carryW = lerp(st.carryW, st.carry ? 1 : 0, 1 - Math.exp(-dt * 8));
      if (speed > 0.3 && st.hold) st.hold = null;

      // the pose: idle, then walking, then whatever it is doing
      const P = newPose(), w = st.walkW, ph = st.phase, run = st.runW;
      const breathe = Math.sin(t * (1.5 + state.tired * 0.8 + state.hot * 0.8));
      P.chest[0] = 0.015 * breathe; P.shL[2] = 0.07 + 0.012 * breathe; P.shR[2] = -0.07 - 0.012 * breathe; P.elL[0] = -0.12; P.elR[0] = -0.12;
      P.side = 0.012 * Math.sin(t * 0.45); P.hips[2] = 0.02 * Math.sin(t * 0.45);
      P.hipL[2] = 0.02; P.hipR[2] = -0.02;
      // now and then it looks round
      st.lookT -= dt; if (st.lookT < 0) { st.lookTo = (Math.random() - 0.5) * 1.2 * (1 - w); st.lookT = 2 + Math.random() * 4; }
      st.look = lerp(st.look, st.lookTo, 1 - Math.exp(-dt * 3)); P.neck[1] = st.look * 0.45; P.head[1] = st.look * 0.45;
      if (state.tired > 0.5) { P.spine[0] += 0.1 * state.tired; P.neck[0] += 0.15 * state.tired; }
      if (w > 0.001) {
        const s = Math.sin(ph), c = Math.cos(ph), stride = 0.5 + 0.2 * run;
        const W = newPose();
        W.hipL = [-stride * s, 0, 0.02]; W.hipR = [stride * s, 0, -0.02];
        W.knL = [0.1 + (0.95 + 0.5 * run) * Math.pow(Math.max(0, c), 1.4), 0, 0]; W.knR = [0.1 + (0.95 + 0.5 * run) * Math.pow(Math.max(0, -c), 1.4), 0, 0];
        W.anL = [-(W.hipL[0] + W.knL[0]) * 0.75 + 0.15 * Math.max(0, -s), 0, 0]; W.anR = [-(W.hipR[0] + W.knR[0]) * 0.75 + 0.15 * Math.max(0, s), 0, 0];
        W.shL = [(0.42 + 0.4 * run) * s, 0, 0.08]; W.shR = [-(0.42 + 0.4 * run) * s, 0, -0.08];
        W.elL = [-0.25 - 0.9 * run - 0.25 * Math.max(0, -s), 0, 0]; W.elR = [-0.25 - 0.9 * run - 0.25 * Math.max(0, s), 0, 0];
        W.hips = [0.04 + 0.1 * run, 0.12 * s, 0.035 * s]; W.chest = [0.03 + 0.12 * run, -0.14 * s, 0]; W.spine = [0.03 + 0.06 * run, 0, 0];
        W.neck = [0, 0.06 * s, 0]; W.head = [-0.03 - 0.06 * run, 0.04 * s, 0];
        W.drop = -0.012 + 0.024 * Math.cos(2 * ph) * (1 + run) - 0.04 * run;
        blendInto(P, W, w);
      }
      // cold, heat
      if (state.cold > 0.05 && !st.hold && !st.carry) blendInto(P, SHIVER(t), cl(state.cold, 0, 1) * (1 - w * 0.4));
      if (st.carryW > 0.001) blendInto(P, CARRY, st.carryW);
      const holdName = st.hold || st.prevHold;
      if (holdName && st.holdW > 0.001) blendInto(P, MOVES[holdName].f(cl(st.holdU || 0, 0, 1) % 1, t), ease(st.holdW));
      if (st.move && st.w > 0.001) { const M = MOVES[st.move], mp = M.f(st.u, t); blendInto(P, Object.assign(newPose(), currentAsBase(P), mp), ease(st.w)); }

      // set the joints
      for (const n of NAMES) { const j = J[n], a = P[n]; j.rotation.set(a[0], a[1], a[2]); }
      hips.position.set(P.side, 0.9 + P.drop, P.fwd);
      hips.rotation.z += P.roll;
      R.userData.lift = 0;
      showProps();
    }
    // a one-off move starts from the current pose, so arms it does not use keep doing what they were
    function currentAsBase(P) { const o = {}; for (const k in P) o[k] = Array.isArray(P[k]) ? P[k].slice() : P[k]; return o; }

    const tmp = new THREE.Vector3();
    function anchor(name, out) {
      out = out || new THREE.Vector3();
      const at = {head: [head, 0, 0.14, 0], chest: [chest, 0, 0.18, 0.1], handL: [J.wrL, 0, -0.06, 0], handR: [J.wrR, 0, -0.06, 0], feet: [R, 0, 0, 0], bow: [J.wrR, 0, -0.07, 0.3]}[name] || [R, 0, 0, 0];
      return at[0].localToWorld(out.set(at[1], at[2], at[3]));
    }
    return {
      root: R, joints: J, props, MOVES, state, animate, play, hold, stop, anchor,
      carry(k) { st.carry = k && props[k] ? k : null; },
      get action() { return st.hold || st.move || ''; }, get busy() { return !!st.move; },
      stats: () => ({triangles: Math.round(TRIS)}),
      setOutline(c) { outMat.uniforms.uC.value.set(c); }
    };
  }
  root.makeSurvivor = makeSurvivor;
})(typeof window !== 'undefined' ? window : globalThis);
