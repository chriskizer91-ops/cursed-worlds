// camp.js: the camp, built in code. three.js r128 (global THREE). Defines makeCamp(stage).
//
// What the survivor builds at the boulders, as the game describes it: the fire in the painted ring (out and grey, coals,
// burning, roaring), the shelter as it grows (a lean-to of poles against the tallest boulder with half the blue tarp over
// them; then the tarp moved up across all three boulders; then the gaps woven shut with cedar withes and clay, and a
// door), a grass bed and a hide blanket, the drying rack, the woodpile, the rain catcher, the food hang from the big oak's
// limb, and the two wooden crates. Everything stands where the camp's trace puts it (living/traces/camp.js).
// camp.set({ fire: 'out' | 'coals' | 'lit' | 'big', shelter: 0 to 3, bed, blanket, rack, meat, wood: 0 to 1, rain, hang, crates: 0 to 2 })
// camp.update(t, dt) every frame, camp.stoke() for a shower of sparks, camp.fire (where the fire is, in metres).
(function (root) {
  'use strict';

  function makeCamp(S, opts) {
    opts = opts || {};
    const T = S.trace, K = S.K, SN = S.SN, CS = S.CS, PI = Math.PI, TAU = PI * 2;
    const W = (px, py, h) => S.toWorld(px, py, h);
    let seed = 77031; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, rr = (a, b) => a + (b - a) * rnd();
    const cl = (v, a, b) => (v < a ? a : v > b ? b : v), lerp = (a, b, t) => a + (b - a) * t;
    const root = new THREE.Group(); root.name = 'Camp'; S.scene.add(root);

    // ---------- painted textures ----------
    const cvs = (w, h, f) => { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; };
    const speck = (g, w, h, n, cols, s) => { for (let i = 0; i < n; i++) { g.fillStyle = cols[Math.floor(rnd() * cols.length)]; g.fillRect(rnd() * w, rnd() * h, s || 2, s || 2); } };
    // the blue tarp: weathered poly weave, creases and grommets
    const tarpTex = cvs(256, 256, (g, w, h) => {
      g.fillStyle = '#3f6ea6'; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 3) { g.fillStyle = 'rgba(255,255,255,.035)'; g.fillRect(0, y, w, 1); }
      for (let x = 0; x < w; x += 3) { g.fillStyle = 'rgba(0,0,0,.04)'; g.fillRect(x, 0, 1, h); }
      for (let i = 0; i < 14; i++) { const x0 = rnd() * w, y0 = rnd() * h, a = rnd() * PI, l = 40 + rnd() * 120; g.strokeStyle = rnd() < 0.5 ? 'rgba(255,255,255,.13)' : 'rgba(10,20,40,.16)'; g.lineWidth = 2 + rnd() * 4; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + Math.cos(a) * l, y0 + Math.sin(a) * l); g.stroke(); }
      speck(g, w, h, 300, ['rgba(120,100,70,.25)', 'rgba(200,210,220,.15)'], 2);
      g.fillStyle = '#d9d5c4'; for (let i = 8; i < w; i += 40) { g.beginPath(); g.arc(i, 6, 3, 0, TAU); g.fill(); g.beginPath(); g.arc(i, h - 6, 3, 0, TAU); g.fill(); }
    });
    // cedar poles: stringy red-brown bark
    const barkTex = cvs(64, 256, (g, w, h) => {
      g.fillStyle = '#6e4a34'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 60; i++) { const x = rnd() * w; g.fillStyle = rnd() < 0.5 ? 'rgba(40,24,16,.5)' : 'rgba(170,120,90,.35)'; g.fillRect(x, 0, 1 + rnd() * 2, h); }
      for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(30,18,12,.5)'; g.fillRect(rnd() * w, rnd() * h, 3 + rnd() * 6, 1); }
    });
    // crate planks: pale pine with grain, gaps and nail heads
    const plankTex = cvs(128, 128, (g, w, h) => {
      g.fillStyle = '#c4a271'; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 32) { g.fillStyle = 'rgba(70,45,25,.75)'; g.fillRect(0, y, w, 2); for (let k = 0; k < 6; k++) { g.strokeStyle = 'rgba(120,80,40,.35)'; g.beginPath(); const yy = y + 5 + rnd() * 24; g.moveTo(0, yy); g.bezierCurveTo(w * 0.3, yy + rr(-3, 3), w * 0.6, yy + rr(-3, 3), w, yy + rr(-2, 2)); g.stroke(); } g.fillStyle = '#4b4b48'; g.fillRect(6, y + 14, 3, 3); g.fillRect(w - 10, y + 14, 3, 3); }
      g.fillStyle = 'rgba(70,45,25,.6)'; g.fillRect(0, 0, 6, h); g.fillRect(w - 6, 0, 6, h);
    });
    // wattle and daub: cedar withes woven between stakes, packed with clay and grass
    const wattleTex = cvs(256, 256, (g, w, h) => {
      g.fillStyle = '#8f7a5c'; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 14) for (let x = 0; x < w; x += 32) { const o = ((y / 14) % 2) * 16; g.fillStyle = (x / 32 + y / 14) % 2 ? '#6b4f36' : '#7c5c40'; g.beginPath(); g.ellipse(x + o + 16, y + 7, 18, 6, 0, 0, TAU); g.fill(); }
      for (let i = 0; i < 26; i++) { const x = rnd() * w, y = rnd() * h, r = 14 + rnd() * 30; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(176,160,132,.95)'); gr.addColorStop(0.7, 'rgba(160,142,112,.8)'); gr.addColorStop(1, 'rgba(160,142,112,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
      speck(g, w, h, 500, ['rgba(200,180,110,.5)', 'rgba(90,70,50,.4)'], 2);
      for (let x = 10; x < w; x += 42) { g.fillStyle = 'rgba(80,55,35,.55)'; g.fillRect(x, 0, 5, h); }
    });
    // grass bedding
    const strawTex = cvs(128, 128, (g, w, h) => { g.fillStyle = '#b39a5f'; g.fillRect(0, 0, w, h); for (let i = 0; i < 500; i++) { const x = rnd() * w, y = rnd() * h, a = rr(-0.5, 0.5); g.strokeStyle = ['#d6c182', '#8f7a45', '#c9b06a', '#a68e52'][i % 4]; g.lineWidth = 1 + rnd(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 14, y + Math.sin(a) * 14); g.stroke(); } });
    // a deer hide blanket
    const hideTex = cvs(128, 128, (g, w, h) => { g.fillStyle = '#8a6440'; g.fillRect(0, 0, w, h); speck(g, w, h, 900, ['#9c7650', '#6e4c30', '#b08a60'], 2); const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(60,40,24,.5)'); gr.addColorStop(0.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(60,40,24,.5)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });

    // ---------- materials, and a dark outline round each solid thing ----------
    const grad = (() => { const d = new Uint8Array([100, 100, 100, 255, 175, 175, 175, 255, 240, 240, 240, 255]); const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
    const mat = (o) => new THREE.MeshToonMaterial(Object.assign({gradientMap: grad}, o));
    const outMat = new THREE.ShaderMaterial({uniforms: {uW: {value: 0.012}}, side: THREE.BackSide,
      vertexShader: 'uniform float uW; void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * uW, 1.); }',
      fragmentShader: 'void main(){ gl_FragColor = vec4(.14, .1, .08, 1.); }'});
    const M = {
      tarp: mat({map: tarpTex, side: THREE.DoubleSide}), bark: mat({map: barkTex}), plank: mat({map: plankTex}), wattle: mat({map: wattleTex}), straw: mat({map: strawTex}), hide: mat({map: hideTex}),
      log: mat({color: 0x6b5038}), char: mat({color: 0x2b2420}), ash: mat({color: 0x8d8a84}), split: mat({color: 0xc59a66}), meat: mat({color: 0x7a2a22}), rope: mat({color: 0xc8b88e}), bag: mat({color: 0x3f6ea6}), clay: mat({color: 0x9c8a6c})
    };
    function mesh(g, m, line, parent) { const o = new THREE.Mesh(g, m); (parent || root).add(o); if (line !== false) { const l = new THREE.Mesh(g, outMat); o.add(l); } return o; }
    // a pole from a to b (Vector3s), radius r
    function pole(a, b, r, m, parent) {
      const d = new THREE.Vector3().subVectors(b, a), len = d.length(), g = new THREE.CylinderGeometry(r * 0.85, r, len, 7, 1);
      g.translate(0, len / 2, 0); const o = mesh(g, m || M.bark, true, parent); o.position.copy(a); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return o;
    }
    // a sagging cloth between four corners (nw, ne, sw, se), sag in metres at the middle
    function cloth(c, sag, m, nx, ny, parent, droop) {
      nx = nx || 8; ny = ny || 8; const g = new THREE.PlaneGeometry(1, 1, nx, ny), p = g.attributes.position, v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        const u = p.getX(i) + 0.5, w = 0.5 - p.getY(i);
        const top = new THREE.Vector3().lerpVectors(c[0], c[1], u), bot = new THREE.Vector3().lerpVectors(c[2], c[3], u);
        v.lerpVectors(top, bot, w); v.y -= sag * Math.sin(u * PI) * Math.sin(w * PI) + 0.03 * Math.sin(u * 17 + w * 5);
        // the side edges hang down over whatever holds the cloth up
        if (droop) { const e = Math.max(0, Math.abs(u - 0.5) * 2 - 0.72) / 0.28; v.y -= droop * e * e; v.x += Math.sign(u - 0.5) * droop * 0.25 * e; }
        p.setXYZ(i, v.x, v.y, v.z);
      }
      g.computeVertexNormals(); return mesh(g, m || M.tarp, false, parent);
    }
    const group = (name) => { const g = new THREE.Group(); g.name = name; root.add(g); return g; };

    // ---------- the fire ----------
    const ring = T.ring, F = W(ring[0], ring[1]);
    const fireG = group('fire'); fireG.position.copy(F);
    const ash = mesh(new THREE.CircleGeometry(0.42, 18), M.ash, false, fireG); ash.rotation.x = -PI / 2; ash.position.y = 0.01; ash.scale.set(1, 1, 1);
    // logs laid in a star, inner ends charred; for a fire they lean in toward each other
    const logs = [];
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * TAU + 0.3, len = rr(0.48, 0.6), g = new THREE.CylinderGeometry(0.038, 0.045, len, 7, 4);
      const col = new Float32Array(g.attributes.position.count * 3), c0 = new THREE.Color(0x6b5038), c1 = new THREE.Color(0x1e1a18);
      for (let k = 0; k < g.attributes.position.count; k++) { const y = g.attributes.position.getY(k) / len + 0.5, c = c0.clone().lerp(c1, cl((y - 0.55) / 0.35, 0, 1)); col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.translate(0, len / 2, 0);
      const o = mesh(g, mat({vertexColors: true}), true, fireG); o.userData = {a, len}; logs.push(o);
    }
    function layLogs(st) {
      logs.forEach((o, i) => {
        const a = o.userData.a, show = st !== 'out' || i < 3; o.visible = show;
        const lean = st === 'lit' || st === 'big' ? 1.05 : st === 'coals' ? 1.4 : 1.52, r0 = st === 'out' ? 0.42 : 0.38;
        o.position.set(Math.cos(a) * r0, 0.04, Math.sin(a) * r0);
        o.rotation.set(0, 0, 0); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-Math.cos(a) * Math.sin(lean), Math.cos(lean), -Math.sin(a) * Math.sin(lean)).normalize());
      });
    }
    // the coals: a bed of glowing pieces
    const coalG = new THREE.Group(); fireG.add(coalG);
    const coalMat = new THREE.MeshBasicMaterial({color: 0xff5a1a});
    for (let i = 0; i < 14; i++) { const o = new THREE.Mesh(new THREE.DodecahedronGeometry(rr(0.025, 0.045)), coalMat); o.position.set(rr(-0.16, 0.16), 0.02, rr(-0.12, 0.12)); o.rotation.set(rnd() * 3, rnd() * 3, 0); coalG.add(o); }
    // the flames: a few tongues of fire, alive in their shader
    const FU = {uT: S.uniforms.AIRU.uT, uWind: S.uniforms.AIRU.uWind, uK: {value: 1}};
    const flameMat = new THREE.ShaderMaterial({
      uniforms: FU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: 'attribute float aSeed; varying vec2 vUv; varying float vSeed; uniform float uT; uniform vec4 uWind;\nvoid main(){ vUv = uv; vSeed = aSeed; vec3 p = position; float h = uv.y; p.x += (uWind.x * uWind.z * .35 + sin(uT * 7. + aSeed * 3.) * .04) * h * h; p.z += uWind.y * uWind.z * .2 * h * h; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.); }',
      fragmentShader: S.chunks.NOISE + 'uniform float uT, uK; varying vec2 vUv; varying float vSeed;\nvoid main(){ vec2 p = vUv; p.x += (mn(vec2(p.y * 3.5 - uT * 3.2, vSeed * 7.)) - .5) * .45 * p.y;\n float w = mix(.46, .03, pow(p.y, .75)), dx = abs(p.x - .5) / w;\n float body = (1. - smoothstep(.45, 1., dx)) * smoothstep(0., .1, p.y);\n float f = body * (.5 + .75 * mf(vec2(p.x * 4. + vSeed * 3., p.y * 2.6 - uT * 4.2))) - p.y * .55;\n f = smoothstep(.12, .75, f);\n vec3 c = mix(vec3(.85, .2, .04), vec3(1., .62, .18), smoothstep(.15, .6, f)); c = mix(c, vec3(1., .93, .7), smoothstep(.6, 1., f) * (1. - p.y));\n gl_FragColor = vec4(c * f * uK * 1.3, f); }'
    });
    const flameG = new THREE.Group(); fireG.add(flameG);
    const FL = [];
    for (let i = 0; i < 5; i++) {
      const g = new THREE.PlaneGeometry(1, 1, 1, 6); g.translate(0, 0.5, 0);
      g.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(i * 1.37 + 0.3), 1));
      const o = new THREE.Mesh(g, flameMat); o.renderOrder = 30; o.rotation.y = (i % 2 ? 0.5 : -0.4); flameG.add(o); FL.push(o);
    }
    // a soft glow round the fire's base
    const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,170,80,1)'); gr.addColorStop(0.35, 'rgba(255,110,40,.45)'); gr.addColorStop(1, 'rgba(255,80,20,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true})); halo.position.y = 0.25; halo.renderOrder = 29; fireG.add(halo);

    // ---------- the shelter ----------
    const shelterG = [group('shelter1'), group('shelter2'), group('shelter3')];
    {
      // 1: a lean-to: six cedar poles leaning on the north boulder's face, half the tarp stretched over them, its sides
      // hanging down over the outer poles
      const G = shelterG[0], x0 = 744, x1 = 826, yTop = 338, yBot = 420, hTop = 1.75;
      for (let i = 0; i < 6; i++) { const x = lerp(x0 - 8, x1 + 8, i / 5), a = W(x + rr(-2, 2), yBot), b = W(x + rr(-2, 2), yTop, hTop); pole(a, b.clone().sub(a).multiplyScalar(1.16).add(a), 0.034, M.bark, G); }
      const c = [W(x0, yTop + 3, hTop + 0.16), W(x1, yTop + 3, hTop + 0.16), W(x0 - 4, yBot - 8, 0.36), W(x1 + 4, yBot - 8, 0.36)];
      cloth(c, 0.04, M.tarp, 10, 8, G, 0.5);
      pole(W(x0 - 22, yTop + 4, hTop - 0.04), W(x1 + 22, yTop + 4, hTop - 0.04), 0.032, M.bark, G);
      for (const k of [2, 3]) pole(c[k], c[k].clone().add(new THREE.Vector3(k === 2 ? -0.3 : 0.3, -0.18, 0.25)), 0.008, M.rope, G);
    }
    {
      // 2: the tarp moved up across all three boulders, resting on their tops, with a crosspole at the front; open
      // to the south, where the fire is
      const G = shelterG[1];
      const nw = W(706, 330, 3.25), ne = W(862, 330, 3.25), sw = W(690, 408, 3.0), se = W(870, 414, 3.0);
      cloth([nw, ne, sw, se], 0.26, M.tarp, 12, 10, G, 0.35);
      pole(W(676, 406, 2.98), W(884, 414, 2.98), 0.042, M.bark, G);
    }
    {
      // 3: the gaps woven shut with cedar withes packed with clay and grass, and a front wall with a doorway hung with
      // a hide
      const G = shelterG[2];
      const wall = (a, b, h, door) => {
        const d = new THREE.Vector3().subVectors(b, a), len = d.length(), ang = Math.atan2(d.x, d.z);
        if (!door) { const g = new THREE.BoxGeometry(0.12, h, len); g.translate(0, h / 2, len / 2); const o = mesh(g, M.wattle, true, G); o.position.copy(a); o.rotation.y = ang; return; }
        const dw = 0.72, side = (len - dw) / 2;
        for (const s of [0, 1]) { const g = new THREE.BoxGeometry(0.12, h, side); g.translate(0, h / 2, side / 2 + s * (side + dw)); const o = mesh(g, M.wattle, true, G); o.position.copy(a); o.rotation.y = ang; }
        const g = new THREE.BoxGeometry(0.12, h - 1.6, dw); g.translate(0, 1.6 + (h - 1.6) / 2, side + dw / 2); const o = mesh(g, M.wattle, true, G); o.position.copy(a); o.rotation.y = ang;
        const flap = new THREE.PlaneGeometry(dw * 0.96, 1.58, 4, 4), fp = flap.attributes.position; for (let i = 0; i < fp.count; i++) fp.setZ(i, 0.03 * Math.sin(fp.getX(i) * 9)); flap.computeVertexNormals(); flap.translate(0, 0.79, 0);
        const f = mesh(flap, mat({map: hideTex, side: THREE.DoubleSide}), false, G);
        f.position.copy(a).addScaledVector(d.clone().normalize(), side + dw / 2).add(new THREE.Vector3(0, 0, 0.07)); f.rotation.y = ang - PI / 2;
      };
      wall(W(722, 420), W(824, 426), 2.95, true);
      wall(W(694, 318), W(714, 356), 3.1);
      wall(W(844, 318), W(864, 350), 3.1);
      for (let i = 0; i < 7; i++) { const o = mesh(new THREE.SphereGeometry(rr(0.08, 0.13), 7, 5), M.clay, false, G); o.position.copy(W(rr(724, 822), rr(422, 428), 0.02)); o.scale.y = 0.5; }
    }

    // ---------- the bed and the blanket, inside the shelter ----------
    const bedG = group('bed');
    { const g = new THREE.BoxGeometry(1.9, 0.18, 0.85, 6, 1, 3), p = g.attributes.position; for (let i = 0; i < p.count; i++) { if (p.getY(i) > 0) p.setY(i, p.getY(i) + 0.03 * Math.sin(p.getX(i) * 5) - 0.04 * Math.abs(p.getZ(i) * 2.2) ** 2); } g.computeVertexNormals(); const o = mesh(g, M.straw, true, bedG); o.position.copy(W(784, 372, 0.08)); }
    const blanketG = group('blanket');
    { const g = new THREE.PlaneGeometry(1.3, 0.8, 6, 4), p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, 0.04 * Math.sin(p.getX(i) * 6 + p.getY(i) * 3)); g.computeVertexNormals(); const o = mesh(g, M.hide, false, blanketG); o.rotation.x = -PI / 2; o.position.copy(W(796, 372, 0.2)); }

    // ---------- the drying rack: two A-frames, two crossbars, strips of meat ----------
    const rackG = group('rack'), meatG = new THREE.Group(); rackG.add(meatG);
    {
      const c = T.sites.rack, a = W(c[0] - 38, c[1]), b = W(c[0] + 38, c[1]);
      for (const e of [a, b]) { pole(e.clone().add(new THREE.Vector3(0, 0, -0.35)), e.clone().add(new THREE.Vector3(0, 1.45, 0.05)), 0.025, M.bark, rackG); pole(e.clone().add(new THREE.Vector3(0, 0, 0.4)), e.clone().add(new THREE.Vector3(0, 1.45, -0.05)), 0.025, M.bark, rackG); }
      for (const h of [1.38, 1.05]) pole(a.clone().add(new THREE.Vector3(-0.1, h, 0)), b.clone().add(new THREE.Vector3(0.1, h, 0)), 0.022, M.bark, rackG);
      for (let i = 0; i < 9; i++) { const x = lerp(a.x + 0.1, b.x - 0.1, i / 8) + rr(-0.03, 0.03), h = i % 2 ? 1.05 : 1.38, len = rr(0.28, 0.42); const g = new THREE.BoxGeometry(0.07, len, 0.012); g.translate(0, -len / 2, 0); const o = mesh(g, M.meat, true, meatG); o.position.set(x, h, a.z + rr(-0.02, 0.02)); o.rotation.z = rr(-0.1, 0.1); }
    }
    // ---------- the woodpile: split logs stacked in a row ----------
    const woodG = group('wood'), woodRows = [];
    {
      // each log is bark round its side and pale split wood at its ends
      const c = T.sites.wood, base = W(c[0], c[1]);
      for (let row = 0; row < 4; row++) {
        const R = new THREE.Group(); woodG.add(R); woodRows.push(R);
        for (let i = 0; i < 6 - row; i++) {
          const len = rr(0.7, 0.85), side = new THREE.CylinderGeometry(0.075, 0.075, len, 8, 1, true), ends = new THREE.CylinderGeometry(0.075, 0.075, len, 8, 1, false);
          ends.clearGroups(); const keep = ends.index.array.slice(8 * 6); ends.setIndex(Array.from(keep));
          for (const [g, m] of [[side, M.log], [ends, M.split]]) { g.rotateZ(PI / 2); const o = mesh(g, m, g === side, R); o.position.set(base.x + (i - (5 - row) / 2) * 0.155, 0.075 + row * 0.13, base.z + ((i * 7 + row * 3) % 5 - 2) * 0.012); o.rotation.x = (i * 1.7 + row) % PI; }
        }
      }
    }
    // ---------- the rain catcher: the tarp sagging between four poles into a bowl ----------
    const rainG = group('rain');
    {
      const c = T.sites.rain, p = (dx, dz) => W(c[0] + dx, c[1] + dz);
      const k = [p(-30, -24), p(30, -24), p(-30, 26), p(30, 26)];
      for (const q of k) pole(q, q.clone().add(new THREE.Vector3(0, 1.05, 0)), 0.025, M.bark, rainG);
      cloth(k.map(q => q.clone().add(new THREE.Vector3(0, 1.0, 0))), 0.55, M.tarp, 8, 8, rainG);
      const bowl = mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.18, 12, 1, true), M.log, true, rainG); bowl.position.copy(W(c[0], c[1] + 2, 0.09)); bowl.material = mat({color: 0x6b4a30, side: THREE.DoubleSide});
    }
    // ---------- the food hang: a rope over the big oak's limb, a tarp bag up out of reach ----------
    const hangG = group('hang');
    {
      const c = T.sites.hang, top = W(c[0], c[1], 3.4), bag = W(c[0], c[1], 2.45);
      pole(top, bag.clone().add(new THREE.Vector3(0, 0.2, 0)), 0.008, M.rope, hangG);
      const b = mesh(new THREE.SphereGeometry(0.2, 10, 8), M.bag, true, hangG); b.position.copy(bag); b.scale.set(1, 1.25, 1);
      pole(top, W(300, 418, 1.0), 0.008, M.rope, hangG);
    }
    // ---------- the crates ----------
    const crateG = [];
    for (let i = 0; i < 2; i++) { const g = new THREE.BoxGeometry(0.62, 0.44, 0.44); const o = mesh(g, M.plank, true, root); const c = T.sites.crate; o.position.copy(W(c[0] + (i ? 30 : -6), c[1] + (i ? -4 : 6), 0.22)); o.rotation.y = i ? 0.25 : -0.08; crateG.push(o); }

    // ---------- join what never comes apart, so the phone draws each in a few calls ----------
    for (const G of [...shelterG, bedG, blanketG, rainG, hangG, coalG]) mergeMeshes(G, outMat);
    rackG.remove(meatG); mergeMeshes(rackG, outMat); mergeMeshes(meatG, outMat); rackG.add(meatG);
    woodRows.forEach(G => mergeMeshes(G, outMat));

    // ---------- the camp's state ----------
    const st = {fire: 'out', shelter: 0, bed: false, blanket: false, rack: false, meat: false, wood: 0, rain: false, hang: false, crates: 2};
    function set(o) {
      Object.assign(st, o || {});
      layLogs(st.fire);
      coalG.visible = st.fire !== 'out'; flameG.visible = st.fire === 'lit' || st.fire === 'big'; halo.visible = st.fire !== 'out';
      ash.material = st.fire === 'out' ? M.ash : M.char;
      shelterG[0].visible = st.shelter === 1; shelterG[1].visible = st.shelter >= 2; shelterG[2].visible = st.shelter >= 3;
      bedG.visible = !!st.bed; blanketG.visible = !!st.blanket;
      rackG.visible = !!st.rack; meatG.visible = !!st.meat;
      woodG.visible = st.wood > 0; woodRows.forEach((R, i) => { R.visible = st.wood > [0, 0.35, 0.6, 0.85][i]; });
      rainG.visible = !!st.rain; hangG.visible = !!st.hang;
      crateG.forEach((o, i) => { o.visible = i < st.crates; });
    }
    set({});

    const em = {smoke: 0, ember: 0, rack: 0};
    let flick = 1;
    function update(t, dt) {
      const big = st.fire === 'big', lit = st.fire === 'lit' || big, coals = st.fire === 'coals';
      // the flames: their size breathes and flickers
      flick = lerp(flick, 0.82 + 0.3 * Math.random(), 0.25);
      const fh = big ? 1.05 : 0.62, fw = big ? 0.62 : 0.42;
      FL.forEach((o, i) => { const k = 0.75 + 0.25 * Math.sin(t * (5 + i) + i * 2); o.scale.set(fw * (0.7 + 0.12 * i % 0.4), fh * k * (i === 0 ? 1.15 : 0.75 + 0.1 * i), 1); o.position.set((i - 2) * 0.06, 0.03, (i % 2 - 0.5) * 0.08); });
      FU.uK.value = flick;
      coalMat.color.setRGB(1, 0.25 + 0.2 * Math.sin(t * 3) * Math.sin(t * 7.3) + (lit ? 0.15 : 0), 0.05);
      halo.scale.setScalar((lit ? (big ? 2.4 : 1.7) : 0.9) * (0.9 + 0.1 * flick));
      halo.material.opacity = lit ? 0.55 : 0.35;
      // the firelight on the painting and on the models
      if (lit || coals) S.glow(0, F.x, 0.35, F.z, (big ? 7.5 : lit ? 5.5 : 2.2) * (0.94 + 0.06 * flick), lit ? 0xff9440 : 0xff5a20, (big ? 1.25 : lit ? 1.0 : 0.5) * flick);
      else S.glow(0, 0, 0, 0, 0);
      // smoke, embers, and a thin smoke under the rack
      em.smoke += dt * (big ? 5 : lit ? 3.2 : coals ? 1.2 : 0);
      while (em.smoke > 1) { em.smoke--; const g = 0.48 + Math.random() * 0.12; S.emit({x: F.x + rr(-0.1, 0.1), y: lit ? 0.8 : 0.2, z: F.z + rr(-0.1, 0.1), vy: rr(0.55, 0.9), life: rr(4, 6.5), s: 0.3, s1: lit ? 2.1 : 1.3, c: [g, g * 0.98, g * 0.96], a: lit ? 0.32 : 0.22, k: 3, kind: 3, rot: rnd() * TAU}); }
      em.ember += dt * (big ? 9 : lit ? 4 : coals ? 0.6 : 0);
      while (em.ember > 1) { em.ember--; S.emit({add: true, x: F.x + rr(-0.15, 0.15), y: 0.3, z: F.z + rr(-0.1, 0.1), vx: rr(-0.2, 0.2), vy: rr(0.8, 1.8), vz: rr(-0.2, 0.2), life: rr(1, 2.4), s: 0.05, c: [1, rr(0.45, 0.7), 0.15], a: 1, k: 2, kind: 0}); }
      if (st.rack && st.meat) { em.rack += dt * 1.2; while (em.rack > 1) { em.rack--; const c = T.sites.rack, p = W(c[0] + rr(-20, 20), c[1]); S.emit({x: p.x, y: 0.4, z: p.z, vy: 0.45, life: 4, s: 0.25, s1: 1.1, c: [0.6, 0.6, 0.58], a: 0.16, k: 3, kind: 3}); } }
    }
    // a shower of sparks, when wood goes on
    function stoke() { for (let i = 0; i < 26; i++) S.emit({add: true, x: F.x + rr(-0.1, 0.1), y: 0.35, z: F.z + rr(-0.1, 0.1), vx: rr(-1.2, 1.2), vy: rr(2, 4.5), vz: rr(-1, 1), life: rr(0.8, 1.6), s: 0.04, c: [1, 0.7, 0.25], a: 1, k: 5, kind: 0}); }
    return {root, set, update, stoke, state: st, fire: F};
  }
  root.makeCamp = makeCamp;
})(typeof window !== 'undefined' ? window : globalThis);
