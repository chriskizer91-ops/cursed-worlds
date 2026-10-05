// ranch-crew.js: the rancher and the tractor (Chris, October 5, 2026: "add the tractor and the rancher I can give orders
// to"). The rancher is a soft cartoon, like the cattle (zebu-hd.js, its soft look): a big friendly head, a straw cowboy
// hat, a plaid shirt, jeans, work gloves and boots. The tractor belongs to the world, so it is drawn for real, like the
// buildings: a red utility tractor with a roll bar, a front loader and a bale spear for carrying round bales.
// Both face +z. three.js r128 (global THREE). Defines makeRancher(), makeTractor() and makeYardBits().
//   makeRancher() -> {root, hand: {L, R}, bucket, salt, update(dt, t, {speed, pose}), pose}
//     poses: 'stand', 'sit' (driving), 'reach' (turning a tap, opening a door), 'scatter' (throwing feed from a bucket),
//     'look' (a hand up to the hat brim, looking an animal over), 'carry' (both hands out in front), 'wave', 'climb'.
//   makeTractor() -> {root, seat (where the rancher sits), side (where he climbs on), bale (the bale on the spear),
//     update(dt, t, {speed, steer, running}), loader (the loader's height, 0 lowered to the ground to 1 raised high)}
//   makeYardBits() -> {tap (a standpipe with a hose, for the troughs), hose(from, to) (the hose laid to a trough)}
(function (root) {
  'use strict';
  const PI = Math.PI, TAU = PI * 2;
  const LIN = h => new THREE.Color(h).convertSRGBToLinear();
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
  const cvs = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const tex = (c, rx, ry) => { const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx || 1, ry || 1); t.anisotropy = 4; return t; };
  const grp = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x || 0, y || 0, z || 0); parent.add(g); return g; };
  const put = (parent, geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const ball = (x, y, z, w, h) => { const g = new THREE.SphereGeometry(1, w || 18, h || 14); g.scale(x, y, z); return g; };
  // a rounded limb from 0 down to -len (a capsule turned on a lathe: three.js r128 has no capsule of its own)
  function limb(r0, r1, len, seg) {
    const pts = [], n = 6;
    for (let i = 0; i <= n; i++) { const a = -PI / 2 + i / n * PI / 2; pts.push(new THREE.Vector2(Math.cos(a) * r1, r1 + Math.sin(a) * r1)); }
    for (let i = 0; i <= n; i++) { const a = i / n * PI / 2; pts.push(new THREE.Vector2(Math.cos(a) * r0, len - r0 + Math.sin(a) * r0)); }
    const g = new THREE.LatheGeometry(pts, seg || 14); g.translate(0, -len, 0); return g;
  }

  // ---------- the rancher ----------
  function makeRancher() {
    const soft = (hex, o) => new THREE.MeshPhysicalMaterial(Object.assign({color: LIN(hex), roughness: .72, sheen: new THREE.Color(.12, .12, .14)}, o));
    const plaid = (() => { // a red work shirt, checked
      const S = 128, c = cvs(S, S), g = c.getContext('2d'); g.fillStyle = '#b5372e'; g.fillRect(0, 0, S, S);
      g.fillStyle = 'rgba(40,16,20,.45)'; for (const k of [0, 64]) { g.fillRect(k + 8, 0, 22, S); g.fillRect(0, k + 8, S, 22); }
      g.fillStyle = 'rgba(255,220,200,.25)'; for (const k of [0, 64]) { g.fillRect(k + 44, 0, 4, S); g.fillRect(0, k + 44, S, 4); }
      return tex(c, 4, 3);
    })();
    const denim = (() => { const S = 64, c = cvs(S, S), g = c.getContext('2d'); g.fillStyle = '#41618a'; g.fillRect(0, 0, S, S); for (let i = 0; i < 400; i++) { g.fillStyle = Math.random() < .5 ? 'rgba(20,30,60,.25)' : 'rgba(200,215,240,.18)'; g.fillRect(Math.random() * S, Math.random() * S, 1, 3); } return tex(c, 3, 3); })();
    const skin = soft('#eab590', {roughness: .55, sheen: null}), shirt = soft('#ffffff', {map: plaid}), jeans = soft('#ffffff', {map: denim}), glove = soft('#b48a54', {roughness: .6});
    const boot = soft('#6a3f24', {roughness: .45, sheen: null}), hatM = soft('#d9b878', {roughness: .85, side: THREE.DoubleSide}), bandM = soft('#5a3820', {roughness: .6}), red = soft('#c0342a'), hair = soft('#6b4a2e', {roughness: .9});
    const eyeM = new THREE.MeshStandardMaterial({color: LIN('#151012'), roughness: .12}), spark = new THREE.MeshBasicMaterial({color: 0xffffff}), brass = new THREE.MeshStandardMaterial({color: LIN('#c9a24a'), roughness: .3, metalness: .9});
    const R = new THREE.Group();
    const hips = grp(R, 0, .8, 0);
    put(hips, ball(.18, .13, .13), jeans, 0, .02, 0);
    const spine = grp(hips, 0, .06, 0);
    // the body: a barrel of plaid, wider at the chest
    const prof = [[0, 0], [.16, 0], [.185, .05], [.195, .16], [.21, .3], [.2, .38], [.15, .44], [.06, .46], [0, .46]].map(([x, y]) => new THREE.Vector2(x, y));
    const torso = put(spine, new THREE.LatheGeometry(prof, 20), shirt); torso.scale.z = .74;
    const belt = put(spine, new THREE.TorusGeometry(.17, .022, 8, 28), bandM, 0, .02, 0); belt.rotation.x = PI / 2; belt.scale.y = .74;
    put(spine, new THREE.BoxGeometry(.06, .045, .02), brass, 0, .02, .128);
    for (let i = 0; i < 3; i++) put(spine, new THREE.SphereGeometry(.012, 8, 6), soft('#f2ead8'), 0, .14 + i * .1, .148 + (i === 2 ? -.01 : 0));
    const neck = grp(spine, 0, .44, 0);
    put(neck, new THREE.CylinderGeometry(.055, .06, .08, 12), skin, 0, .04, 0);
    const kerchief = put(neck, new THREE.ConeGeometry(.12, .06, 18, 1, true), red, 0, .02, 0); kerchief.rotation.x = PI;
    put(neck, new THREE.ConeGeometry(.05, .07, 3), red, 0, -.02, .09).rotation.x = PI * .55;
    // the head: big and round, as a cartoon's is
    const head = grp(neck, 0, .08, 0);
    put(head, ball(.18, .185, .175, 28, 22), skin, 0, .17, 0);
    for (const s of [-1, 1]) {
      put(head, ball(.032, .048, .028), skin, s * .175, .16, -.005);
      put(head, ball(.032, .043, .02), eyeM, s * .066, .19, .158).rotation.y = s * .35;
      put(head, new THREE.SphereGeometry(.009, 8, 6), spark, s * .066 + .01, .205, .174);
      const brow = put(head, limb(.009, .009, .055, 6), hair, s * .03, .25, .158); brow.rotation.z = s * PI / 2 - s * .15;
      put(head, new THREE.SphereGeometry(.03, 10, 8), soft('#f0a08a', {transparent: true, opacity: .45, sheen: null}), s * .11, .12, .135);
    }
    put(head, ball(.032, .028, .03), soft('#e7a17e', {sheen: null}), 0, .145, .182);
    const smile = put(head, new THREE.TorusGeometry(.045, .008, 6, 14, PI * .7), soft('#7a3a30', {sheen: null}), 0, .1, .165);
    smile.rotation.set(-.25, 0, PI + PI * .15);
    const hairCap = put(head, new THREE.SphereGeometry(.186, 20, 12, 0, TAU, 0, PI * .5), hair, 0, .17, -.012); hairCap.rotation.x = -.55;
    // the hat: a straw cowboy hat, its brim curled up at the sides
    const hat = grp(head, 0, .3, -.005); hat.rotation.x = -.1;
    const brimG = new THREE.RingGeometry(.1, .33, 44, 6); brimG.rotateX(-PI / 2);
    { const p = brimG.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z); p.setY(i, .1 * Math.pow(Math.abs(x) / .33, 3) * (r > .14 ? 1 : 0) - .025 * Math.pow(z / .33, 2)); } brimG.computeVertexNormals(); }
    put(hat, brimG, hatM);
    const crown = put(hat, new THREE.CylinderGeometry(.115, .145, .15, 24), hatM, 0, .075, 0); crown.scale.z = .9;
    put(hat, new THREE.CylinderGeometry(.148, .148, .032, 24, 1, true), bandM, 0, .02, 0).scale.z = .9;
    put(hat, ball(.1, .03, .09), hatM, 0, .15, 0);
    // arms and legs on joints
    const arm = s => {
      const sh = grp(spine, s * .2, .38, 0); sh.rotation.z = s * .1;
      put(sh, limb(.06, .055, .27), shirt);
      const el = grp(sh, 0, -.26, 0);
      put(el, new THREE.TorusGeometry(.052, .018, 6, 14), shirt, 0, -.02, 0).rotation.x = PI / 2;
      put(el, limb(.05, .045, .22), skin);
      const hd = grp(el, 0, -.23, 0);
      put(hd, ball(.055, .06, .045), glove, 0, -.02, .005);
      put(hd, ball(.02, .035, .02), glove, s * -.04, -.005, .03).rotation.z = s * .5;
      return {sh, el, hd};
    };
    const leg = s => {
      const hp = grp(hips, s * .095, 0, 0);
      put(hp, limb(.085, .075, .4), jeans);
      const kn = grp(hp, 0, -.39, 0);
      put(kn, limb(.075, .07, .3), jeans);
      const ft = grp(kn, 0, -.32, 0);
      put(ft, new THREE.CylinderGeometry(.075, .072, .14, 14), boot, 0, .02, 0);
      put(ft, ball(.072, .055, .14), boot, 0, -.05, .045);
      put(ft, new THREE.BoxGeometry(.11, .035, .06), boot, 0, -.085, -.06);
      return {hp, kn, ft};
    };
    const A = {L: arm(1), R: arm(-1)}, L = {L: leg(1), R: leg(-1)};
    // what he carries now and then: a feed bucket in his left hand, a block of salt in both
    const bucket = new THREE.Group(); A.L.hd.add(bucket); bucket.position.set(0, -.2, .02); bucket.visible = false;
    { const galv = new THREE.MeshStandardMaterial({color: LIN('#b6bcbd'), roughness: .4, metalness: .8, side: THREE.DoubleSide});
      put(bucket, new THREE.CylinderGeometry(.13, .1, .24, 20, 1, true), galv); put(bucket, new THREE.CircleGeometry(.1, 20), galv, 0, -.12, 0).rotation.x = -PI / 2;
      put(bucket, new THREE.CircleGeometry(.12, 20), soft('#d6b56a', {sheen: null}), 0, .08, 0).rotation.x = -PI / 2;
      const h = put(bucket, new THREE.TorusGeometry(.13, .006, 5, 20, PI), galv, 0, .12, 0); h.rotation.y = PI / 2; }
    const salt = put(R, new THREE.BoxGeometry(.28, .24, .28), soft('#ecdcd6', {sheen: null}), 0, 1.0, .38); salt.visible = false;

    // ---------- moving ----------
    const J = [A.L.sh, A.R.sh, A.L.el, A.R.el, A.L.hd, A.R.hd, L.L.hp, L.R.hp, L.L.kn, L.R.kn, L.L.ft, L.R.ft, spine, head, hips];
    const rest = J.map(j => j.rotation.clone());
    let ph = 0, blend = 0;
    const me = {root: R, hand: {L: A.L.hd, R: A.R.hd}, bucket, salt, pose: 'stand'};
    const set = (j, x, y, z, k) => { j.rotation.x += (x - j.rotation.x) * k; j.rotation.y += ((y || 0) - j.rotation.y) * k; j.rotation.z += ((z || 0) - j.rotation.z) * k; };
    me.update = (dt, t, o) => {
      o = o || {}; const sp = o.speed || 0, pose = o.pose || me.pose, k = 1 - Math.exp(-dt * 10);
      me.pose = pose;
      blend += ((sp > .05 ? 1 : 0) - blend) * (1 - Math.exp(-dt * 8));
      ph += sp * dt / 1.25 * TAU;
      const s = Math.sin(ph), c = Math.cos(ph), w = blend, br = Math.sin(t * 1.7) * .015;
      let hy = .8;
      if (pose === 'sit') {
        hy = .8;
        set(L.L.hp, -1.45, 0, .12, k); set(L.R.hp, -1.45, 0, -.12, k); set(L.L.kn, 1.35, 0, 0, k); set(L.R.kn, 1.35, 0, 0, k); set(L.L.ft, .1, 0, 0, k); set(L.R.ft, .1, 0, 0, k);
        set(A.L.sh, -.95, 0, .25, k); set(A.R.sh, -.95, 0, -.25, k); set(A.L.el, -.75, 0, 0, k); set(A.R.el, -.75, 0, 0, k);
        set(spine, .05 + br, Math.sin(t * .9) * .05 * (o.steer || 0), 0, k); set(head, -.05, (o.steer || 0) * .3 + Math.sin(t * .4) * .1, 0, k);
      } else {
        // legs: walking, or standing with a little weight shift
        set(L.L.hp, -s * .55 * w, 0, .02, k * 2); set(L.R.hp, s * .55 * w, 0, -.02, k * 2);
        set(L.L.kn, (Math.max(0, Math.sin(ph + .7)) * .95 + .08) * w, 0, 0, k * 2); set(L.R.kn, (Math.max(0, -Math.sin(ph + .7)) * .95 + .08) * w, 0, 0, k * 2);
        set(L.L.ft, -.1 * w, 0, 0, k); set(L.R.ft, -.1 * w, 0, 0, k);
        hy = .8 - .02 * w + Math.abs(c) * .025 * w;
        let sx = .04 * w + br, hx = 0, hyaw = Math.sin(t * .37) * .3 * (1 - w) + Math.sin(t * .13) * .15;
        // arms by what he is doing
        let aL = [s * .45 * w, 0, .08], aR = [-s * .45 * w, 0, -.08], eL = -.25, eR = -.25;
        if (pose === 'reach') { aR = [-1.15 + Math.sin(t * 6) * .08, 0, -.05]; eR = -.25; sx = .35; hx = .25; hyaw = 0; }
        else if (pose === 'scatter') { aR = [-.9 + Math.sin(t * 5) * .55, 0, -.15]; eR = -.3; aL = [-.25, 0, .15]; eL = -1.2; hyaw = Math.sin(t * 2.5) * .25; }
        else if (pose === 'look') { aR = [-2.3, 0, -.2]; eR = -1.75; aL = [.1, 0, .35]; eL = -.6; sx = .12; hx = .15; hyaw = Math.sin(t * .8) * .2; }
        else if (pose === 'carry') { aL = [-.75, 0, .12]; aR = [-.75, 0, -.12]; eL = -.95; eR = -.95; }
        else if (pose === 'wave') { aR = [-.2, 0, -2.5]; eR = 0; set(A.R.el, 0, 0, Math.sin(t * 9) * .45, k); }
        else if (pose === 'climb') { aL = [-1.6, 0, .2]; aR = [-1.6, 0, -.2]; eL = -.4; eR = -.4; set(L.L.hp, -1.1, 0, 0, k); set(L.L.kn, 1.2, 0, 0, k); }
        set(A.L.sh, aL[0], aL[1], aL[2], k); set(A.R.sh, aR[0], aR[1], aR[2], k);
        set(A.L.el, eL, 0, 0, k); if (pose !== 'wave') set(A.R.el, eR, 0, 0, k);
        set(spine, sx, Math.sin(ph) * .08 * w, 0, k); set(head, hx - .03 * w, hyaw, 0, k);
      }
      hips.position.y += (hy - hips.position.y) * Math.min(1, k * 2);
      bucket.visible = pose === 'scatter'; salt.visible = pose === 'carry';
    };
    me.update(0, 0, {});
    R.userData.rest = rest;
    return me;
  }

  // ---------- the tractor ----------
  function makeTractor() {
    const paint = new THREE.MeshPhysicalMaterial({color: LIN('#b3241c'), roughness: .38, metalness: .15, clearcoat: .7, clearcoatRoughness: .25});
    const dark = new THREE.MeshStandardMaterial({color: LIN('#26282a'), roughness: .6, metalness: .3});
    const black = new THREE.MeshStandardMaterial({color: LIN('#151515'), roughness: .5, metalness: .2});
    const steel = new THREE.MeshStandardMaterial({color: LIN('#9aa0a2'), roughness: .3, metalness: .85});
    const rimM = new THREE.MeshStandardMaterial({color: LIN('#e2dccb'), roughness: .4, metalness: .35});
    const glass = new THREE.MeshStandardMaterial({color: LIN('#f4f0e0'), roughness: .05, metalness: .2, emissive: LIN('#5a5440')});
    const tread = (() => { // lugs across a tire's face
      const W = 256, H = 64, c = cvs(W, H), g = c.getContext('2d'); g.fillStyle = '#1c1c1c'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#353535'; for (let i = 0; i < 22; i++) { const x = i * W / 22; for (const s of [0, 1]) { g.beginPath(); g.moveTo(x + 2, s ? H : 0); g.lineTo(x + 10, s ? H : 0); g.lineTo(x + 16, H / 2 + (s ? 3 : -3)); g.lineTo(x + 8, H / 2 + (s ? 3 : -3)); g.fill(); } }
      return tex(c, 1, 1);
    })();
    const rubber = new THREE.MeshStandardMaterial({map: tread, roughness: .9}), wall = new THREE.MeshStandardMaterial({color: LIN('#202020'), roughness: .85});
    const grille = (() => { const c = cvs(64, 64), g = c.getContext('2d'); g.fillStyle = '#121212'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#3a3a3a'; for (let y = 4; y < 64; y += 8) g.fillRect(4, y, 56, 3); return new THREE.MeshStandardMaterial({map: tex(c), roughness: .5, metalness: .5}); })();
    const R = new THREE.Group(), body = grp(R);
    // frame, engine and hood
    put(body, new THREE.BoxGeometry(.55, .32, 2.3), dark, 0, .55, .2);
    put(body, new THREE.BoxGeometry(.72, .5, .62), dark, 0, .66, -.78);
    const hs = new THREE.Shape(), hw = .37, hb = .0, ht = .5, rr = .11;
    hs.moveTo(-hw, hb); hs.lineTo(hw, hb); hs.lineTo(hw, ht - rr); hs.quadraticCurveTo(hw, ht, hw - rr, ht); hs.lineTo(-hw + rr, ht); hs.quadraticCurveTo(-hw, ht, -hw, ht - rr); hs.lineTo(-hw, hb);
    const hood = new THREE.ExtrudeGeometry(hs, {depth: 1.2, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 3, curveSegments: 6});
    put(body, hood, paint, 0, .66, .15);
    put(body, new THREE.PlaneGeometry(.6, .38), grille, 0, .88, 1.39);
    for (const s of [-1, 1]) { const l = put(body, new THREE.CylinderGeometry(.055, .055, .04, 16), glass, s * .25, 1.06, 1.38); l.rotation.x = PI / 2; }
    put(body, new THREE.BoxGeometry(.52, .2, .18), dark, 0, .48, 1.42);
    const stack = put(body, new THREE.CylinderGeometry(.035, .04, .7, 12), black, .22, 1.48, 1.0); put(body, new THREE.CylinderGeometry(.05, .04, .06, 12), black, .22, 1.84, 1.0);
    // the driver's place: floor, seat, wheel, and the roll bar over it
    put(body, new THREE.BoxGeometry(.95, .05, .6), dark, 0, .8, -.42);
    put(body, new THREE.BoxGeometry(.48, .1, .44), black, 0, .98, -.86);
    const back = put(body, new THREE.BoxGeometry(.48, .42, .08), black, 0, 1.2, -1.08); back.rotation.x = -.15;
    const col = put(body, new THREE.CylinderGeometry(.03, .03, .5, 8), black, 0, 1.07, -.3); col.rotation.x = -.55;
    const wheel = put(body, new THREE.TorusGeometry(.17, .018, 8, 26), black, 0, 1.28, -.42); wheel.rotation.x = -1.0;
    for (const s of [-1, 1]) put(body, new THREE.BoxGeometry(.07, 1.45, .07), black, s * .62, 1.62, -1.12);
    put(body, new THREE.BoxGeometry(1.31, .07, .07), black, 0, 2.35, -1.12);
    // fenders over the big wheels
    for (const s of [-1, 1]) { const f = put(body, new THREE.CylinderGeometry(.76, .76, .46, 26, 1, true, -.15, PI + .3), paint, s * .84, .62, -.72); f.rotation.z = PI / 2; f.material = paint.clone(); f.material.side = THREE.DoubleSide; }
    // three-point hitch at the back
    for (const s of [-1, 1]) { const a = put(body, new THREE.BoxGeometry(.06, .06, .6), dark, s * .3, .45, -1.25); a.rotation.x = .3; }
    // wheels: big at the back, small in front (the front pair steer)
    const wheels = [];
    const mkWheel = (r, w, x, z, steer) => {
      const holder = grp(body, x, r, z), spin = grp(holder);
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 40, 1), [rubber, wall, wall]); tire.rotation.z = PI / 2; tire.castShadow = tire.receiveShadow = true; spin.add(tire);
      const rim = put(spin, new THREE.CylinderGeometry(r * .62, r * .62, w * 1.02, 24), rimM); rim.rotation.z = PI / 2;
      const hub = put(spin, new THREE.CylinderGeometry(r * .18, r * .18, w * 1.1, 12), steel); hub.rotation.z = PI / 2;
      for (let i = 0; i < 6; i++) { const b = put(spin, new THREE.BoxGeometry(w * 1.06, .03, .03), steel); const a = i / 6 * TAU; b.position.set(0, Math.cos(a) * r * .35, Math.sin(a) * r * .35); }
      wheels.push({holder, spin, r, steer});
    };
    mkWheel(.64, .4, .84, -.72, false); mkWheel(.64, .4, -.84, -.72, false);
    mkWheel(.4, .26, .74, 1.15, true); mkWheel(.4, .26, -.74, 1.15, true);
    // the front loader: two arms on towers by the driver, a bale spear on the end that stays level as they lift
    for (const s of [-1, 1]) put(body, new THREE.BoxGeometry(.12, .6, .2), dark, s * .58, .9, -.15);
    const boom = grp(body, 0, 1.18, -.15);
    for (const s of [-1, 1]) {
      put(boom, new THREE.BoxGeometry(.09, .14, 2.05), paint, s * .6, 0, 1.0);
      const cyl = put(boom, new THREE.CylinderGeometry(.03, .03, 1.1, 8), steel, s * .6, -.16, .8); cyl.rotation.x = PI / 2 - .12;
    }
    put(boom, new THREE.BoxGeometry(1.25, .09, .09), paint, 0, 0, 1.75);
    const tool = grp(boom, 0, 0, 2.02);
    put(tool, new THREE.BoxGeometry(1.05, .5, .06), dark, 0, .1, 0);
    { const sp = put(tool, new THREE.ConeGeometry(.045, 1.05, 12), steel, 0, .12, .55); sp.rotation.x = PI / 2;
      for (const s of [-1, 1]) { const k = put(tool, new THREE.ConeGeometry(.025, .38, 8), steel, s * .36, .12, .22); k.rotation.x = PI / 2; } }
    // a round bale, speared through its middle
    const bale = (() => {
      const c = cvs(128, 64), g = c.getContext('2d'); g.fillStyle = '#b8995a'; g.fillRect(0, 0, 128, 64);
      for (let i = 0; i < 900; i++) { g.strokeStyle = ['#e3cb8e', '#9c7c45', '#c9ad6c', '#7d6538'][(Math.random() * 4) | 0]; g.lineWidth = .8 + Math.random(); const x = Math.random() * 128, y = Math.random() * 64; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 6 + Math.random() * 14, y + (Math.random() - .5) * 3); g.stroke(); }
      const e = cvs(128, 128), h = e.getContext('2d'); h.fillStyle = '#a88a50'; h.fillRect(0, 0, 128, 128); for (let r = 3; r < 64; r += 3) { h.strokeStyle = `rgba(${Math.random() < .5 ? '90,70,36' : '230,206,150'},.5)`; h.lineWidth = 1.5; h.beginPath(); h.arc(64, 64, r, 0, TAU); h.stroke(); }
      const side = new THREE.MeshStandardMaterial({map: tex(c, 3, 1), roughness: .95}), end = new THREE.MeshStandardMaterial({map: tex(e), roughness: .95});
      const m = new THREE.Mesh(new THREE.CylinderGeometry(.8, .8, 1.25, 30), [side, end, end]); m.rotation.x = PI / 2; m.position.set(0, .12, .76); m.castShadow = m.receiveShadow = true; m.visible = false; tool.add(m); return m;
    })();
    // where the rancher sits, and where he climbs on
    const seat = grp(body, 0, 1.03, -.84), side = new THREE.Vector3(-1.25, 0, -.55);
    // the loader's height: 0 is the spear near the ground, 1 is lifted high; between them it carries a bale
    const ANG = h => .33 - h * .95;
    const me = {root: R, seat, side, bale, loader: .3, wheels};
    let spun = 0, steer = 0;
    me.update = (dt, t, o) => {
      o = o || {}; const sp = o.speed || 0;
      spun += sp * dt;
      steer += ((o.steer || 0) - steer) * (1 - Math.exp(-dt * 6));
      for (const w of wheels) { w.spin.rotation.x = spun / w.r; if (w.steer) w.holder.rotation.y = steer; }
      boom.rotation.x += (ANG(me.loader) - boom.rotation.x) * (1 - Math.exp(-dt * 3));
      tool.rotation.x = -boom.rotation.x;
      body.position.y = o.running ? Math.sin(t * 47) * .004 + Math.sin(t * 31) * .003 : 0;   // the engine's shake
    };
    me.update(0, 0, {});
    return me;
  }

  // ---------- by the troughs: a standpipe with a tap, and the hose laid from it ----------
  function makeYardBits() {
    const pipeM = new THREE.MeshStandardMaterial({color: LIN('#7d8a7a'), roughness: .5, metalness: .6}), hoseM = new THREE.MeshStandardMaterial({color: LIN('#3f7d3a'), roughness: .55});
    const tap = new THREE.Group();
    put(tap, new THREE.CylinderGeometry(.03, .03, .85, 10), pipeM, 0, .42, 0);
    const sp = put(tap, new THREE.CylinderGeometry(.022, .022, .12, 8), pipeM, 0, .8, .05); sp.rotation.x = PI / 2;
    put(tap, new THREE.TorusGeometry(.04, .01, 6, 14), new THREE.MeshStandardMaterial({color: LIN('#b02a22'), roughness: .5}), 0, .87, .02).rotation.x = PI / 2;
    const coil = put(tap, new THREE.TorusGeometry(.16, .02, 6, 24), hoseM, 0, .55, -.05);
    let line = null;
    function hose(parent, from, to) {
      if (line) { parent.remove(line); line.geometry.dispose(); line = null; }
      if (!from) { coil.visible = true; return; }
      coil.visible = false;
      const mid = from.clone().lerp(to, .5); mid.y = .04;
      const curve = new THREE.CatmullRomCurve3([from, new THREE.Vector3(from.x, .05, from.z), mid, new THREE.Vector3(to.x, .7, to.z), new THREE.Vector3(to.x, .5, to.z)]);
      line = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, .018, 6), hoseM); line.castShadow = true; parent.add(line);
    }
    return {tap, hose};
  }

  root.makeRancher = makeRancher; root.makeTractor = makeTractor; root.makeYardBits = makeYardBits;
})(typeof window !== 'undefined' ? window : globalThis);
