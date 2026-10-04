// henry-scenes.js: the two places Henry stands, one for each look. three.js r128 (global THREE); the envoi look renders
// through cinema.js (envoi's own camera pass, copied from envoi-on-the-longest-night) and its pasture comes from
// henry-meadow.js. Defines makeHenryScene(renderer, style, opts).
//
//   storybook: a round piece of meadow cut out like a page of a storybook, in What the Map Forgot's 3D look (wren-3d):
//     painted grass with a worn cow trail round a water trough, a wooden fence, a round bale, lumpy trees and clouds,
//     cel-shaded with ink outlines, under a warm day sun. Dust comes up as little ink-lined puffs; Henry's moos come
//     up in speech bubbles, his dreams as z's, and a pat on the head as a heart.
//   envoi: the pasture at night under a big moon (or at dusk), drawn the way envoi's Colossus in the Meadow draws its
//     meadow (henry-meadow.js): grass that bends in the gusts and catches the moon from behind, painted trees round the
//     pasture with moonlit rims, mist, fireflies, stars and clouds; straw round a pile of hay (Chris's photos), a
//     barbed-wire fence and a few flies pestering Henry; then envoi's film camera: bloom, moonlight shafts, a film grade.
//
// makeHenryScene(renderer, style, opts) (opts.time: 'night' or 'dusk', for envoi) returns {scene, style, time, sunDir, pathR,
//   update(dt, t, henryPos, henry, camPos), render(camera, dt, focus), puff(pos, kind), breath(pos, dir), bubble(text, pos),
//   heart(pos), zzz(pos), ring(pos, strength), scatterFlies(), dispose()}.
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

  function makeHenryScene(renderer, style, opts) {
    opts = opts || {};
    const SB = style === 'storybook';
    const scene = new THREE.Scene();
    const disposables = [];
    const track = o => { disposables.push(o); return o; };
    const pathR = 3.2;
    const sprites = [];   // puffs, bubbles, z's: {s: sprite, life, age, vel, ...}
    const blockers = [];  // things that pop down out of the way when they come between the camera and Henry
    let cinema = null, sun = null, sunDir = null, flies = null, meadow = null;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    if (SB) {
      // ================= the storybook =================
      renderer.outputEncoding = THREE.LinearEncoding; renderer.toneMapping = THREE.NoToneMapping;
      const INK = 0x1d1b2c;
      const ramp = (() => { const t = new THREE.DataTexture(new Uint8Array([120, 120, 120, 255, 192, 192, 192, 255, 240, 240, 240, 255]), 3, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
      const toon = o => track(new THREE.MeshToonMaterial(Object.assign({gradientMap: ramp}, o)));
      const inkBack = track(new THREE.MeshBasicMaterial({color: INK, side: THREE.BackSide}));
      // an ink outline: the same shape a little bigger, inside out
      const inked = (mesh, k) => { const o = new THREE.Mesh(mesh.geometry, inkBack); o.scale.setScalar(1 + (k || 0.06)); mesh.add(o); return mesh; };
      // the sky: a soft wash from blue to the paper colour
      { const c = cvs(4, 256), g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#a9cbd9'); gr.addColorStop(0.55, '#d6e3dd'); gr.addColorStop(1, '#f1ead8'); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); scene.background = track(new THREE.CanvasTexture(c)); }
      scene.fog = new THREE.Fog(0xe9e6d6, 16, 34);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x9a8f80, 0.72));
      sun = new THREE.DirectionalLight(0xfff4e0, 0.62); sunDir = V3(0.45, 0.8, 0.4).normalize();
      sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, {left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 40}); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02; sun.shadow.radius = 2;
      scene.add(sun); scene.add(sun.target);

      // ---- the ground: one painted page of meadow, with the cow trail worn into it ----
      const RI = 7, PX = 1024, k = PX / (RI * 2);
      const top = cvs(PX, PX), g = top.getContext('2d'), r = rng(3);
      g.fillStyle = '#86ad55'; g.fillRect(0, 0, PX, PX);
      for (let i = 0; i < 300; i++) { const x = r() * PX, y = r() * PX, rr = 20 + r() * 70, gr = g.createRadialGradient(x, y, 0, x, y, rr); const c = r() < 0.5 ? '125,166,79' : '146,185,97'; gr.addColorStop(0, `rgba(${c},0.55)`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
      // the trail: bare, packed earth where the cattle walk round and round
      const cx = PX / 2, cy = PX / 2, trail = (x, y) => { const d = Math.hypot(x - cx, y - cy) / k; return Math.exp(-((d - pathR) ** 2) / (0.28 ** 2)); };
      const img = g.getImageData(0, 0, PX, PX), D = img.data;
      for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) {
        const i = (y * PX + x) * 4, d = Math.hypot(x - cx, y - cy) / k, n = fbm2(x * 0.03, y * 0.03);
        let t = Math.exp(-((d - pathR) ** 2) / (0.3 ** 2)) * 1.25 - (n - 0.5) * 0.9; t = cl((t - 0.45) * 3, 0, 1);
        const worn = cl(Math.exp(-(d * d) / (1.6 ** 2)) * 1.3 - (n - 0.5) * 0.8 - 0.35, 0, 1) * 0.8;   // trampled round the trough
        const e = Math.max(t, worn);
        if (e > 0) { const lt = 0.92 + 0.16 * n; D[i] = lerp(D[i], 201 * lt, e); D[i + 1] = lerp(D[i + 1], 162 * lt, e); D[i + 2] = lerp(D[i + 2], 107 * lt, e); }
        const rim = cl((d - (RI - 0.35)) / 0.35, 0, 1); D[i] *= 1 - rim * 0.25; D[i + 1] *= 1 - rim * 0.2; D[i + 2] *= 1 - rim * 0.25;
      }
      g.putImageData(img, 0, 0);
      // blades of grass, and pebbles on the trail
      for (let i = 0; i < 9000; i++) {
        const x = r() * PX, y = r() * PX; if (trail(x, y) > 0.55 && r() < 0.85) continue;
        const L = 5 + r() * 8, a = (r() - 0.5) * 0.8, c = ['#6c9a45', '#9cc06a', '#5e8a3d', '#7aa64f'][(r() * 4) | 0];
        g.strokeStyle = c; g.globalAlpha = 0.6; g.lineWidth = 1.6 + r(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.sin(a) * L, y - Math.cos(a) * L); g.stroke();
      }
      g.globalAlpha = 1;
      for (let i = 0; i < 500; i++) { const a = r() * TAU, d = (pathR + (r() - 0.5) * 0.6) * k; g.fillStyle = r() < 0.5 ? '#b08a5a' : '#e0c79a'; g.beginPath(); g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1.5 + r() * 2.5, 0, TAU); g.fill(); }
      for (let i = 0; i < 140; i++) { const x = r() * PX, y = r() * PX; if (trail(x, y) > 0.3 || Math.hypot(x - cx, y - cy) / k > RI - 0.4) continue; g.fillStyle = ['#e8b248', '#f4efe2', '#e58f99', '#8e7ab5'][(r() * 4) | 0]; for (let p = 0; p < 5; p++) { const pa = p / 5 * TAU; g.beginPath(); g.arc(x + Math.cos(pa) * 3.5, y + Math.sin(pa) * 3.5, 2.6, 0, TAU); g.fill(); } g.fillStyle = '#e8b248'; g.beginPath(); g.arc(x, y, 2, 0, TAU); g.fill(); }
      const topTex = track(new THREE.CanvasTexture(top)); topTex.anisotropy = 8;
      const disc = new THREE.Mesh(track(new THREE.CircleGeometry(RI, 128)), toon({map: topTex})); disc.rotation.x = -PI / 2; disc.receiveShadow = true; scene.add(disc);
      // the cut edge of the page: layers of earth, ink along both rims
      const side = cvs(512, 64), sg = side.getContext('2d'); sg.fillStyle = '#9c6c44'; sg.fillRect(0, 0, 512, 64);
      for (let y = 0; y < 64; y += 6 + r() * 8) { sg.fillStyle = r() < 0.5 ? '#8a5c38' : '#b08058'; sg.fillRect(0, y, 512, 2 + r() * 4); }
      for (let i = 0; i < 160; i++) { sg.fillStyle = r() < 0.5 ? '#7a5237' : '#c49a6c'; sg.beginPath(); sg.arc(r() * 512, 8 + r() * 56, 1 + r() * 2.5, 0, TAU); sg.fill(); }
      sg.fillStyle = '#5e8a3d'; sg.fillRect(0, 0, 512, 5);
      const sideTex = track(new THREE.CanvasTexture(side)); sideTex.wrapS = THREE.RepeatWrapping; sideTex.repeat.set(8, 1);
      const edge = new THREE.Mesh(track(new THREE.CylinderGeometry(RI, RI * 0.94, 0.7, 128, 1, true)), toon({map: sideTex})); edge.position.y = -0.35; scene.add(edge);
      for (const [y, rr] of [[0.004, RI], [-0.7, RI * 0.94]]) { const ring = new THREE.Mesh(track(new THREE.TorusGeometry(rr, 0.028, 6, 160)), track(new THREE.MeshBasicMaterial({color: INK}))); ring.rotation.x = PI / 2; ring.position.y = y; scene.add(ring); }

      // ---- tufts of long grass and flowers, standing up off the page ----
      {
        const tuft = new THREE.ConeGeometry(0.035, 0.26, 5); tuft.translate(0, 0.13, 0);
        const parts = []; for (let i = 0; i < 4; i++) { const g2 = tuft.clone(); g2.rotateZ((i - 1.5) * 0.28); g2.rotateY(i * 1.7); g2.translate((i - 1.5) * 0.03, 0, (i % 2) * 0.03); parts.push(g2); }
        const geo = track(mergeGeos(parts)), n = 240, im = new THREE.InstancedMesh(geo, toon({color: 0xffffff}), n), m4 = new THREE.Matrix4(), c = new THREE.Color();
        let j = 0;
        for (let i = 0; i < 2000 && j < n; i++) {
          const a = r() * TAU, d = Math.sqrt(r()) * (RI - 0.3), x = Math.sin(a) * d, z = Math.cos(a) * d;
          if (Math.abs(d - pathR) < 0.65 || d < 1.4) continue;
          const s = 0.8 + r() * 0.8; m4.makeRotationY(r() * TAU).scale(V3(s, s * (0.8 + r() * 0.5), s)).setPosition(x, 0, z); im.setMatrixAt(j, m4);
          im.setColorAt(j, c.set(['#6c9a45', '#7fae50', '#5e8a3d'][(r() * 3) | 0])); j++;
        }
        im.count = j; im.castShadow = true; scene.add(im);
      }
      // ---- the water trough in the middle of the trail ----
      {
        const tr = new THREE.Group();
        const tank = new THREE.Mesh(track(new THREE.CylinderGeometry(0.95, 0.95, 0.6, 40, 1, true)), toon({color: 0xa7b6bd, side: THREE.DoubleSide})); tank.position.y = 0.3; tr.add(tank);
        const rim = new THREE.Mesh(track(new THREE.TorusGeometry(0.95, 0.045, 8, 48)), toon({color: 0x8d9ca3})); rim.rotation.x = PI / 2; rim.position.y = 0.6; tr.add(rim);
        const water = new THREE.Mesh(track(new THREE.CircleGeometry(0.93, 40)), toon({color: 0x6fa7c0})); water.rotation.x = -PI / 2; water.position.y = 0.48; tr.add(water);
        const glint = new THREE.Mesh(track(new THREE.RingGeometry(0.35, 0.42, 32, 1, 0.4, 1.4)), track(new THREE.MeshBasicMaterial({color: 0xffffff}))); glint.rotation.x = -PI / 2; glint.position.y = 0.485; tr.add(glint);
        const inkRing = new THREE.Mesh(track(new THREE.TorusGeometry(0.99, 0.022, 6, 64)), track(new THREE.MeshBasicMaterial({color: INK}))); inkRing.rotation.x = PI / 2; inkRing.position.y = 0.62; tr.add(inkRing);
        const inkBase = inkRing.clone(); inkBase.position.y = 0.01; tr.add(inkBase);
        for (const a of [0, PI / 2, PI, PI * 1.5]) { const sideLine = new THREE.Mesh(track(new THREE.BoxGeometry(0.03, 0.6, 0.03)), track(new THREE.MeshBasicMaterial({color: INK}))); sideLine.position.set(Math.sin(a + 0.6) * 0.97, 0.3, Math.cos(a + 0.6) * 0.97); tr.add(sideLine); }
        tr.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        scene.add(tr);
      }
      // ---- a round bale, a fence, trees and clouds ----
      {
        const st = cvs(256, 128), s2 = st.getContext('2d'); s2.fillStyle = '#e8b248'; s2.fillRect(0, 0, 256, 128);
        for (let i = 0; i < 900; i++) { s2.strokeStyle = r() < 0.5 ? '#c9922e' : '#f3cf72'; s2.lineWidth = 1.5; const x = r() * 256, y = r() * 128; s2.beginPath(); s2.moveTo(x, y); s2.lineTo(x + 10 + r() * 14, y + (r() - 0.5) * 4); s2.stroke(); }
        const sTex = track(new THREE.CanvasTexture(st)); sTex.wrapS = sTex.wrapT = THREE.RepeatWrapping; sTex.repeat.set(3, 1);
        const cap = cvs(128, 128), c2 = cap.getContext('2d'); c2.fillStyle = '#e1aa42'; c2.fillRect(0, 0, 128, 128); c2.strokeStyle = '#b8862c'; c2.lineWidth = 3; c2.beginPath(); for (let a = 0; a < 16 * PI; a += 0.1) { const rr = a * 1.2; c2.lineTo(64 + Math.cos(a) * rr, 64 + Math.sin(a) * rr); } c2.stroke();
        const bale = new THREE.Mesh(track(new THREE.CylinderGeometry(0.6, 0.6, 1.05, 40)), [toon({map: sTex}), toon({map: track(new THREE.CanvasTexture(cap))}), toon({map: track(new THREE.CanvasTexture(cap))})]);
        bale.rotation.set(0, 0.6, PI / 2); bale.position.set(-4.7, 0.6, -2.4); bale.castShadow = bale.receiveShadow = true; inked(bale, 0.045); scene.add(bale); { const g2 = new THREE.Group(); g2.position.copy(bale.position).setY(0); bale.position.set(0, 0.6, 0); g2.add(bale); scene.add(g2); blockers.push({o: g2, r: 0.8, h: 1.2, k: 1, v: 0}); }
        const wood = toon({color: 0x9c6c44}), rail = toon({color: 0xb07d4f});
        const postG = track(new THREE.BoxGeometry(0.13, 0.95, 0.13)), railG = track(new THREE.BoxGeometry(0.08, 0.1, 1)), RF = RI - 0.6;
        let prev = null;
        for (let a = 2.25; a <= 4.05; a += 0.16) {
          const x = Math.sin(a) * RF, z = Math.cos(a) * RF, post = new THREE.Mesh(postG, wood); post.position.set(x, 0.47, z); post.rotation.y = a + (r() - 0.5) * 0.1; post.rotation.z = (r() - 0.5) * 0.06; post.castShadow = true; inked(post, 0.09); scene.add(post); blockers.push({o: post, r: 0.5, h: 1, k: 1, v: 0, sy: true});
          if (prev) for (const y of [0.38, 0.75]) { const m = new THREE.Mesh(railG, rail), L = Math.hypot(x - prev.x, z - prev.z); m.scale.z = L; m.position.set((x + prev.x) / 2, y, (z + prev.z) / 2); m.rotation.y = Math.atan2(x - prev.x, z - prev.z); m.castShadow = true; const ink = new THREE.Mesh(railG, inkBack); ink.scale.set(1.35, 1.35, 1.0); m.add(ink); scene.add(m); blockers.push({o: m, r: 0.45, h: 1, k: 1, v: 0, rail: true}); }
          prev = {x, z};
        }
        // lumpy trees, as wren-3d draws them: a trunk and a few round blobs of leaves
        const leafA = toon({color: 0x5d8a3d}), leafB = toon({color: 0x6f9a4a}), bark = toon({color: 0x7a5237});
        for (const [x, z, s] of [[-3.8, -5.3, 1.1], [4.6, -4.6, 0.95], [5.6, 2.2, 0.8]]) {
          const tree = new THREE.Group(); tree.position.set(x, 0, z); tree.scale.setScalar(s);
          const trunk = new THREE.Mesh(track(new THREE.CylinderGeometry(0.12, 0.2, 1.3, 10)), bark); trunk.position.y = 0.65; inked(trunk, 0.08); tree.add(trunk);
          for (let i = 0; i < 5; i++) {
            const bg = track(new THREE.IcosahedronGeometry(0.55 + r() * 0.25, 2)); const p = bg.attributes.position, v = V3(0, 0, 0);
            for (let q = 0; q < p.count; q++) { v.fromBufferAttribute(p, q); v.multiplyScalar(1 + 0.08 * Math.sin(v.x * 9 + i) * Math.cos(v.y * 7)); p.setXYZ(q, v.x, v.y, v.z); } bg.computeVertexNormals();
            const b = new THREE.Mesh(bg, i % 2 ? leafA : leafB), a = i / 5 * TAU; b.position.set(i ? Math.sin(a) * 0.5 : 0, 1.6 + (i ? (r() - 0.3) * 0.4 : 0.45), i ? Math.cos(a) * 0.5 : 0); b.castShadow = true; inked(b, 0.05); tree.add(b);
          }
          scene.add(tree); blockers.push({o: tree, r: 1.1 * s, h: 2.4 * s, k: 1, v: 0});
        }
        const cloudM = toon({color: 0xffffff, fog: false});
        for (const [x, y, z, s] of [[-14, 9, -22, 1.4], [9, 11, -26, 1.8], [20, 8, -10, 1.2], [-22, 10, 6, 1.5]]) {
          const cg = new THREE.Group(); cg.position.set(x, y, z); cg.scale.setScalar(s);
          for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(track(new THREE.SphereGeometry(1 + (i % 2) * 0.4, 16, 12)), cloudM); b.position.set((i - 1.5) * 1.2, (i % 2) * 0.4, 0); b.scale.y = 0.75; inked(b, 0.05); cg.add(b); }
          cg.lookAt(0, y, 0); scene.add(cg);
        }
      }
    } else {
      // ================= envoi: the pasture at night (or at dusk), drawn as envoi's Colossus in the Meadow draws its meadow =================
      renderer.outputEncoding = THREE.LinearEncoding; renderer.toneMapping = THREE.NoToneMapping;
      const L = hex => new THREE.Color(hex).convertSRGBToLinear();
      meadow = root.makeHenryMeadow(renderer, scene, {time: opts.time, pathR});
      sunDir = meadow.lightDir;
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
      cinema = root.makeCinema ? (renderer.hmCinema || (renderer.hmCinema = root.makeCinema(renderer, {msaa: 4}))) : null;
      if (cinema) { cinema.set({exposure: meadow.exposure, bloom: meadow.bloom, bloomRadius: 1, rays: meadow.rays, grain: 0.03, vignette: meadow.vignette, split: 0.12, aperture: meadow.aperture, maxBlur: 9, saturation: 1.0, fringe: 0.0012}); cinema.sun(meadow.discDir); }
    }

    // ---------- sprites: dust, breath, speech bubbles, z's and hearts ----------
    const dustTex = track(SB ? inkPuff() : softDot(64, 0.0, '255,255,255'));
    function inkPuff() { const c = cvs(128, 128), g = c.getContext('2d'); g.fillStyle = '#f4efe2'; g.strokeStyle = '#1d1b2c'; g.lineWidth = 7; for (const [x, y, rr] of [[64, 70, 34], [40, 76, 24], [88, 78, 24], [64, 50, 26]]) { g.beginPath(); g.arc(x, y, rr, 0, TAU); g.stroke(); } for (const [x, y, rr] of [[64, 70, 34], [40, 76, 24], [88, 78, 24], [64, 50, 26]]) { g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill(); } return new THREE.CanvasTexture(c); }
    function textSprite(text, o) {
      o = o || {}; const c = cvs(512, 256), g = c.getContext('2d');
      g.font = `${o.weight || 800} ${o.size || 92}px "Trebuchet MS", ui-rounded, system-ui, sans-serif`; const w = Math.min(470, g.measureText(text).width + 70);
      if (o.bubble) {
        g.fillStyle = '#f4efe2'; g.strokeStyle = '#1d1b2c'; g.lineWidth = 10; const x0 = 256 - w / 2, y0 = 40, hh = 140, rr = 50;
        g.beginPath(); g.moveTo(x0 + rr, y0); g.arcTo(x0 + w, y0, x0 + w, y0 + hh, rr); g.arcTo(x0 + w, y0 + hh, x0, y0 + hh, rr); g.lineTo(220, y0 + hh); g.lineTo(190, y0 + hh + 46); g.lineTo(180, y0 + hh); g.arcTo(x0, y0 + hh, x0, y0, rr); g.arcTo(x0, y0, x0 + w, y0, rr); g.closePath(); g.fill(); g.stroke();
      }
      g.fillStyle = o.color || '#1d1b2c'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, o.bubble ? 112 : 128);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, fog: false})); s.renderOrder = 5; return s;
    }
    function heartSprite() { const c = cvs(128, 128), g = c.getContext('2d'); g.fillStyle = '#e5677a'; g.strokeStyle = '#1d1b2c'; g.lineWidth = 7; g.beginPath(); g.moveTo(64, 108); g.bezierCurveTo(10, 70, 14, 22, 44, 22); g.bezierCurveTo(56, 22, 62, 32, 64, 40); g.bezierCurveTo(66, 32, 72, 22, 84, 22); g.bezierCurveTo(114, 22, 118, 70, 64, 108); g.fill(); g.stroke(); g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.ellipse(44, 44, 9, 6, -0.6, 0, TAU); g.fill(); const s = new THREE.Sprite(new THREE.SpriteMaterial({map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, fog: false})); s.renderOrder = 5; return s; }
    function addSprite(s, o) { scene.add(s); sprites.push(Object.assign({s, age: 0, life: 1, vel: V3(0, 0.3, 0), s0: 0.3, s1: 0.6, op: 1, pop: false, aspect: 1}, o)); }
    function puff(pos, kind) {
      const n = SB ? 3 : 6;
      for (let i = 0; i < n; i++) {
        const m = new THREE.SpriteMaterial({map: dustTex, transparent: true, depthWrite: false, opacity: SB ? 1 : 0.5, color: SB ? 0xffffff : meadow.dust});
        const s = new THREE.Sprite(m), a = Math.random() * TAU;
        s.position.copy(pos).add(V3(Math.cos(a) * 0.08, 0.05, Math.sin(a) * 0.08)); s.material.rotation = Math.random() * TAU;
        addSprite(s, {life: SB ? 0.55 : 1.4 + Math.random() * 0.6, vel: V3(Math.cos(a) * (SB ? 0.5 : 0.35), SB ? 0.5 : 0.18 + Math.random() * 0.15, Math.sin(a) * (SB ? 0.5 : 0.35)), s0: SB ? 0.12 : 0.15, s1: SB ? 0.38 : 0.7 + Math.random() * 0.3, op: SB ? 1 : 0.45, pop: SB, drag: SB ? 3 : 1.2});
      }
    }
    function breath(pos, dir) {
      if (SB) return;
      for (let i = 0; i < 4; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({map: dustTex, transparent: true, depthWrite: false, opacity: 0.18, color: new THREE.Color(0.9, 0.85, 0.85)})); s.position.copy(pos); addSprite(s, {life: 1.6, vel: dir.clone().multiplyScalar(0.35 + i * 0.08).add(V3(0, 0.08, 0)), s0: 0.06, s1: 0.5, op: 0.16, drag: 0.9, delay: i * 0.12}); }
    }
    function bubble(text, pos) { if (!SB) return; const s = textSprite(text, {bubble: true, size: 80}); s.position.copy(pos); addSprite(s, {life: 1.9, vel: V3(0, 0.1, 0), s0: 0.2, s1: 0.62, aspect: 2, pop: true, op: 1, drag: 0, hold: true}); }
    function heart(pos) { if (!SB) return; const s = heartSprite(); s.position.copy(pos); addSprite(s, {life: 1.3, vel: V3(0, 0.55, 0), s0: 0.1, s1: 0.32, pop: true, op: 1, drag: 0.5, hold: true}); }
    function zzz(pos) { if (!SB) return; const s = textSprite('z', {size: 150}); s.position.copy(pos); addSprite(s, {life: 2.4, vel: V3(0.12, 0.28, 0), s0: 0.08, s1: 0.3, op: 0.95, drag: 0, hold: true, wobble: true}); }

    // ---------- each frame ----------
    const tmp = V3(0, 0, 0);
    const segP = V3(0, 0, 0);
    function update(dt, t, hp, henry, camPos) {
      // anything standing between the camera and Henry, or right by the camera, ducks down out of the way
      if (camPos) for (const b of blockers) {
        if (b.y0 == null) { b.y0 = b.o.position.y; b.sy0 = b.o.scale.y; b.sx0 = b.o.scale.x; }
        const p = b.o.position, ax = camPos.x, az = camPos.z, dx = hp.x - ax, dz = hp.z - az, L2 = dx * dx + dz * dz || 1, u = cl(((p.x - ax) * dx + (p.z - az) * dz) / L2, 0, 1);
        const d = Math.hypot(ax + dx * u - p.x, az + dz * u - p.z), inWay = (d < b.r + 0.35 && u > 0.02 && u < 0.92) || Math.hypot(p.x - ax, p.z - az) < b.r + 0.6;
        const goal = inWay ? 0 : 1; b.v += ((goal - b.k) * 90 - b.v * 11) * Math.min(dt, 0.05); b.k = cl(b.k + b.v * Math.min(dt, 0.05), 0, 1.15);
        const k = Math.max(0.001, b.k); b.o.visible = k > 0.02;
        if (b.rail) b.o.scale.y = k; else { b.o.scale.y = b.sy0 * k; b.o.scale.x = b.sx0 * (0.6 + 0.4 * k); b.o.scale.z = b.sx0 * (0.6 + 0.4 * k); }
        if (b.sy) b.o.position.y = b.y0 * k;
      }
      if (sun) { sun.target.position.copy(hp); sun.position.copy(hp).addScaledVector(sunDir, 12); }
      if (meadow) meadow.update(dt, t, henry, camPos);
      for (let i = sprites.length - 1; i >= 0; i--) {
        const p = sprites[i]; if (p.delay > 0) { p.delay -= dt; p.s.visible = false; continue; } p.s.visible = true;
        p.age += dt; const u = p.age / p.life;
        if (u >= 1) { scene.remove(p.s); p.s.material.map && p.s.material.map !== dustTex && p.s.material.map.dispose(); p.s.material.dispose(); sprites.splice(i, 1); continue; }
        p.s.position.addScaledVector(p.vel, dt); p.vel.multiplyScalar(Math.max(0, 1 - (p.drag || 0) * dt));
        if (p.wobble) p.s.position.x += Math.sin(p.age * 4) * 0.004;
        let k = p.pop ? (u < 0.18 ? 1.25 * Math.sin(u / 0.18 * PI / 2) : lerp(1.25, 1, Math.min(1, (u - 0.18) / 0.12))) : u;
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
      for (const p of sprites) { scene.remove(p.s); p.s.material.dispose(); }
      for (const d of disposables) if (d && d.dispose) d.dispose();
      if (cinema && cinema.dispose) cinema.dispose();
      if (meadow) meadow.dispose();
      if (sun && sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
      scene.traverse(o => { if (o.geometry && o.geometry.dispose) o.geometry.dispose(); });
    }
    // a push through the grass and the mist, from a landing or a thump
    function ring(pos, s) { if (meadow) meadow.ring(pos.x, pos.z, s); }
    return {scene, style, time: meadow ? meadow.time : null, sunDir, pathR, update, render, puff, breath, bubble, heart, zzz, ring, scatterFlies() { if (flies) flies.scatter = 1; }, dispose, get cinema() { return cinema; }, get meadow() { return meadow; }};
  }

  // join geometries that share the same attributes into one
  function mergeGeos(list) {
    list = list.map(g => g.index ? g.toNonIndexed() : g);
    const keys = ['position', 'normal', 'color', 'uv'].filter(k => list.every(g => g.attributes[k]));
    const out = new THREE.BufferGeometry();
    for (const k of keys) { const n = list.reduce((s, g) => s + g.attributes[k].array.length, 0), arr = new Float32Array(n); let o = 0; for (const g of list) { arr.set(g.attributes[k].array, o); o += g.attributes[k].array.length; } out.setAttribute(k, new THREE.BufferAttribute(arr, list[0].attributes[k].itemSize)); }
    if (!out.attributes.normal) out.computeVertexNormals();
    return out;
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
