// life.js: what lives in a place, built in code. three.js r128 (global THREE). Defines makeLife(stage, opts).
//
// - The tallgrass moves: tufts made from the painting's own grass sway in the wind and the gusts, and part round
//   whoever walks through them.
// - Birds cross overhead with their shadows sliding over the ground; cardinals and sparrows hop and peck in the grass
//   and fly off when someone comes too close.
// - Butterflies drift over the flowers on warm days; a cottontail feeds at the edge of the brush and bolts for cover.
// life.update(t, dt, who) every frame, who = [{x, z}] the people in the place (in metres); life.scare(x, z) startles
// everything near a point (a shot, a shout, a fall).
(function (root) {
  'use strict';

  function makeLife(S, opts) {
    opts = opts || {};
    const T = S.trace, K = S.K, SN = S.SN, CS = S.CS, PI = Math.PI, TAU = PI * 2, PW = T.size[0], PH = T.size[1];
    let seed = opts.seed || 5511; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, rr = (a, b) => a + (b - a) * rnd();
    const cl = (v, a, b) => (v < a ? a : v > b ? b : v), lerp = (a, b, t) => a + (b - a) * t, sm = (a, b, x) => { const t = cl((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
    const root = new THREE.Group(); root.name = 'Life'; S.scene.add(root);
    const B = Trace.build(T), GW = Trace.GW, GH = Trace.GH;
    const tileOfW = (x, z) => [Math.floor(x * K / PW * GW), Math.floor(z * K * SN / PH * GH)];
    const open = (x, z) => { const [gx, gy] = tileOfW(x, z); return gx >= 0 && gy >= 0 && gx < GW && gy < GH && 'gGt'.indexOf(B.M[gy][gx]) >= 0; };
    const grassy = (x, z) => { const [gx, gy] = tileOfW(x, z); return gx >= 0 && gy >= 0 && gx < GW && gy < GH && 'gG'.indexOf(B.M[gy][gx]) >= 0; };
    const randOpen = (f) => { for (let i = 0; i < 80; i++) { const x = rr(1, PW / K - 1), z = rr(1, PH / (K * SN) - 1); if ((f || open)(x, z)) return new THREE.Vector3(x, 0, z); } return new THREE.Vector3(PW / K / 2, 0, PH / (K * SN) / 2); };
    // somewhere open inside the view, so that whoever is looking sees it
    const randView = (f) => { const [x0, x1, z0, z1] = S.viewBox(-0.5); for (let i = 0; i < 60; i++) { const x = rr(x0, x1), z = rr(z0, z1); if ((f || open)(x, z)) return new THREE.Vector3(x, 0, z); } return randOpen(f); };

    // ---------- toon materials and outlines, as the survivor's ----------
    const grad = (() => { const d = new Uint8Array([100, 100, 100, 255, 175, 175, 175, 255, 240, 240, 240, 255]); const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
    const mat = (c, o) => new THREE.MeshToonMaterial(Object.assign({color: c, gradientMap: grad}, o || {}));
    const outMat = new THREE.ShaderMaterial({uniforms: {uW: {value: 0.008}}, side: THREE.BackSide,
      vertexShader: 'uniform float uW; void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * uW, 1.); }',
      fragmentShader: 'void main(){ gl_FragColor = vec4(.12, .09, .07, 1.); }'});
    const part = (g, m, parent, line) => { const o = new THREE.Mesh(g, m); parent.add(o); if (line !== false) o.add(new THREE.Mesh(g, outMat)); return o; };
    const ball = (rx, ry, rz, s) => { const g = new THREE.SphereGeometry(1, s || 8, 6); g.scale(rx, ry, rz); return g; };

    // ================================================================================================================
    // the tallgrass, alive
    // ================================================================================================================
    const GU = Object.assign({uPaint: {value: S.paintTex}, uSize: {value: new THREE.Vector2(PW, PH)}, uBlades: {value: null}, uPush: {value: [new THREE.Vector4(0, 0, 0, 0), new THREE.Vector4(0, 0, 0, 0)]}, uK: {value: K}, uSn: {value: SN}},
      S.uniforms.AIRU, S.uniforms.LOOKU, S.uniforms.GLOWU);
    {
      // the blades: an atlas of four tufts, white, their shape in the alpha
      const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
      for (let k = 0; k < 4; k++) {
        const x0 = (k % 2) * 128, y0 = Math.floor(k / 2) * 64 + 0;
        for (let i = 0; i < 16 + k * 3; i++) {
          const bx = x0 + 18 + rnd() * 92, h = 34 + rnd() * 28, lean = rr(-14, 14), w = 2.2 + rnd() * 1.8, l = 150 + Math.floor(rnd() * 100);
          g.fillStyle = 'rgb(' + l + ',' + l + ',' + l + ')';
          g.beginPath(); g.moveTo(bx - w, y0 + 63); g.quadraticCurveTo(bx + lean * 0.3, y0 + 63 - h * 0.6, bx + lean, y0 + 63 - h); g.quadraticCurveTo(bx + lean * 0.3 + w * 0.4, y0 + 63 - h * 0.6, bx + w, y0 + 63); g.fill();
          if (k === 1 && rnd() < 0.5) { g.fillStyle = 'rgb(255,255,255)'; g.beginPath(); g.ellipse(bx + lean, y0 + 63 - h, 2, 5, lean * 0.03, 0, TAU); g.fill(); }
        }
      }
      const t = new THREE.CanvasTexture(c); t.flipY = false; GU.uBlades.value = t;
    }
    const tall = (T.ground || []).filter(q => q[0] === 'G').map(q => q[1]);
    const tufts = [];
    for (let py = 0; py < PH; py += 9) for (let px = 0; px < PW; px += 13) {
      const x = px + rr(0, 13), y = py + rr(0, 9);
      if (!tall.some(P => Trace.inPoly(P, x, y))) continue;
      if (Trace.toLine && T.trails.some(tr => Trace.toLine(tr.slice(1), x, y) < tr[0] / 2 + 4)) continue;
      if (S.standsAt(x, y)) continue;
      tufts.push([x, y]);
    }
    {
      const n = tufts.length, pos = new Float32Array(n * 6 * 3), uv = new Float32Array(n * 6 * 2), base = new Float32Array(n * 6 * 3), cell = new Float32Array(n * 6), pp = new Float32Array(n * 6 * 2);
      tufts.forEach((q, i) => {
        const P = S.toWorld(q[0], q[1]), w = rr(0.42, 0.62), h = rr(0.55, 0.95), k = Math.floor(rnd() * 4);
        const corners = [[-w / 2, 0, 0, 1], [w / 2, 0, 1, 1], [w / 2, h, 1, 0], [-w / 2, 0, 0, 1], [w / 2, h, 1, 0], [-w / 2, h, 0, 0]];
        corners.forEach((c, j) => { const o = i * 6 + j; pos[o * 3] = P.x + c[0]; pos[o * 3 + 1] = c[1]; pos[o * 3 + 2] = P.z; uv[o * 2] = c[2]; uv[o * 2 + 1] = c[3]; base[o * 3] = P.x; base[o * 3 + 1] = h; base[o * 3 + 2] = P.z; cell[o] = k; pp[o * 2] = q[0]; pp[o * 2 + 1] = q[1]; });
      });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setAttribute('aBase', new THREE.BufferAttribute(base, 3));
      geo.setAttribute('aCell', new THREE.BufferAttribute(cell, 1)); geo.setAttribute('aPP', new THREE.BufferAttribute(pp, 2));
      const m = new THREE.ShaderMaterial({
        uniforms: GU, transparent: false, side: THREE.DoubleSide,
        vertexShader: S.chunks.AIR + 'attribute vec3 aBase; attribute float aCell; attribute vec2 aPP; uniform vec4 uPush[2]; varying vec2 vUv, vPP; varying float vCell; varying vec3 vP;\n' +
          'void main(){ vUv = uv; vCell = aCell; vPP = aPP; vec3 p = position; float hh = position.y / aBase.y, bend = hh * hh;\n' +
          ' float g = gustAt(aBase.xz), wz = uWind.z; vec2 w = uWind.xy * (wz * (.12 + .5 * g) + .04 * sin(uT * 2.1 + aBase.x * 1.3 + aBase.z));\n' +
          ' for (int i = 0; i < 2; i++) { vec4 q = uPush[i]; if (q.w > 0.) { vec2 d = aBase.xz - q.xy; float l = length(d) + .001; w += d / l * q.w * (1. - smoothstep(q.z * .4, q.z, l)) * .55; } }\n' +
          ' p.x += w.x * bend * aBase.y; p.z += w.y * bend * aBase.y; p.y -= length(w) * bend * aBase.y * .35; vP = p;\n' +
          ' gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.); }',
        fragmentShader: S.chunks.AIR + S.chunks.GLOW + S.chunks.LOOK + 'uniform sampler2D uPaint, uBlades; uniform vec2 uSize; uniform float uK, uSn; varying vec2 vUv, vPP; varying float vCell; varying vec3 vP;\n' +
          'void main(){ vec2 cell = vec2(mod(vCell, 2.), floor(vCell / 2.)) * .5; vec4 b = texture2D(uBlades, cell + vUv * .5); if (b.a < .5) discard;\n' +
          ' vec3 c = texture2D(uPaint, (vPP + vec2((vUv.x - .5) * 18., -(1. - vUv.y) * 26.)) / uSize).rgb;\n' +
          ' c *= (.72 + .5 * (1. - vUv.y)) * (.75 + .35 * b.r);\n' +
          ' c = seasonal(c, vec4(.6, 1., 0., 0.), 0., vP);\n' +
          ' c *= 1. - .32 * cshade(vP.xz); c *= 1. + .12 * gustAt(vP.xz) * uWind.z;\n' +
          ' c *= 1. - .25 * uWet; c = lit(c, glowAt(vP));\n' +
          ' gl_FragColor = vec4(c, 1.); }'
      });
      const grass = new THREE.Mesh(geo, m); grass.frustumCulled = false; grass.renderOrder = 5; root.add(grass);
    }

    // ================================================================================================================
    // birds overhead, and their shadows on the ground
    // ================================================================================================================
    const shadowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 15); gr.addColorStop(0, 'rgba(0,0,0,.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();
    const shMat = new THREE.MeshBasicMaterial({map: shadowTex, transparent: true, depthWrite: false, color: 0x101408});
    function shadowOf(sx, sz) { const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz), shMat.clone()); m.rotation.x = -PI / 2; m.renderOrder = 2; root.add(m); return m; }
    // a bird: body, head, beak, tail, and two wings that flap; kind: crow, dove, cardinal, sparrow, scissortail
    const BIRDC = {crow: [0x1f2226, 0x2a2e33, 0x3a3428, 1.0], grackle: [0x22202e, 0x2c2a3e, 0x3a3428, 0.8], dove: [0x9c8f7c, 0x8a7d6a, 0x3a3030, 0.75], cardinal: [0xc0261c, 0xa01e18, 0xe08a2a, 0.55], sparrow: [0x8a6a48, 0x6e5238, 0x6a5a40, 0.45], scissortail: [0xc9c6bc, 0x50504c, 0x302c28, 0.62]};
    function bird(kind) {
      const c = BIRDC[kind], s = c[3], g = new THREE.Group(), body = new THREE.Group(); g.add(body);
      const mb = mat(c[0]), mw = mat(c[1]), mk = mat(c[2]);
      part(ball(0.06 * s, 0.055 * s, 0.13 * s), mb, body);
      const head = part(ball(0.05 * s, 0.05 * s, 0.055 * s), mb, body); head.position.set(0, 0.035 * s, 0.11 * s);
      const beak = part(new THREE.ConeGeometry(0.016 * s, 0.05 * s, 5), mk, head, false); beak.rotation.x = PI / 2; beak.position.set(0, -0.005 * s, 0.06 * s);
      if (kind === 'cardinal') { const crest = part(new THREE.ConeGeometry(0.02 * s, 0.06 * s, 5), mb, head, false); crest.position.set(0, 0.05 * s, -0.01 * s); crest.rotation.x = -0.6; const mask = part(ball(0.03 * s, 0.025 * s, 0.02 * s), mat(0x1a1210), head, false); mask.position.set(0, 0, 0.045 * s); }
      const tl = kind === 'scissortail' ? 0.38 : 0.12, tail = part(new THREE.BoxGeometry(0.06 * s, 0.01 * s, tl * s), mw, body); tail.position.set(0, 0.005 * s, -(0.12 + tl / 2) * s);
      mergeMeshes(body, outMat);
      const wingMat = mat(c[1], {side: THREE.DoubleSide});
      const wings = [1, -1].map(side => { const w = new THREE.Group(); body.add(w); w.position.set(0.03 * side * s, 0.02 * s, 0.01 * s); const shape = new THREE.Shape(); shape.moveTo(0, -0.05 * s); shape.lineTo(0.24 * s * side, -0.02 * s); shape.lineTo(0.2 * s * side, 0.06 * s); shape.lineTo(0, 0.07 * s); const geo = new THREE.ShapeGeometry(shape); geo.rotateX(PI / 2); part(geo, wingMat, w, false); return w; });
      g.userData = {wings, body, head, kind};
      return g;
    }
    const flocks = [];
    let nextFlock = rr(4, 12);
    function newFlock() {
      const [x0, x1, z0, z1] = S.viewBox(0), kind = ['crow', 'grackle', 'dove', 'dove', 'scissortail'][Math.floor(rnd() * 5)], n = kind === 'grackle' ? 6 + Math.floor(rnd() * 6) : 1 + Math.floor(rnd() * 3);
      const h = rr(7, 13), fromLeft = rnd() < 0.5, dir = new THREE.Vector3(fromLeft ? 1 : -1, 0, rr(-0.4, 0.4)).normalize(), speed = kind === 'dove' ? 9 : 6.5;
      // birds high up show far up the picture from where they are over the ground, so start them south of the view
      const zMid = rr(z0, z1) + h * CS / SN, xs = fromLeft ? x0 - 6 : x1 + 6;
      const F = {list: [], dir, speed, life: 0, max: (x1 - x0 + 14) / speed};
      for (let i = 0; i < n; i++) { const b = bird(kind); b.scale.setScalar(1.6); root.add(b); const off = new THREE.Vector3(rr(-1.5, 1.5) - i * 0.6 * Math.sign(dir.x), rr(-0.6, 0.6), rr(-1.5, 1.5)); b.position.set(xs + off.x, h + off.y, zMid + off.z); b.rotation.y = Math.atan2(dir.x, dir.z); b.userData.flap = rnd() * TAU; b.userData.sh = shadowOf(0.5, 0.25); F.list.push(b); }
      flocks.push(F);
    }
    // a bird on the ground: hops, pecks, and flies off when someone comes near
    const ground = [];
    function newGroundBird() {
      const kind = rnd() < 0.4 ? 'cardinal' : 'sparrow', b = bird(kind); b.scale.setScalar(1.6); root.add(b);
      const p = randView(grassy); b.position.copy(p); b.rotation.y = rnd() * TAU;
      b.userData.st = 'peck'; b.userData.t = rr(0.5, 2); b.userData.v = new THREE.Vector3(); b.userData.sh = shadowOf(0.18, 0.1);
      ground.push(b);
    }

    // ================================================================================================================
    // butterflies
    // ================================================================================================================
    const flies = [];
    function newButterfly() {
      const col = [0xe0802a, 0xf0d23c, 0xf2f0e4, 0x7a9cd8][Math.floor(rnd() * 4)], g = new THREE.Group(), m = mat(col, {side: THREE.DoubleSide});
      const wings = [1, -1].map(s => { const w = new THREE.Group(); g.add(w); const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.bezierCurveTo(0.03 * s, 0.05, 0.075 * s, 0.05, 0.07 * s, 0.0); shape.bezierCurveTo(0.075 * s, -0.04, 0.03 * s, -0.05, 0, 0); const geo = new THREE.ShapeGeometry(shape); geo.rotateX(-PI / 2); const o = new THREE.Mesh(geo, m); w.add(o); return w; });
      const body = new THREE.Mesh(ball(0.006, 0.006, 0.03), mat(0x2a2420)); g.add(body);
      g.scale.setScalar(1.8);
      const p = randView(grassy); g.position.set(p.x, rr(0.3, 1.2), p.z); g.userData = {wings, home: p.clone(), t: rnd() * 10, target: p.clone()};
      root.add(g); flies.push(g);
    }

    // ================================================================================================================
    // the cottontail
    // ================================================================================================================
    function rabbit() {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
      const fur = mat(0x8a7560), light = mat(0xb8a68e), white = mat(0xf2eee6), dark = mat(0x1e1814), pink = mat(0xc89a8a);
      const torso = part(ball(0.11, 0.1, 0.16), fur, body); torso.position.set(0, 0.13, 0);
      const haunch = part(ball(0.1, 0.1, 0.1), fur, body); haunch.position.set(0, 0.12, -0.08);
      const head = new THREE.Group(); body.add(head); head.position.set(0, 0.2, 0.13);
      part(ball(0.065, 0.06, 0.08), fur, head);
      const cheek = part(ball(0.05, 0.04, 0.05), light, head, false); cheek.position.set(0, -0.02, 0.03);
      for (const s of [1, -1]) { const e = part(ball(0.012, 0.014, 0.01), dark, head, false); e.position.set(0.045 * s, 0.015, 0.045); const ear = new THREE.Group(); head.add(ear); ear.position.set(0.025 * s, 0.05, -0.02); const eo = part(ball(0.022, 0.08, 0.012), fur, ear); eo.position.y = 0.07; const ei = part(ball(0.013, 0.06, 0.005), pink, ear, false); ei.position.set(0, 0.07, 0.009); ear.rotation.set(-0.25, 0, 0.2 * s); }
      const tail = part(ball(0.04, 0.04, 0.04), white, body); tail.position.set(0, 0.16, -0.18);
      for (const s of [1, -1]) { const f = part(ball(0.025, 0.06, 0.025), fur, body); f.position.set(0.05 * s, 0.05, 0.1); const h = part(ball(0.03, 0.03, 0.09), fur, body); h.position.set(0.07 * s, 0.03, -0.06); }
      mergeMeshes(head, outMat); head.traverse(o => { if (o.isMesh) o.userData.keep = true; }); mergeMeshes(body, outMat);
      g.scale.setScalar(1.25);
      g.userData = {body, head, st: 'feed', t: rr(1, 4), hop: 0, from: new THREE.Vector3(), to: new THREE.Vector3(), alive: true};
      return g;
    }
    const bunnies = [];
    function newRabbit() { const r = rabbit(); const p = randView(grassy); r.position.copy(p); r.rotation.y = rnd() * TAU; root.add(r); r.userData.sh = S.shadow(r, 0.14, 0.1); bunnies.push(r); }

    // ================================================================================================================
    // every frame
    // ================================================================================================================
    const near = (who, p, r) => (who || []).some(w => (w.x - p.x) ** 2 + (w.z - p.z) ** 2 < r * r);
    function flyOff(b) { const d = b.position.clone().sub(randOpen()).setY(0).normalize(); b.userData.st = 'fly'; b.userData.v.set(-d.x * 5 + rr(-1, 1), 3.5, -d.z * 5 + rr(-1, 1)); b.rotation.y = Math.atan2(b.userData.v.x, b.userData.v.z); }
    function update(t, dt, who) {
      const L = S.light, day = L.day, m = S.month, warm = m > 2.5 && m < 10, wx = S.wx;
      // the people push the grass aside
      const pu = GU.uPush.value;
      for (let i = 0; i < 2; i++) { const w = who && who[i]; if (w) pu[i].set(w.x, w.z, 0.75, 1); else pu[i].w = 0; }
      // birds overhead now and then, by day
      nextFlock -= dt * (day > 0.3 ? 1 : 0.15) * (wx.rain > 0.5 ? 0.3 : 1);
      if (nextFlock < 0) { newFlock(); nextFlock = rr(14, 40); }
      for (let i = flocks.length - 1; i >= 0; i--) {
        const F = flocks[i]; F.life += dt;
        for (const b of F.list) {
          b.position.addScaledVector(F.dir, F.speed * dt); b.position.y += Math.sin(t * 1.3 + b.userData.flap) * 0.01;
          const u = b.userData, fl = Math.sin(t * (u.kind === 'dove' ? 14 : 9) + u.flap), glide = Math.sin(t * 0.7 + u.flap) > 0.4 ? 0.2 : 1;
          u.wings[0].rotation.z = fl * 0.9 * glide; u.wings[1].rotation.z = -fl * 0.9 * glide;
          const h = b.position.y; u.sh.position.set(b.position.x + h * 0.32, 0.015, b.position.z + h * 0.22); u.sh.material.opacity = 0.5 * day * (1 - 0.7 * wx.cloud);
        }
        if (F.life > F.max) { for (const b of F.list) { root.remove(b); root.remove(b.userData.sh); } flocks.splice(i, 1); }
      }
      // birds on the ground by day
      const wantGround = day > 0.4 && wx.rain < 0.5 && wx.snow < 0.5 ? 4 : 0;
      if (ground.filter(b => b.userData.st !== 'fly').length < wantGround && rnd() < dt * 0.3) newGroundBird();
      for (let i = ground.length - 1; i >= 0; i--) {
        const b = ground[i], u = b.userData; u.t -= dt;
        if (u.st !== 'fly' && near(who, b.position, 3.2)) flyOff(b);
        if (u.st === 'peck') { u.body.rotation.x = Math.max(0, Math.sin(t * 9 + i)) * 0.5; if (u.t < 0) { u.st = 'hop'; u.t = rr(0.25, 0.5); const a = rnd() * TAU; u.v.set(Math.cos(a) * 1.2, 0, Math.sin(a) * 1.2); b.rotation.y = Math.atan2(u.v.x, u.v.z); } }
        else if (u.st === 'hop') { const nx = b.position.x + u.v.x * dt, nz = b.position.z + u.v.z * dt; if (grassy(nx, nz)) { b.position.x = nx; b.position.z = nz; } b.position.y = Math.abs(Math.sin(u.t * 20)) * 0.05; u.body.rotation.x = 0; if (u.t < 0) { u.st = 'peck'; u.t = rr(0.6, 2.5); b.position.y = 0; } }
        else if (u.st === 'fly') { b.position.addScaledVector(u.v, dt); u.v.y += dt * 0.5; const fl = Math.sin(t * 30 + i); u.wings[0].rotation.z = fl; u.wings[1].rotation.z = -fl; if (b.position.y > 14) { root.remove(b); root.remove(u.sh); ground.splice(i, 1); continue; } }
        if (u.st !== 'fly') { u.wings[0].rotation.set(0, -0.25, -1.35); u.wings[1].rotation.set(0, 0.25, 1.35); } else { u.wings[0].rotation.y = 0; u.wings[1].rotation.y = 0; }
        u.sh.position.set(b.position.x + b.position.y * 0.3, 0.014, b.position.z + b.position.y * 0.2); u.sh.material.opacity = 0.45 * (0.4 + 0.6 * day);
      }
      // butterflies on warm, calm days
      const wantFlies = day > 0.5 && warm && wx.rain < 0.3 && wx.wind < 1 ? 4 : 0;
      if (flies.length < wantFlies && rnd() < dt * 0.4) newButterfly();
      for (let i = flies.length - 1; i >= 0; i--) {
        const f = flies[i], u = f.userData; u.t += dt;
        if (u.t % 3 < dt || f.position.distanceTo(u.target) < 0.2) { u.target.set(u.home.x + rr(-3, 3), rr(0.25, 1.4), u.home.z + rr(-2, 2)); if (!grassy(u.target.x, u.target.z)) u.target.copy(u.home).setY(0.6); }
        const d = u.target.clone().sub(f.position); f.position.addScaledVector(d.normalize(), dt * 0.9); f.position.y += Math.sin(t * 7 + i) * dt * 0.6;
        f.position.x += AIRU().x * AIRU().z * dt * 0.5;
        f.rotation.y = Math.atan2(d.x, d.z); const fl = Math.sin(t * 22 + i * 3) * 1.1; u.wings[0].rotation.z = fl; u.wings[1].rotation.z = -fl;
        if ((!wantFlies && rnd() < dt * 0.3) || near(who, f.position, 1.2)) { u.home = randOpen(grassy); }
        if (!wantFlies && rnd() < dt * 0.2) { root.remove(f); flies.splice(i, 1); }
      }
      // the cottontail: out at dawn and dusk, and on quiet days
      const wantBunny = (L.day < 0.7 || rnd() < 0.5) && wx.rain < 0.6 ? 1 : 0;
      if (bunnies.length < wantBunny && rnd() < dt * 0.05) newRabbit();
      for (let i = bunnies.length - 1; i >= 0; i--) {
        const r = bunnies[i], u = r.userData; u.t -= dt;
        if (u.st !== 'run' && near(who, r.position, 4)) { u.st = 'run'; const away = r.position.clone(); const w = who.reduce((a, b) => (a && (a.x - r.position.x) ** 2 + (a.z - r.position.z) ** 2 < (b.x - r.position.x) ** 2 + (b.z - r.position.z) ** 2) ? a : b, null); away.x += (r.position.x - w.x) * 3; away.z += (r.position.z - w.z) * 3; u.to.copy(away); u.hop = 0; u.t = 3; }
        if (u.st === 'feed') { u.head.rotation.x = 0.4 + 0.15 * Math.sin(t * 6); u.body.position.y = 0; if (u.t < 0) { u.st = 'hop'; u.from.copy(r.position); const a = r.rotation.y + rr(-1.2, 1.2); u.to.set(r.position.x + Math.sin(a) * 0.6, 0, r.position.z + Math.cos(a) * 0.6); if (!grassy(u.to.x, u.to.z)) u.to.copy(r.position); u.hop = 0; } }
        else if (u.st === 'hop' || u.st === 'run') {
          const sp = u.st === 'run' ? 5.5 : 1.8, d = u.to.clone().sub(r.position).setY(0), dist = d.length();
          if (dist > 0.05) { r.rotation.y = Math.atan2(d.x, d.z); r.position.addScaledVector(d.normalize(), Math.min(dist, sp * dt)); }
          u.hop += dt * (u.st === 'run' ? 9 : 6); r.position.y = Math.abs(Math.sin(u.hop * PI)) * (u.st === 'run' ? 0.16 : 0.08); u.head.rotation.x = 0;
          if (u.st === 'hop' && dist < 0.05) { u.st = 'feed'; u.t = rr(1.5, 5); r.position.y = 0; }
          // gone into the brush
          if (u.st === 'run' && (u.t < 0 || !open(r.position.x, r.position.z))) { root.remove(r); r.visible = false; bunnies.splice(i, 1); }
        }
      }
    }
    const AIRU = () => S.uniforms.AIRU.uWind.value;
    function scare(x, z) { for (const b of ground) if (b.userData.st !== 'fly') flyOff(b); for (const r of bunnies) { r.userData.st = 'run'; r.userData.to.set(r.position.x + (r.position.x - x) * 4, 0, r.position.z + (r.position.z - z) * 4); r.userData.t = 3; } }
    return {root, update, scare, stats: () => ({tufts: tufts.length})};
  }
  root.makeLife = makeLife;
})(typeof window !== 'undefined' ? window : globalThis);
