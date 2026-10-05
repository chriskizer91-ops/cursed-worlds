// beasts.js: the game's animals, built in code. three.js r128 (global THREE). Defines makeBeast(kind).
//
// The ones the game keeps track of and you can hunt: white-tailed deer, wild turkeys, cottontails, fox squirrels and
// bison. Toon-shaded with an outline like the survivor, at their real sizes. Each faces +z with its feet at y = 0.
// b.root (set position and rotation.y), b.animate(dt, t, speed, graze) every frame: speed in m/s (0 standing), graze
// true to drop the head and feed.
(function (root) {
  'use strict';
  const PI = Math.PI, TAU = PI * 2;
  let grad = null, outMat = null;
  function kit() {
    if (grad) return;
    const d = new Uint8Array([100, 100, 100, 255, 175, 175, 175, 255, 240, 240, 240, 255]); grad = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat); grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
    outMat = new THREE.ShaderMaterial({uniforms: {uW: {value: 0.012}}, side: THREE.BackSide, vertexShader: 'uniform float uW; void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * uW, 1.); }', fragmentShader: 'void main(){ gl_FragColor = vec4(.12, .09, .07, 1.); }'});
  }
  const MATS = {};
  const mat = c => MATS[c] || (MATS[c] = new THREE.MeshToonMaterial({color: c, gradientMap: grad}));
  const ball = (rx, ry, rz, s) => { const g = new THREE.SphereGeometry(1, s || 10, 7); g.scale(rx, ry, rz); return g; };
  // a leg: a tapering capsule hanging down from its hip
  function legG(len, r0, r1) {
    const P = [], n = 4; for (let i = 0; i <= n; i++) { const a = -PI / 2 + PI / 2 * i / n; P.push(new THREE.Vector2(Math.max(0.0001, Math.cos(a) * r1), -len + Math.sin(a) * r1)); }
    for (let i = 1; i <= n; i++) { const a = PI / 2 * i / n; P.push(new THREE.Vector2(Math.max(0.0001, Math.cos(a) * r0), Math.sin(a) * r0)); }
    return new THREE.LatheGeometry(P, 7);
  }

  function makeBeast(kind) {
    kit();
    const R = new THREE.Group(); R.name = kind;
    const body = new THREE.Group(); R.add(body);
    const part = (g, c, parent, line) => { const o = new THREE.Mesh(g, mat(c)); (parent || body).add(o); if (line !== false) o.add(new THREE.Mesh(g, outMat)); return o; };
    const grp = (parent, x, y, z) => { const g = new THREE.Group(); (parent || body).add(g); g.position.set(x, y, z); return g; };
    const legs = [], st = {phase: Math.random() * TAU, head: null, neck: null, tail: null, hop: kind === 'rabbit' || kind === 'squirrel', walkW: 0, grazeW: 0};

    if (kind === 'deer' || kind === 'ghostbuck') {
      // a white-tailed doe or a young buck: tawny back, pale belly, the white flag of a tail. The ghost buck of the salt lick
      // is the legend: white all over, with a great rack of antlers.
      const ghost = kind === 'ghostbuck', coat = ghost ? 0xeeeae0 : 0x9c6e45, belly = ghost ? 0xfaf8f2 : 0xe8dcc8, dark = ghost ? 0x8a6a62 : 0x2a2018;
      body.position.y = 0.82;
      part(ball(0.2, 0.22, 0.52), coat); part(ball(0.16, 0.12, 0.42), belly).position.set(0, -0.09, 0);
      st.neck = grp(body, 0, 0.1, 0.42); const n = part(ball(0.09, 0.26, 0.1), coat, st.neck); n.position.set(0, 0.16, 0.06); n.rotation.x = 0.45;
      st.head = grp(st.neck, 0, 0.38, 0.16); part(ball(0.075, 0.08, 0.17), coat, st.head).position.set(0, 0, 0.06);
      part(ball(0.035, 0.035, 0.035), dark, st.head, false).position.set(0, -0.01, 0.22);
      for (const s of [1, -1]) { const e = part(ball(0.03, 0.08, 0.015), coat, st.head); e.position.set(0.07 * s, 0.09, -0.04); e.rotation.z = -0.6 * s; part(ball(0.014, 0.016, 0.01), dark, st.head, false).position.set(0.06 * s, 0.03, 0.08); }
      if (ghost) for (const s of [1, -1]) {
        // the main beam sweeping up and forward, and four tines standing up off it
        const beam = new THREE.CatmullRomCurve3([new THREE.Vector3(0.03 * s, 0.07, -0.03), new THREE.Vector3(0.16 * s, 0.2, -0.06), new THREE.Vector3(0.2 * s, 0.3, 0.06), new THREE.Vector3(0.12 * s, 0.34, 0.2)]);
        part(new THREE.TubeGeometry(beam, 10, 0.016, 5), 0xe2d6b8, st.head);
        for (const u of [0.3, 0.5, 0.7, 0.88]) { const p = beam.getPoint(u); part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([p, p.clone().add(new THREE.Vector3(0.01 * s, 0.12 - u * 0.04, 0.02))]), 3, 0.011, 4), 0xe2d6b8, st.head); }
      } else if (Math.random() < 0.5) for (const s of [1, -1]) { const a = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.03 * s, 0.07, -0.02), new THREE.Vector3(0.1 * s, 0.2, 0.02), new THREE.Vector3(0.09 * s, 0.26, 0.12)]), 6, 0.012, 4); part(a, 0xd9cdb0, st.head); }
      st.tail = grp(body, 0, 0.12, -0.5); part(ball(0.05, 0.12, 0.04), coat, st.tail).position.set(0, 0.04, -0.03); part(ball(0.035, 0.09, 0.03), 0xf5f2ea, st.tail, false).position.set(0, 0.04, -0.06);
      for (const [x, z] of [[0.11, 0.33], [-0.11, 0.33], [0.11, -0.35], [-0.11, -0.35]]) { const g = grp(body, x, -0.05, z); part(legG(0.74, 0.06, 0.024), coat, g); part(ball(0.026, 0.03, 0.035), dark, g, false).position.set(0, -0.77, 0.01); legs.push(g); }
      st.size = 1; st.gait = 6;
    } else if (kind === 'turkey') {
      // a wild turkey: bronze-black body, barred tail, blue-grey head and red wattle on a long neck
      const bronze = 0x3a2c22, sheen = 0x5a4430;
      body.position.y = 0.42;
      part(ball(0.2, 0.2, 0.28), bronze); part(ball(0.16, 0.12, 0.2), sheen).position.set(0, 0.06, -0.08);
      st.neck = grp(body, 0, 0.1, 0.22); const n = part(ball(0.045, 0.16, 0.05), 0x8a99a8, st.neck); n.position.set(0, 0.12, 0.02);
      st.head = grp(st.neck, 0, 0.27, 0.05); part(ball(0.045, 0.045, 0.06), 0x9ab0c4, st.head); part(ball(0.025, 0.05, 0.02), 0xc02a20, st.head, false).position.set(0, -0.05, 0.04);
      part(new THREE.ConeGeometry(0.015, 0.05, 5), 0xc8b070, st.head, false).position.set(0, 0, 0.07); st.head.children[st.head.children.length - 1].rotation.x = PI / 2;
      st.tail = grp(body, 0, 0.05, -0.25);
      for (let i = 0; i < 7; i++) { const f = part(new THREE.BoxGeometry(0.06, 0.26, 0.012), i % 2 ? 0x4a3828 : 0x2e231a, st.tail); f.position.set(0, 0.12, 0); f.geometry.translate(0, 0, 0); f.rotation.z = (i - 3) * 0.22; f.position.x = Math.sin((i - 3) * 0.22) * 0.12; f.position.y = Math.cos((i - 3) * 0.22) * 0.12 - 0.05; }
      st.tail.rotation.x = 0.9;
      for (const x of [0.07, -0.07]) { const g = grp(body, x, -0.12, 0.02); part(legG(0.3, 0.025, 0.012), 0xb88a6a, g); legs.push(g); }
      st.size = 1; st.gait = 9;
    } else if (kind === 'squirrel') {
      // a fox squirrel: rusty grey-brown, a big plumed tail curled up its back
      const fur = 0x9a6a44, pale = 0xd8a878;
      body.position.y = 0.1;
      part(ball(0.07, 0.07, 0.12), fur); part(ball(0.05, 0.04, 0.08), pale).position.set(0, -0.03, 0.02);
      st.head = grp(body, 0, 0.05, 0.11); part(ball(0.045, 0.045, 0.055), fur, st.head);
      for (const s of [1, -1]) { part(ball(0.012, 0.025, 0.008), fur, st.head).position.set(0.03 * s, 0.045, -0.01); part(ball(0.008, 0.009, 0.006), 0x1a1410, st.head, false).position.set(0.03 * s, 0.015, 0.035); }
      st.tail = grp(body, 0, 0.03, -0.11);
      const tg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.1, -0.08), new THREE.Vector3(0, 0.22, -0.04), new THREE.Vector3(0, 0.26, 0.04)]), 10, 0.045, 7); part(tg, 0xa8784c, st.tail);
      for (const [x, z] of [[0.04, 0.07], [-0.04, 0.07], [0.05, -0.06], [-0.05, -0.06]]) { const g = grp(body, x, -0.03, z); part(legG(0.06, 0.02, 0.012), fur, g, false); legs.push(g); }
      st.size = 1; st.gait = 12;
    } else if (kind === 'bison' || kind === 'oldbull') {
      // a bison: a great dark hump of wool over the shoulders, the head held low, short curved horns. The old bull of the
      // salt lick is the legend: bigger than any other, his wool gone grizzled and his horns thick and worn.
      const old = kind === 'oldbull', wool = old ? 0x6a5644 : 0x4a3222, hide = old ? 0x231a14 : 0x2e2018;
      body.position.y = 1.0;
      part(ball(0.42, 0.5, 0.75), hide).position.set(0, 0, -0.15); part(ball(0.48, 0.62, 0.55), wool).position.set(0, 0.12, 0.35);
      st.neck = grp(body, 0, -0.05, 0.7); st.head = grp(st.neck, 0, -0.2, 0.25);
      part(ball(0.24, 0.28, 0.3), wool, st.head); part(ball(0.16, 0.15, 0.18), hide, st.head).position.set(0, -0.12, 0.2);
      part(ball(0.12, 0.18, 0.1), wool, st.head).position.set(0, -0.3, 0.05);
      for (const s of [1, -1]) { const h = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.18 * s, 0.12, 0), new THREE.Vector3(0.3 * s, 0.18, 0.02), new THREE.Vector3(0.28 * s, 0.3, 0.08)]), 6, old ? 0.045 : 0.03, 5); part(h, old ? 0x3a3026 : 0x1a1612, st.head); }
      if (old) part(ball(0.3, 0.2, 0.3), 0x8a7860).position.set(0, 0.5, 0.42);   // the grizzled top of his hump
      st.tail = grp(body, 0, 0.1, -0.85); part(ball(0.03, 0.25, 0.03), hide, st.tail).position.set(0, -0.2, 0);
      for (const [x, z] of [[0.24, 0.5], [-0.24, 0.5], [0.22, -0.55], [-0.22, -0.55]]) { const g = grp(body, x, -0.3, z); part(legG(0.68, 0.12, 0.07), z > 0 ? wool : hide, g); legs.push(g); }
      st.size = 1; st.gait = 4;
    } else if (kind === 'quail' || kind === 'dove' || kind === 'duck') {
      // the game birds: a bobwhite (brown, with a white face stripe), a mourning dove (grey-tan, a long pointed tail)
      // and a wood duck drake (green crest, white bridle, chestnut breast). They walk, or fly with beating wings.
      const B = {quail: {s: 0.11, body: 0x8a5a36, back: 0x6a4a30, belly: 0xd9c49a, head: 0x5a3a24, bill: 0x2a2018, tail: 0.06},
        dove: {s: 0.12, body: 0xb0a08a, back: 0x9a8c78, belly: 0xd8c8b0, head: 0xa8988a, bill: 0x2a2018, tail: 0.16},
        duck: {s: 0.2, body: 0x6a4a3a, back: 0x3a3a34, belly: 0xd8ccb0, head: 0x1f5a40, bill: 0xd04a2a, tail: 0.08}}[kind];
      const k = B.s;
      body.position.y = k * 0.9;
      part(ball(k * 0.55, k * 0.5, k), B.body); part(ball(k * 0.45, k * 0.3, k * 0.8), B.belly).position.set(0, -k * 0.18, 0.02 * k);
      st.head = grp(body, 0, k * 0.45, k * 0.85); part(ball(k * 0.36, k * 0.36, k * 0.4), B.head, st.head);
      const bill = part(new THREE.ConeGeometry(k * 0.1, k * 0.3, 5), B.bill, st.head, false); bill.rotation.x = Math.PI / 2; bill.position.set(0, -k * 0.05, k * 0.4);
      if (kind === 'quail') for (const s2 of [1, -1]) part(ball(k * 0.06, k * 0.06, k * 0.3), 0xf2eee0, st.head, false).position.set(0.3 * k * s2, k * 0.08, k * 0.05);
      if (kind === 'duck') { part(ball(k * 0.2, k * 0.12, k * 0.45), 0x2f6a4a, st.head, false).position.set(0, k * 0.25, -k * 0.2); part(ball(k * 0.05, k * 0.25, k * 0.05), 0xf2f2ea, st.head, false).position.set(k * 0.3, 0, 0); part(ball(k * 0.4, k * 0.35, k * 0.35), 0x7a3a2a, body, false).position.set(0, k * 0.1, k * 0.65); }
      st.tail = grp(body, 0, k * 0.05, -k * 0.9); part(new THREE.BoxGeometry(k * 0.4, k * 0.06, B.tail * 2), B.back, st.tail).position.z = -B.tail;
      st.wings = [1, -1].map(side => { const w = grp(body, k * 0.4 * side, k * 0.25, 0); const sh = new THREE.Shape(); sh.moveTo(0, -k * 0.5); sh.lineTo(k * 1.6 * side, -k * 0.2); sh.lineTo(k * 1.3 * side, k * 0.5); sh.lineTo(0, k * 0.6);
        const g = new THREE.ShapeGeometry(sh); g.rotateX(Math.PI / 2); const o = new THREE.Mesh(g, new THREE.MeshToonMaterial({color: B.back, gradientMap: grad, side: THREE.DoubleSide})); w.add(o); return w; });
      for (const x of [0.15, -0.15]) { const g = grp(body, x * k, -k * 0.35, 0); part(legG(k * 0.5, k * 0.05, k * 0.03), 0xb07a50, g, false); legs.push(g); }
      st.size = 1; st.gait = 14; st.bird = true;
    } else {
      // a cottontail
      const fur = 0x8a7560;
      body.position.y = 0.12;
      part(ball(0.11, 0.1, 0.16), fur); part(ball(0.1, 0.1, 0.1), fur).position.set(0, -0.01, -0.08);
      st.head = grp(body, 0, 0.08, 0.13); part(ball(0.065, 0.06, 0.08), fur, st.head); part(ball(0.05, 0.04, 0.05), 0xb8a68e, st.head, false).position.set(0, -0.02, 0.03);
      for (const s of [1, -1]) { const e = grp(st.head, 0.025 * s, 0.05, -0.02); part(ball(0.022, 0.08, 0.012), fur, e).position.y = 0.07; e.rotation.set(-0.25, 0, 0.2 * s); part(ball(0.012, 0.014, 0.01), 0x1e1814, st.head, false).position.set(0.045 * s, 0.015, 0.045); }
      st.tail = grp(body, 0, 0.04, -0.18); part(ball(0.04, 0.04, 0.04), 0xf2eee6, st.tail);
      for (const [x, z] of [[0.05, 0.1], [-0.05, 0.1], [0.07, -0.06], [-0.07, -0.06]]) { const g = grp(body, x, -0.07, z); part(ball(0.025, 0.05, 0.03), fur, g).position.y = -0.03; legs.push(g); }
      st.size = 1; st.gait = 10;
    }

    function animate(dt, t, speed, graze, fly) {
      if (st.bird) {
        // a bird flying: wings beating, legs tucked, body level; on the ground it folds its wings
        const f = fly ? 1 : 0;
        st.flap = (st.flap || 0) + dt * (kind === 'dove' ? 26 : kind === 'quail' ? 34 : 18) * f;
        const a = f ? Math.sin(st.flap) * 1.1 : 0;
        st.wings[0].rotation.set(0, f ? 0 : 0.2, f ? a : -1.3); st.wings[1].rotation.set(0, f ? 0 : -0.2, f ? -a : 1.3);
        legs.forEach(g => { g.visible = !f; });
        if (!f) { st.phase += dt * 10 * Math.min(1.5, speed); body.position.y = body.userData.y0 + Math.abs(Math.sin(st.phase)) * 0.01 * (speed > 0.05 ? 1 : 0); if (st.head) st.head.rotation.x = graze ? 0.5 + 0.3 * Math.max(0, Math.sin(t * 9)) : 0; }
        else { body.position.y = body.userData.y0; if (st.head) st.head.rotation.x = 0; }
        return;
      }
      speed = speed || 0;
      st.walkW += ((speed > 0.05 ? 1 : 0) - st.walkW) * Math.min(1, dt * 8);
      st.grazeW += ((graze && speed < 0.05 ? 1 : 0) - st.grazeW) * Math.min(1, dt * 3);
      st.phase += dt * (st.gait * Math.min(2.5, 0.4 + speed));
      const w = st.walkW, s = Math.sin(st.phase), c = Math.cos(st.phase);
      if (st.hop) {
        // rabbits and squirrels bound: all four legs together, the body arcing
        const k = Math.max(0, s) * w; body.position.y = body.userData.y0 + k * 0.08 * (kind === 'squirrel' ? 0.6 : 1);
        legs.forEach((g, i) => { g.rotation.x = (i < 2 ? -1 : 1) * c * 0.7 * w; });
        body.rotation.x = -c * 0.15 * w;
      } else {
        // walking: legs swing in diagonal pairs, the back bobbing
        legs.forEach((g, i) => { const p = (i === 0 || i === 3) ? 0 : PI; g.rotation.x = Math.sin(st.phase + p) * (0.35 + 0.25 * Math.min(1, speed / 3)) * w; });
        body.position.y = body.userData.y0 + Math.abs(c) * 0.02 * w;
      }
      // the head: up and looking about, or down to graze
      if (st.neck) st.neck.rotation.x = 1.0 * st.grazeW - 0.05 * w;
      if (st.head) { st.head.rotation.x = (st.neck ? 0.3 : 0.6) * st.grazeW + 0.05 * Math.sin(t * 0.7); st.head.rotation.y = 0.35 * Math.sin(t * 0.4 + st.phase) * (1 - st.grazeW) * (1 - w); }
      if (st.tail) st.tail.rotation.z = (kind === 'deer' ? 0.25 : 0.1) * Math.sin(t * (kind === 'deer' ? 9 : 3)) * (kind === 'deer' ? Math.max(0, Math.sin(t * 0.5)) : 1);
      if (kind === 'turkey' && st.head && w > 0) st.head.position.z = 0.05 + 0.03 * Math.sin(st.phase * 2);
    }
    body.userData.y0 = body.position.y;
    return {root: R, kind, animate};
  }
  root.makeBeast = makeBeast;
})(typeof window !== 'undefined' ? window : globalThis);
