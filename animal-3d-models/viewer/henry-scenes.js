// henry-scenes.js: the place Henry stands: the ranch pasture by day, at dusk or at night, drawn the way envoi's Colossus in
// the Meadow draws its meadow (henry-meadow.js), with straw round a pile of hay (Chris's photos), a barbed-wire fence and a
// few flies pestering him, filmed through envoi's own camera pass (cinema.js, copied from envoi-on-the-longest-night):
// depth of field, bloom, light shafts and a film grade. three.js r128 (global THREE). Defines makeHenryScene(renderer, opts).
//
// opts: { time: 'day' | 'dusk' | 'night', cartoon (true when the cartoon Henry stands in it: his moos come up in speech
//   bubbles, a pat on the head in a heart, his dreams in z's) }.
// Returns {scene, time, cartoon, sunDir, pathR, update(dt, t, henryPos, henry, camPos), render(camera, dt, focus),
//   puff(pos, kind), breath(pos, dir), bubble(text, pos), heart(pos), zzz(pos), ring(pos, strength), scatterFlies(), dispose()}.
(function (root) {
  'use strict';
  const PI = Math.PI, TAU = PI * 2;
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v), lerp = (a, b, t) => a + (b - a) * t;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const cvs = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  function rng(seed) { let s = seed || 1; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
  function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
  function noise2(x, y) { const ix = Math.floor(x), iy = Math.floor(y), u = x - ix, v = y - iy, a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1), su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v); return lerp(lerp(a, b, su), lerp(c, d, su), sv); }
  const fbm2 = (x, y) => noise2(x, y) * 0.55 + noise2(x * 2.1, y * 2.1) * 0.3 + noise2(x * 4.3, y * 4.3) * 0.15;

  // a soft round spot, for dust and glow
  function softDot(size, inner, rgb) {
    const c = cvs(size, size), g = c.getContext('2d'), r = size / 2, gr = g.createRadialGradient(r, r, r * inner, r, r, r);
    gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.fillRect(0, 0, size, size); return new THREE.CanvasTexture(c);
  }

  function makeHenryScene(renderer, opts) {
    opts = opts || {};
    const CARTOON = !!opts.cartoon;
    const scene = new THREE.Scene();
    const disposables = [];
    const track = o => { disposables.push(o); return o; };
    const pathR = 3.2;
    const sprites = [];   // puffs, bubbles, z's: {s: sprite, life, age, vel, ...}
    let flies = null;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.LinearEncoding; renderer.toneMapping = THREE.NoToneMapping;
    const L = hex => new THREE.Color(hex).convertSRGBToLinear();
    const meadow = root.makeHenryMeadow(renderer, scene, {time: opts.time, pathR});
    const sunDir = meadow.lightDir;
    const r = rng(11);
    // the hay pile in the middle, like the one in Chris's photos, and loose straw all round it
    {
      const st = cvs(512, 512), s2 = st.getContext('2d'), sh = cvs(512, 512), s3 = sh.getContext('2d');
      s2.fillStyle = '#b8995a'; s2.fillRect(0, 0, 512, 512); s3.fillStyle = '#707070'; s3.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 6000; i++) { const x = r() * 512, y = r() * 512, Lb = 10 + r() * 30, a = (r() - 0.5) * 1.6, c = ['#e3cb8e', '#9c7c45', '#c9ad6c', '#7d6538'][(r() * 4) | 0], hv = 120 + r() * 120; for (const ox of [-512, 0, 512]) for (const oy of [-512, 0, 512]) { s2.strokeStyle = c; s2.lineWidth = 1.5; s2.beginPath(); s2.moveTo(x + ox, y + oy); s2.lineTo(x + ox + Math.cos(a) * Lb, y + oy + Math.sin(a) * Lb); s2.stroke(); s3.strokeStyle = `rgb(${hv},${hv},${hv})`; s3.lineWidth = 2; s3.beginPath(); s3.moveTo(x + ox, y + oy); s3.lineTo(x + ox + Math.cos(a) * Lb, y + oy + Math.sin(a) * Lb); s3.stroke(); } }
      const sTex = track(new THREE.CanvasTexture(st)); sTex.encoding = THREE.sRGBEncoding; sTex.wrapS = sTex.wrapT = THREE.RepeatWrapping; sTex.repeat.set(3, 2);
      const snTex = track(new THREE.CanvasTexture(normalOf(sh, 3))); snTex.wrapS = snTex.wrapT = THREE.RepeatWrapping; snTex.repeat.set(3, 2);
      const pg = track(new THREE.SphereGeometry(1, 72, 36, 0, TAU, 0, PI / 2)); const p = pg.attributes.position, v = V3(0, 0, 0);
      for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = fbm2(v.x * 3 + 4, v.z * 3 + v.y * 2), k = 1 + (n - 0.5) * 0.35; p.setXYZ(i, v.x * 1.6 * k, Math.max(0, v.y * 0.85 * k - 0.04), v.z * 1.9 * k); }
      pg.computeVertexNormals();
      const pile = new THREE.Mesh(pg, track(new THREE.MeshStandardMaterial({map: sTex, normalMap: snTex, normalScale: new THREE.Vector2(1.2, 1.2), roughness: 0.95, envMapIntensity: 0.4, color: meadow.night ? 0x9e9a92 : 0xffffff}))); pile.castShadow = pile.receiveShadow = true; pile.rotation.y = 0.5; scene.add(pile);
      const straw = track(new THREE.BoxGeometry(0.004, 0.003, 0.2)), n = 2600, im = new THREE.InstancedMesh(straw, track(new THREE.MeshStandardMaterial({roughness: 0.9, envMapIntensity: 0.4})), n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
      for (let i = 0; i < n; i++) {
        const a = r() * TAU, d = 1.5 + Math.pow(r(), 1.6) * 5.5; e.set((r() - 0.5) * 0.3, r() * TAU, (r() - 0.5) * 0.3); q.setFromEuler(e);
        m4.compose(V3(Math.sin(a) * d * 1.1, 0.004 + r() * 0.012, Math.cos(a) * d), q, V3(1, 1, 0.6 + r() * 0.9)); im.setMatrixAt(i, m4); im.setColorAt(i, c.copy(L(['#e3cb8e', '#c9ad6c', '#b0935a'][(r() * 3) | 0])).lerp(L('#a8a49a'), meadow.night ? 0.45 : 0).multiplyScalar((0.8 + r() * 0.4) * (meadow.night ? 0.6 : 1)));
      }
      im.receiveShadow = true; scene.add(im);
    }
    // a barbed-wire fence line out past the trail, between Henry and the moon
    {
      const m4 = new THREE.Matrix4(), post = track(new THREE.CylinderGeometry(0.045, 0.06, 1.35, 6)), pm = track(new THREE.MeshStandardMaterial({color: L('#5a4a3c'), roughness: 1})), np = 28, pi = new THREE.InstancedMesh(post, pm, np);
      const wires = [], zAt = i => -24 + Math.sin(i * 0.7) * 0.15;
      for (let i = 0; i < np; i++) { const x = -40 + i * 3, z = zAt(i); m4.makeRotationZ((r() - 0.5) * 0.08).setPosition(x, 0.67, z); pi.setMatrixAt(i, m4); if (i) for (const y of [0.45, 0.75, 1.05, 1.3]) wires.push(x - 3, y - 0.02, zAt(i - 1), x, y - 0.02, z); }
      pi.castShadow = true; scene.add(pi);
      const wg = track(new THREE.BufferGeometry()); wg.setAttribute('position', new THREE.Float32BufferAttribute(wires, 3)); scene.add(new THREE.LineSegments(wg, track(new THREE.LineBasicMaterial({color: new THREE.Color(0.03, 0.025, 0.025)}))));
    }
    // a few flies pestering Henry
    {
      const nf = 5, fpos = new Float32Array(nf * 3), fgeo = track(new THREE.BufferGeometry()); fgeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
      const fm = track(new THREE.PointsMaterial({size: 0.016, color: new THREE.Color(0.01, 0.01, 0.01), transparent: true, opacity: 0.85, depthWrite: false}));
      const fp = new THREE.Points(fgeo, fm); fp.frustumCulled = false; scene.add(fp);
      flies = {geo: fgeo, pos: fpos, n: nf, scatter: 0, seed: Array.from({length: nf}, () => ({a: r() * TAU, b: r() * TAU, f: 1.5 + r() * 2, spot: r() < 0.6 ? 'rump' : 'head'}))};
    }
    // one film camera for the page, kept between scenes: dispose() frees its pictures, and it makes them again when next used
    const cinema = root.makeCinema ? (renderer.hmCinema || (renderer.hmCinema = root.makeCinema(renderer, {msaa: 4}))) : null;
    if (cinema) { cinema.set({exposure: meadow.exposure, bloom: meadow.bloom, bloomRadius: 1, rays: meadow.rays, grain: 0.03, vignette: meadow.vignette, split: 0.12, aperture: meadow.aperture, maxBlur: 9, saturation: 1.0, fringe: 0.0012}); cinema.sun(meadow.discDir); }

    // ---------- sprites: dust, breath, and for the cartoon, speech bubbles, z's and hearts ----------
    // (pictures painted on a canvas are in screen colours, so they are marked so for the film camera's linear light)
    const canvasTex = c => { const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; };
    const dustTex = track(softDot(64, 0.0, '255,255,255'));
    function textSprite(text, o) {
      o = o || {}; const c = cvs(512, 256), g = c.getContext('2d');
      g.font = `${o.weight || 800} ${o.size || 92}px "Trebuchet MS", ui-rounded, system-ui, sans-serif`; const w = Math.min(470, g.measureText(text).width + 70);
      if (o.bubble) {
        g.fillStyle = '#f4efe2'; g.strokeStyle = '#1d1b2c'; g.lineWidth = 10; const x0 = 256 - w / 2, y0 = 40, hh = 140, rr = 50;
        g.beginPath(); g.moveTo(x0 + rr, y0); g.arcTo(x0 + w, y0, x0 + w, y0 + hh, rr); g.arcTo(x0 + w, y0 + hh, x0, y0 + hh, rr); g.lineTo(220, y0 + hh); g.lineTo(190, y0 + hh + 46); g.lineTo(180, y0 + hh); g.arcTo(x0, y0 + hh, x0, y0, rr); g.arcTo(x0, y0, x0 + w, y0, rr); g.closePath(); g.fill(); g.stroke();
      }
      g.fillStyle = o.color || '#1d1b2c'; g.textAlign = 'center'; g.textBaseline = 'middle';
      if (o.outline) { g.lineWidth = 12; g.strokeStyle = o.outline; g.strokeText(text, 256, 128); }
      g.fillText(text, 256, o.bubble ? 112 : 128);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({map: canvasTex(c), transparent: true, depthWrite: false, fog: false})); s.renderOrder = 5; return s;
    }
    function heartSprite() { const c = cvs(128, 128), g = c.getContext('2d'); g.fillStyle = '#e5677a'; g.strokeStyle = '#1d1b2c'; g.lineWidth = 7; g.beginPath(); g.moveTo(64, 108); g.bezierCurveTo(10, 70, 14, 22, 44, 22); g.bezierCurveTo(56, 22, 62, 32, 64, 40); g.bezierCurveTo(66, 32, 72, 22, 84, 22); g.bezierCurveTo(114, 22, 118, 70, 64, 108); g.fill(); g.stroke(); g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.ellipse(44, 44, 9, 6, -0.6, 0, TAU); g.fill(); const s = new THREE.Sprite(new THREE.SpriteMaterial({map: canvasTex(c), transparent: true, depthWrite: false, fog: false})); s.renderOrder = 5; return s; }
    function addSprite(s, o) { scene.add(s); sprites.push(Object.assign({s, age: 0, life: 1, vel: V3(0, 0.3, 0), s0: 0.3, s1: 0.6, op: 1, pop: false, aspect: 1}, o)); }
    function puff(pos, kind) {
      for (let i = 0; i < 6; i++) {
        const m = new THREE.SpriteMaterial({map: dustTex, transparent: true, depthWrite: false, opacity: 0.5, color: meadow.dust});
        const s = new THREE.Sprite(m), a = Math.random() * TAU;
        s.position.copy(pos).add(V3(Math.cos(a) * 0.08, 0.05, Math.sin(a) * 0.08)); s.material.rotation = Math.random() * TAU;
        addSprite(s, {life: 1.4 + Math.random() * 0.6, vel: V3(Math.cos(a) * 0.35, 0.18 + Math.random() * 0.15, Math.sin(a) * 0.35), s0: 0.15, s1: 0.7 + Math.random() * 0.3, op: 0.45, drag: 1.2});
      }
    }
    function breath(pos, dir) {
      for (let i = 0; i < 4; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({map: dustTex, transparent: true, depthWrite: false, opacity: 0.18, color: new THREE.Color(0.9, 0.85, 0.85)})); s.position.copy(pos); addSprite(s, {life: 1.6, vel: dir.clone().multiplyScalar(0.35 + i * 0.08).add(V3(0, 0.08, 0)), s0: 0.06, s1: 0.5, op: 0.16, drag: 0.9, delay: i * 0.12}); }
    }
    function bubble(text, pos) { if (!CARTOON) return; const s = textSprite(text, {bubble: true, size: 80}); s.position.copy(pos); addSprite(s, {life: 1.9, vel: V3(0, 0.1, 0), s0: 0.2, s1: 0.62, aspect: 2, pop: true, op: 1, drag: 0, hold: true}); }
    function heart(pos) { if (!CARTOON) return; const s = heartSprite(); s.position.copy(pos); addSprite(s, {life: 1.3, vel: V3(0, 0.55, 0), s0: 0.1, s1: 0.32, pop: true, op: 1, drag: 0.5, hold: true}); }
    function zzz(pos) { if (!CARTOON) return; const s = textSprite('z', {size: 150, color: '#f4efe2', outline: '#1d1b2c'}); s.position.copy(pos); addSprite(s, {life: 2.4, vel: V3(0.12, 0.28, 0), s0: 0.08, s1: 0.3, op: 0.95, drag: 0, hold: true, wobble: true}); }

    // ---------- each frame ----------
    const tmp = V3(0, 0, 0);
    function update(dt, t, hp, henry, camPos) {
      meadow.update(dt, t, henry, camPos);
      for (let i = sprites.length - 1; i >= 0; i--) {
        const p = sprites[i]; if (p.delay > 0) { p.delay -= dt; p.s.visible = false; continue; } p.s.visible = true;
        p.age += dt; const u = p.age / p.life;
        if (u >= 1) { scene.remove(p.s); p.s.material.map && p.s.material.map !== dustTex && p.s.material.map.dispose(); p.s.material.dispose(); sprites.splice(i, 1); continue; }
        p.s.position.addScaledVector(p.vel, dt); p.vel.multiplyScalar(Math.max(0, 1 - (p.drag || 0) * dt));
        if (p.wobble) p.s.position.x += Math.sin(p.age * 4) * 0.004;
        const k = p.pop ? (u < 0.18 ? 1.25 * Math.sin(u / 0.18 * PI / 2) : lerp(1.25, 1, Math.min(1, (u - 0.18) / 0.12))) : u;
        const sc = p.hold ? p.s1 * k : lerp(p.s0, p.s1, 1 - Math.pow(1 - u, 2)); p.s.scale.set(sc * (p.aspect || 1), sc, 1);
        p.s.material.opacity = p.op * (p.hold ? Math.min(1, (1 - u) * 4) : Math.pow(1 - u, 1.5));
      }
      if (flies && henry) {
        flies.scatter = Math.max(0, flies.scatter - dt * 0.35);
        const R0 = henry.anchor('chest', tmp).clone(), head = henry.anchor('head', V3(0, 0, 0)), rump = R0.clone().lerp(henry.root.position.clone().setY(R0.y + 0.15), 0.4).addScaledVector(V3(Math.sin(henry.root.rotation.y), 0, Math.cos(henry.root.rotation.y)), -0.95);
        flies.seed.forEach((q, i) => { const c = q.spot === 'head' ? head : rump, rr = 0.18 + flies.scatter * 1.6; q.a += dt * q.f * 2.2; q.b += dt * q.f * 1.3; flies.pos[i * 3] = c.x + Math.sin(q.a) * rr; flies.pos[i * 3 + 1] = c.y + 0.12 + Math.sin(q.b) * rr * 0.5 + flies.scatter * 0.6; flies.pos[i * 3 + 2] = c.z + Math.cos(q.a * 1.3) * rr; });
        flies.geo.attributes.position.needsUpdate = true;
      }
    }
    function render(camera, dt, focus) {
      if (cinema) { cinema.set({focus: Math.max(0.5, focus || 5)}); cinema.render(scene, camera, dt); }
      else { renderer.setRenderTarget(null); renderer.render(scene, camera); }
    }
    function dispose() {
      for (const p of sprites) { scene.remove(p.s); if (p.s.material.map && p.s.material.map !== dustTex) p.s.material.map.dispose(); p.s.material.dispose(); }
      for (const d of disposables) if (d && d.dispose) d.dispose();
      if (cinema && cinema.dispose) cinema.dispose();
      meadow.dispose();
      scene.traverse(o => { if (o.geometry && o.geometry.dispose) o.geometry.dispose(); });
    }
    // a push through the grass and the mist, from a landing or a thump
    function ring(pos, s) { meadow.ring(pos.x, pos.z, s); }
    return {scene, time: meadow.time, cartoon: CARTOON, sunDir, pathR, update, render, puff, breath, bubble, heart, zzz, ring, scatterFlies() { if (flies) flies.scatter = 1; }, dispose, get cinema() { return cinema; }, get meadow() { return meadow; }};
  }

  function normalOf(src, k) {
    const W = src.width, H = src.height, s = src.getContext('2d').getImageData(0, 0, W, H).data, h = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) h[i] = s[i * 4] / 255;
    const c = cvs(W, H), g = c.getContext('2d'), img = g.createImageData(W, H), d = img.data, at = (x, y) => h[((y + H) % H) * W + (x + W) % W];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const dx = at(x + 1, y) - at(x - 1, y), dy = at(x, y + 1) - at(x, y - 1), nx = -dx * k, ny = dy * k, l = Math.hypot(nx, ny, 1), i = (y * W + x) * 4; d[i] = (nx / l * 0.5 + 0.5) * 255; d[i + 1] = (ny / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255; }
    g.putImageData(img, 0, 0); return c;
  }
  root.makeHenryScene = makeHenryScene;
})(typeof window !== 'undefined' ? window : globalThis);
