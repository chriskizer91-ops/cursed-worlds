// henry.js: Henry in three looks on one page: full detail (zebu-hd.js), the storybook look of What the Map Forgot, and
// the ranch game's cartoon (both zebu.js). Drag to walk round him, pinch or scroll to come closer, and make him stand,
// walk, eat or lie down. window.HENRY is the handle for the checks.
(function () {
  'use strict';
  const $ = id => document.getElementById(id), PI = Math.PI, cl = (v, a, b) => (v < a ? a : v > b ? b : v);
  const canvas = $('view');
  const renderer = new THREE.WebGLRenderer({canvas, antialias: true});
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 100);
  const view = {yaw: 0.75, pitch: 0.16, dist: 4.6, aim: new THREE.Vector3(0, 0.72, 0.1), face: false};
  let scene = null, cow = null, ground = null, look = 'hd', act = 'stand', walking = false, clock = 0;
  const ABOUT = {
    hd: 'Full detail: one skin over a skeleton, hair in the coat, about <b>%t</b> triangles.',
    storybook: 'Storybook: the look of What the Map Forgot, <b>%t</b> triangles.',
    game: 'Ranch game: the herd as it walks the ranch map, <b>%t</b> triangles.'
  };

  // the ground: a painted patch of pasture that slides under him when he walks
  function groundTexture(kind) {
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
    const base = kind === 'hd' ? '#8c8458' : kind === 'storybook' ? '#d8cba8' : '#d6cdb9';
    g.fillStyle = base; g.fillRect(0, 0, 512, 512);
    let s = 3; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < (kind === 'hd' ? 9000 : 500); i++) {
      const x = r() * 512, y = r() * 512;
      if (kind === 'hd') { const v = r(); g.strokeStyle = v < 0.5 ? `rgba(${70 + r() * 40},${90 + r() * 40},${40 + r() * 20},0.7)` : `rgba(${150 + r() * 50},${135 + r() * 40},${90 + r() * 30},0.6)`; g.lineWidth = 1 + r(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y - 4 - r() * 8); g.stroke(); }
      else { g.fillStyle = kind === 'storybook' ? 'rgba(160,145,110,0.35)' : 'rgba(170,160,140,0.3)'; g.beginPath(); g.arc(x, y, 2 + r() * 5, 0, PI * 2); g.fill(); }
    }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 10); t.anisotropy = 8; if (kind === 'hd') t.encoding = THREE.sRGBEncoding; return t;
  }
  function build(kind) {
    $('busy').hidden = false;
    setTimeout(() => {
      if (scene) scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      scene = new THREE.Scene();
      if (kind === 'hd') {
        renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.85;
        renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        // a sky for the coat, the horn and the eyes to reflect
        const sky = new THREE.Scene(), sg = new THREE.SphereGeometry(10, 32, 16), cols = [], top = new THREE.Color(0x6f9fd8).convertSRGBToLinear(), hor = new THREE.Color(0xe8ecef).convertSRGBToLinear(), gr = new THREE.Color(0x6d6a52).convertSRGBToLinear();
        for (let i = 0; i < sg.attributes.position.count; i++) { const y = sg.attributes.position.getY(i) / 10, c = y > 0 ? hor.clone().lerp(top, Math.pow(y, 0.6)) : hor.clone().lerp(gr, Math.min(1, -y * 4)); cols.push(c.r, c.g, c.b); }
        sg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); sky.add(new THREE.Mesh(sg, new THREE.MeshBasicMaterial({vertexColors: true, side: THREE.BackSide})));
        const disc = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 8), new THREE.MeshBasicMaterial({color: new THREE.Color(14, 13, 11)})); disc.position.set(4, 6, 5); sky.add(disc);
        const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(sky, 0.02).texture; pm.dispose();
        scene.background = new THREE.Color(0xc9d6df).convertSRGBToLinear(); scene.fog = new THREE.Fog(scene.background, 8, 22);
        scene.add(new THREE.HemisphereLight(new THREE.Color(0xbcd4ff).convertSRGBToLinear(), new THREE.Color(0x5a5236).convertSRGBToLinear(), 0.25));
        const sun = new THREE.DirectionalLight(new THREE.Color(0xfff0dc).convertSRGBToLinear(), 2.3); sun.position.set(3, 5, 4); sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, {left: -2, right: 2, top: 2, bottom: -2}); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; scene.add(sun);
        const rim = new THREE.DirectionalLight(new THREE.Color(0xc8dcff).convertSRGBToLinear(), 0.6); rim.position.set(-3, 2.5, -4); scene.add(rim);
        ground = new THREE.Mesh(new THREE.CircleGeometry(14, 72), new THREE.MeshStandardMaterial({map: groundTexture('hd'), roughness: 1}));
        ground.receiveShadow = true;
        cow = makeZebuHD('henry', {detail: 1});
      } else {
        renderer.outputEncoding = THREE.LinearEncoding; renderer.toneMapping = THREE.NoToneMapping; renderer.shadowMap.enabled = false;
        const sb = kind === 'storybook';
        scene.background = new THREE.Color(sb ? 0xd9d2bf : 0xe8e6df); scene.fog = new THREE.Fog(scene.background, 8, 20);
        scene.add(new THREE.HemisphereLight(0xffffff, 0x9a8f80, sb ? 0.75 : 0.55));
        const sun = new THREE.DirectionalLight(sb ? 0xfff4e0 : 0xffffff, sb ? 0.65 : 0.75); sun.position.set(2, 4, 3); scene.add(sun);
        ground = new THREE.Mesh(new THREE.CircleGeometry(14, 72), new THREE.MeshLambertMaterial({map: groundTexture(kind)}));
        cow = sb ? makeZebuStorybook('henry') : makeZebu('henry');
        // a soft round shadow under him
        const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), rg = g.createRadialGradient(32, 32, 2, 32, 32, 31); rg.addColorStop(0, 'rgba(40,30,20,0.4)'); rg.addColorStop(1, 'rgba(40,30,20,0)'); g.fillStyle = rg; g.fillRect(0, 0, 64, 64);
        const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.4), new THREE.MeshBasicMaterial({map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false})); blob.rotation.x = -PI / 2; blob.position.y = 0.01; cow.root.add(blob);
      }
      ground.rotation.x = -PI / 2; scene.add(ground); scene.add(cow.root);
      look = kind; setAct(act === 'walk' ? 'walk' : act);
      $('about').innerHTML = ABOUT[kind].replace('%t', Math.round(cow.tris).toLocaleString());
      $('busy').hidden = true; window.READY = true;
    }, 30);
  }
  function setAct(a) {
    act = a; walking = a === 'walk';
    if (cow) cow.act(a === 'walk' ? 'stand' : a);
    for (const b of document.querySelectorAll('[data-act]')) b.setAttribute('aria-pressed', String(b.dataset.act === a));
  }
  for (const b of document.querySelectorAll('[data-look]')) b.addEventListener('click', () => { if (b.dataset.look === look) return; for (const o of document.querySelectorAll('[data-look]')) o.setAttribute('aria-pressed', String(o === b)); build(b.dataset.look); });
  for (const b of document.querySelectorAll('[data-act]')) b.addEventListener('click', () => setAct(b.dataset.act));
  $('faceBtn').addEventListener('click', () => { view.face = !view.face; $('faceBtn').setAttribute('aria-pressed', String(view.face)); view.dist = view.face ? 1.9 : 4.6; });

  // turning him with a finger, coming closer with two
  const ptrs = new Map(); let g0 = null;
  canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, {x: e.clientX, y: e.clientY}); start(); });
  canvas.addEventListener('pointermove', e => { if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, {x: e.clientX, y: e.clientY}); move(); });
  const up = e => { ptrs.delete(e.pointerId); start(); };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', e => { e.preventDefault(); view.dist = cl(view.dist * Math.exp(e.deltaY * 0.0015), 1.2, 9); }, {passive: false});
  function start() { const P = [...ptrs.values()]; g0 = P.length === 1 ? {x: P[0].x, y: P[0].y, yaw: view.yaw, pitch: view.pitch} : P.length >= 2 ? {d: Math.hypot(P[1].x - P[0].x, P[1].y - P[0].y), dist: view.dist} : null; }
  function move() { const P = [...ptrs.values()]; if (!g0) return; if (P.length === 1 && g0.yaw != null) { view.yaw = g0.yaw - (P[0].x - g0.x) * 0.008; view.pitch = cl(g0.pitch + (P[0].y - g0.y) * 0.005, -0.05, 1.2); } else if (P.length >= 2 && g0.d) view.dist = cl(g0.dist * g0.d / Math.max(20, Math.hypot(P[1].x - P[0].x, P[1].y - P[0].y)), 1.2, 9); }

  function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  window.addEventListener('resize', resize); resize();
  let last = performance.now();
  const aim = new THREE.Vector3(), tmp = new THREE.Vector3();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; clock += dt;
    if (cow) {
      cow.animate(dt, clock, walking ? 1.1 : 0);
      // walking on the spot: the pasture slides back under him
      if (walking && ground && ground.material.map) ground.material.map.offset.y += dt * 1.1 / 2.8;
      if (view.face) cow.anchor('head', tmp); else tmp.set(0, cow.state === 'lie' ? 0.45 : 0.72, 0.1);
      aim.lerp(tmp, Math.min(1, dt * 4));
      // on a tall phone screen, stand back far enough that all of him fits across it
      const camD = view.dist * Math.max(1, 1.12 / camera.aspect) * (view.face ? 0.8 : 1);
      camera.position.set(aim.x + Math.sin(view.yaw) * Math.cos(view.pitch) * camD, aim.y + Math.sin(view.pitch) * camD, aim.z + Math.cos(view.yaw) * Math.cos(view.pitch) * camD);
      camera.lookAt(aim);
      renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);
  }
  window.HENRY = {build, setAct, view, get cow() { return cow; }, get look() { return look; }, calls: () => renderer.info.render.calls};
  build('hd');
  requestAnimationFrame(frame);
})();
