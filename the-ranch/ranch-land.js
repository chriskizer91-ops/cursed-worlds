// ranch-land.js: the ranch's world drawn for real round Chris's cartoon map and the cartoon cattle and chickens (Chris,
// October 4 and 5, 2026: "Use the cartoon maps and cartoon cows with realistic environment").
// It is drawn the way envoi's Colossus in the Meadow draws its meadow, through the land kit
// (animal-3d-models/viewer/land-kit.js) and envoi's film camera (animal-3d-models/viewer/cinema.js):
//   - the ground: Chris's painted cartoon map, at every height, lit by the real sun and sky, shaded by the trees and the
//     buildings, with the clouds' shadows drifting over it; the pond ripples in the wind and mirrors the sky;
//   - grass: tufts that grow round wherever you look, where the painting is green, short on the trails, bending in the wind
//     and leaning out of the way of the animal you are following;
//   - trees: every painted tree stands up as a tree of leaves on branches (post oaks, cedars and taller round trees),
//     swaying in the wind, its green taken from the painting, casting its shadow;
//   - buildings of corrugated metal, painted siding and weathered boards; fences of cedar posts and barbed wire, board
//     fences and pipe pens; the railroad on its gravel bed; the hay ring, the stock tanks and the salt;
//   - the sun high in the north-west where the painting has it, the sky, the haze and the light from the kit.
// The chickens are soft cartoons, like the cattle (zebu-hd.js, its soft look).
// three.js r128 (global THREE), land-kit.js and cinema.js. Defines makeRanchLand(renderer, scene, T, opts) (T: the trace).
(function (root) {
  'use strict';
  function makeRanchLand(renderer, scene, T, opts) {
    opts = opts || {};
    const MPP = 0.3, PI = Math.PI, TAU = PI * 2;
    // the painting's sun: high in the north-west (its shadows fall to the south-east)
    const K = root.makeLandKit(renderer, {time: opts.time || 'day', seed: 20261004, maz: -2.43});
    const {rnd, rr, cl, lerp, sm, cvs, V3, own, P, GL2, LIN, LINV, UNF, AIRU, AIR, CSH, A2C, UNFILM, EXPU, LIGHT} = K;
    const toW = (mx, my) => ({x: (mx - T.mapW / 2) * MPP, z: (my - T.mapH / 2) * MPP});
    const MW = T.mapW * MPP, MH = T.mapH * MPP;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.LinearEncoding; renderer.toneMapping = THREE.NoToneMapping;
    const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S3 = V3(), P3 = V3();
    const shadows = o => { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };

    // ---------- the sky, the light and the haze; the film camera ----------
    K.sky(scene, true);
    const {hemi, key, fill, fog} = K.lights(scene, {shadow: 30, far: 500});
    hemi.color.copy(LIN('#c2d2e0'));   // a paler sky, so the shade under the trees isn't so blue
    const cinema = root.makeCinema ? root.makeCinema(renderer, {msaa: 4}) : null;
    if (cinema) { cinema.set({exposure: K.E, bloom: P.bloom * .8, bloomRadius: 1, rays: 0, grain: 0.025, vignette: P.vignette * .8, split: 0, aperture: P.aperture, maxBlur: 7, saturation: 1.22, fringe: 0.001}); cinema.sun(K.DISC); }

    // ---------- what the painting says is where ----------
    // A picture of the ranch at 0.6 m a pixel: red, how much grass grows; green, bare dirt; blue, water; alpha, the plowed
    // field. It is made from the trace (T.grid) at first, then from the painting's own colors once its pieces have loaded.
    const GW = T.w * 2, GH = T.h * 2, maskData = new Uint8Array(GW * GH * 4);
    const mask = own(new THREE.DataTexture(maskData, GW, GH, THREE.RGBAFormat)); mask.magFilter = mask.minFilter = THREE.LinearFilter;
    const paintC = cvs(GW, GH), paintG = paintC.getContext('2d'); paintG.fillStyle = '#56763a'; paintG.fillRect(0, 0, GW, GH);
    const paint = own(new THREE.CanvasTexture(paintC)); paint.flipY = false; paint.minFilter = THREE.LinearFilter; paint.generateMipmaps = false;
    const pond = T.pond ? Object.assign(toW(T.pond.x, T.pond.y), {rx: T.pond.rx * MPP, ry: T.pond.ry * MPP}) : null;
    const RAIL = (T.rail || []).map(([x, y]) => toW(x, y)).slice(0, 6);
    const railDist = (x, z) => { let b = 1e9; for (let i = 0; i < RAIL.length - 1; i++) { const a = RAIL[i], c = RAIL[i + 1], dx = c.x - a.x, dz = c.z - a.z, L = dx * dx + dz * dz || 1, u = cl(((x - a.x) * dx + (z - a.z) * dz) / L, 0, 1); b = Math.min(b, Math.hypot(a.x + dx * u - x, a.z + dz * u - z)); } return b; };
    let paintPx = null;
    function classify() {
      const px = paintPx;
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
        const i = (y * GW + x) * 4, c = T.grid[(y >> 1) * T.w + (x >> 1)], wx = ((x + .5) / GW - .5) * MW, wz = ((y + .5) / GH - .5) * MH;
        let grass = c === 'g' ? 1 : c === 'T' ? .55 : c === 't' ? .2 : c === 'o' ? .6 : 0, bare = c === 't' ? .8 : 0, water = c === 'w' ? 1 : 0, field = 0;
        if (px) {
          const r = px[i] / 255, g = px[i + 1] / 255, b = px[i + 2] / 255, lum = .3 * r + .59 * g + .11 * b, green = g - Math.max(r, b), red = r - g;
          const inPond = pond && ((wx - pond.x) / (pond.rx * 1.25)) ** 2 + ((wz - pond.z) / (pond.ry * 1.25)) ** 2 < 1;
          water = inPond ? sm(-.06, -.01, b - g) * (1 - sm(.36, .46, lum)) : 0;
          bare = Math.max(c === 't' ? .55 : 0, sm(.05, .12, red) * (1 - sm(-.02, .03, green)));
          field = c === 'o' ? sm(.07, .12, red) * (1 - sm(.46, .54, lum)) : 0;
          grass = (c === 'x' ? .15 : 1) * (c === 'T' ? .6 : 1) * (1 - bare * .9) * (1 - field);
        }
        const rd = RAIL.length > 1 ? railDist(wx, wz) : 99;
        if (rd < 3.4) { const k = sm(2.4, 3.4, rd); grass *= k; bare *= k; field = 0; }
        grass *= 1 - water; field *= 1 - water;
        maskData[i] = grass * 255; maskData[i + 1] = bare * 255; maskData[i + 2] = water * 255; maskData[i + 3] = field * 255;
      }
      mask.needsUpdate = true;
    }
    classify();

    // ---------- textures for the ground and for what people built (painted in code) ----------
    const tx = (c, data) => { const t = own(new THREE.CanvasTexture(c)); if (!data) t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
    const wrapDot = (g, S, x, y, r, col) => { const q = g.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, col); q.addColorStop(1, col.replace(/[\d.]+\)$/, '0)')); g.fillStyle = q; for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) g.fillRect(x - r + ox, y - r + oy, r * 2, r * 2); };
    // gravel under the railroad
    const gravelTex = (() => {
      const S = 256, c = cvs(S, S), g = c.getContext('2d'); g.fillStyle = '#6c6862'; g.fillRect(0, 0, S, S);
      for (let i = 0; i < 2600; i++) { const x = rnd() * S, y = rnd() * S, r = rr(1.5, 4.5), v = rr(70, 170); g.fillStyle = `rgb(${v + 8},${v + 2},${v - 6})`; g.beginPath(); g.ellipse(x, y, r, r * rr(.6, 1), rnd() * 3, 0, TAU); g.fill(); }
      return tx(c);
    })();

    // ---------- the ground: the painted map ----------
    // Chris's cartoon map is the ground at every height (Chris, October 5, 2026). It is lit by the real sun and sky, so it
    // looks just as painted in the sunshine, darker in the shade of the trees and the buildings, and the clouds' shadows
    // drift over it. Only the pond takes more than light: it ripples in the wind and mirrors the sky.
    // The painting is soft when you come right down to it (its paint is laid on in blocks of 30 to 60 cm), so close up it is
    // blurred just enough that the blocks don't show, and the painting's own grass and dirt, cut from open places on it and
    // laid on smaller, give it its texture there.
    const flat = own(new THREE.DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1, THREE.RGBAFormat)); flat.needsUpdate = true;
    const groundU = Object.assign({
      uMask: {value: mask}, uIrr: {value: new THREE.Vector3(1, 1, 1)}, uNear: {value: 0}, uMap: {value: new THREE.Vector2(MW, MH)},
      uGrassD: {value: flat}, uDirtD: {value: flat}, uGrassM: {value: new THREE.Vector3(.22, .22, .22)}, uDirtM: {value: new THREE.Vector3(.22, .22, .22)}, uDetail: {value: 0},
    }, AIRU, EXPU);
    const GROUND_FS = [
      ' float gWater = 0.;',
      ' { vec2 tdx = dFdx(vUv * 2048.), tdy = dFdy(vUv * 2048.); float lod = .5 * log2(max(max(dot(tdx, tdx), dot(tdy, tdy)), 1e-6));',
      '   vec3 alb = unfilm(texture2D(map, vUv, max(0., 3.8 - lod) * uNear).rgb) / uIrr;',
      '   if (uBeyond < .5) gWater = texture2D(uMask, vGp / uMap + .5).b * uNear;',
      '   float near = uDetail * uNear * (1. - smoothstep(30., 90., vDepth));',
      '   if (near > .001) {',
      '     vec2 wq = vGp + (vec2(mn(vGp * 1.1), mn(vGp * 1.1 + 7.3)) - .5) * 1.6;',
      '     vec4 mk = uBeyond > .5 ? vec4(1., 0., 0., 0.) : texture2D(uMask, wq / uMap + .5);',
      '     vec2 rq = mat2(.8, -.6, .6, .8) * vGp;',
      '     vec3 gd = pow(texture2D(uGrassD, vGp / 1.9).rgb, vec3(2.2)) / uGrassM * mix(vec3(1.), pow(texture2D(uGrassD, rq / 5.3 + .3).rgb, vec3(2.2)) / uGrassM, .4);',
      '     vec3 dd = pow(texture2D(uDirtD, vGp / 2.6).rgb, vec3(2.2)) / uDirtM * mix(vec3(1.), pow(texture2D(uDirtD, rq / 7.1 + .6).rgb, vec3(2.2)) / uDirtM, .35);',
      '     vec3 det = mix(gd, dd, clamp(mk.g + mk.a, 0., 1.)); det = mix(det, vec3(1.), mk.b);',
      '     alb *= mix(vec3(1.), det, near);',
      '   }',
      '   alb *= 1. - .35 * cshade(vGp);',
      '   diffuseColor.rgb *= alb; }'].join('\n');
    const GROUND_N = [
      ' if (gWater > .001) { vec2 w = vGp * 2.3 + uFlow.xy * .35; float f = .12;',
      '   vec2 sl = vec2(mf(w + vec2(f, 0.)) - mf(w - vec2(f, 0.)), mf(w + vec2(0., f)) - mf(w - vec2(0., f))) / (2. * f) * 2.3 * .012 * (1. + 2. * uWind.z) * gWater;',
      '   normal = normalize((viewMatrix * vec4(normalize(vec3(-sl.x, 1., -sl.y)), 0.)).xyz); }'].join('\n');
    // how much light falls on open ground in the sun: the sun's, the sky's, and the sky's again as the ground reflects it
    const irr = () => { const c = key.color.clone().multiplyScalar(P.li * LIGHT.y).add(hemi.color.clone().multiplyScalar(hemi.intensity * IRR_SKY)); return new THREE.Vector3(c.r, c.g, c.b); };
    const IRR_SKY = 1.35;
    function groundMat(map, beyond) {
      const m = own(new THREE.MeshStandardMaterial({map, roughness: .96, metalness: 0, envMapIntensity: .35}));
      m.extensions = {derivatives: true};
      m.onBeforeCompile = sh => {
        groundU.uIrr.value.copy(irr());
        Object.assign(sh.uniforms, groundU, {uBeyond: {value: beyond ? 1 : 0}});
        sh.vertexShader = 'varying vec2 vGp; varying float vDepth;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vGp = (modelMatrix * vec4(position, 1.)).xz;')
          .replace('#include <project_vertex>', '#include <project_vertex>\n vDepth = -mvPosition.z;');
        sh.fragmentShader = 'varying vec2 vGp; varying float vDepth; uniform sampler2D uMask, uGrassD, uDirtD; uniform vec3 uIrr, uGrassM, uDirtM; uniform float uNear, uBeyond, uDetail; uniform vec2 uMap;\n' +
          AIR + CSH + UNFILM + sh.fragmentShader
          .replace('#include <map_fragment>', GROUND_FS)
          .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, .06, gWater);')
          .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + GROUND_N);
      };
      m.customProgramCacheKey = () => 'ranch-ground';
      return m;
    }
    // one piece of the painted map, 512 map pixels square; i counts across, then down
    function groundTile(i, map) {
      map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      const size = 512 * MPP, c = toW((i % 2) * 512 + 256, ((i / 2) | 0) * 512 + 256), p = new THREE.Mesh(new THREE.PlaneGeometry(size, size), groundMat(map, false));
      p.rotation.x = -PI / 2; p.position.set(c.x, 0, c.z); p.receiveShadow = true; scene.add(p); return p;
    }
    // the country beyond the map: the same turf, far off
    const beyond = (() => {
      const t = own(new THREE.DataTexture(new Uint8Array([111, 138, 62, 255]), 1, 1, THREE.RGBAFormat)); t.needsUpdate = true;
      const m = new THREE.Mesh(own(new THREE.PlaneGeometry(6000, 6000)), groundMat(t, true)); m.rotation.x = -PI / 2; m.position.y = -0.05; m.receiveShadow = true; scene.add(m); return m;
    })();

    // ---------- the grass: tufts that grow wherever you look ----------
    // Three rings of tufts round the spot you look at, finer near it and coarser further out. Each tuft stands on a point of a
    // grid fixed to the ground, so as you move the grass stays where it grew; how tall it is and which kind it is comes from
    // the point itself, and whether it grows at all from the painting (the picture above).
    const grassU = {uFocus: {value: new THREE.Vector2()}, uMask: {value: mask}, uPaint: {value: paint}, uPaintOK: {value: 0}, uGrow: {value: 0}, uMap: {value: new THREE.Vector2(MW, MH)}};
    const GRASS_ROOT = [
      'vec2 ci = floor((uCentre + aLat.xy) / aLat.z + .5); vec2 cell = ci * aLat.z;',
      'float h1 = fract(sin(dot(ci, vec2(12.9898, 78.233))) * 43758.5453), h2 = fract(sin(dot(ci, vec2(39.3468, 11.135))) * 24634.6345), h3 = fract(h1 * 113.7 + h2 * 7.3), h4 = fract(h2 * 71.9 + h1 * 3.1);',
      'vec2 p = cell + (vec2(h1, h2) - .5) * aLat.z; vec2 wq = p + (vec2(mn(p * 1.1), mn(p * 1.1 + 7.3)) - .5) * 1.6 + (vec2(mn(p * 4.3 + 2.), mn(p * 4.3 + 5.)) - .5) * .5; vec2 muv = wq / uMap + .5;',
      'vec4 mk = texture2D(uMask, muv); vec3 pc = pow(texture2D(uPaint, muv).rgb, vec3(2.2));',
      'float d = distance(p, uFocus), ring = smoothstep(uRing.x - uRing.w, uRing.x, d) * (1. - smoothstep(uRing.y - uRing.w, uRing.y, d));',
      'float dens = mk.r, inside = step(abs(muv.x - .5), .5) * step(abs(muv.y - .5), .5), keep = step(h3, dens * 1.1) * inside;',
      'float H = mix(.1, .5, h4 * h4) * (.45 + .55 * dens) * (1. - .6 * mk.g) * uGrow * ring * keep * sqrt(uRing.z);',
      'float Wd = (H * (.9 + .6 * h2) + .1 * step(.001, H)) * uRing.z * 1.3;',
      'float kind = h2 < .05 ? 2. : h2 < .14 ? 1. : h1 < .3 * (1. - dens) + .05 ? 3. : 0.;',
      'vUv.x = (kind + aCard.x + .5) * .25;',
      'vTint = mix(vec3(1.), clamp(pc / vec3(.06, .15, .035), vec3(.45), vec3(1.6)), .65 * uPaintOK);',
      'vec4 root = vec4(p, H, h1 * 1.2 - .6); vec2 card = vec2(aCard.x * Wd, aCard.y);'].join('\n');
    const GRASS_LEAN = ' { float lean = atan(max(uCam.y, 0.) / max(lc, .3)) * .6, yy = transformed.y; transformed.y = yy * cos(lean); transformed.xz -= toC * yy * sin(lean); }';
    const grassRings = [[-1, 13, .3, 3, 1, 3], [10, 32, .7, 2, 1.6, 3], [28, 78, 1.6, 1, 2.6, 6]].map(([r0, r1, s, segs, big, fw]) => {
      const Pp = [], UV = [], LAT = [], CARD = [], I = [], n = Math.ceil((r1 + s * 2) / s);
      for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) {
        const x = i * s, z = j * s, d = Math.hypot(x, z); if (d > r1 + s * 2 || d < r0 - fw - s * 2) continue;
        const b = Pp.length / 3;
        for (let k = 0; k <= segs; k++) for (const sd of [0, 1]) { const h = k / segs; Pp.push(x, h, z); UV.push(sd, h); LAT.push(x, z, s); CARD.push(sd - .5, h); }
        for (let k = 0; k < segs; k++) { const c = b + k * 2; I.push(c, c + 1, c + 2, c + 1, c + 3, c + 2); }
      }
      const g = own(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(Pp, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(Pp.length).map((v, i) => (i % 3 === 1 ? 1 : 0)), 3));
      g.setAttribute('aLat', new THREE.Float32BufferAttribute(LAT, 3)); g.setAttribute('aCard', new THREE.Float32BufferAttribute(CARD, 2)); g.setIndex(I);
      const u = Object.assign({uCentre: {value: new THREE.Vector2()}, uRing: {value: new THREE.Vector4(r0, r1, big, fw)}}, grassU);
      const m = K.grassMat({key: 'ranch', uniforms: u, root: GRASS_ROOT, post: GRASS_LEAN, head: 'attribute vec3 aLat; attribute vec2 aCard; uniform vec2 uCentre, uFocus, uMap; uniform vec4 uRing; uniform sampler2D uMask, uPaint; uniform float uGrow, uPaintOK; varying vec3 vTint;', fhead: 'varying vec3 vTint;', frag: ' diffuseColor.rgb *= vTint;'});
      const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.receiveShadow = true; mesh.renderOrder = 1; scene.add(mesh);
      return {mesh, s, u, tufts: Pp.length / 3 / ((segs + 1) * 2)};
    });

    // ---------- the trees ----------
    // Three kinds, each made once as a trunk with its limbs (tubes along their own frames) and a crown of leaf cards, in two
    // levels of detail: the full tree near the camera and a lighter one further off. Every painted tree is one of them,
    // stretched to the size the painting shows it, turned its own way and tinted with the painting's green.
    const leafTex = K.leafTex, barkTex = K.barkTex;
    function treeModel(kind, near) {
      const tP = [], tN = [], tU = [], tI = [], cP = [], cN = [], cU = [], cC = [], cI = [];
      const tube = (pts, rFn) => {
        const curve = new THREE.CatmullRomCurve3(pts), segs = near ? 7 : 3, rs = near ? 7 : 5, fr = curve.computeFrenetFrames(segs, false), Pt = V3(), D = V3(), b = tP.length / 3;
        for (let i = 0; i <= segs; i++) { const t = i / segs; curve.getPointAt(t, Pt); for (let j = 0; j <= rs; j++) { const th = j / rs * TAU, r = rFn(t); D.copy(fr.normals[i]).multiplyScalar(Math.cos(th)).addScaledVector(fr.binormals[i], Math.sin(th)); tP.push(Pt.x + D.x * r, Pt.y + D.y * r, Pt.z + D.z * r); tN.push(D.x, D.y, D.z); tU.push(j / rs, t * 2); } }
        for (let i = 0; i < segs; i++) for (let j = 0; j < rs; j++) { const a = b + i * (rs + 1) + j, c = a + rs + 1; tI.push(a, c, a + 1, a + 1, c, c + 1); }
      };
      const n = V3(), m2 = V3(), t1 = V3(), t2 = V3(), Pq = V3(), YUP = V3(0, 1, 0);
      const crown = (lobes, nLeaf, sz, half, flat, dark) => {
        const C = V3(); for (const L of lobes) C.add(V3(L[0], L[1], L[2])); C.divideScalar(lobes.length);
        lobes.forEach(L => {
          for (let i = 0; i < nLeaf; i++) {
            const u = rnd() * TAU, v = Math.acos(rr(-.6, 1)), dd = rr(.5, 1.05), s = rr(sz[0], sz[1]);
            n.set(Math.sin(v) * Math.cos(u), Math.cos(v), Math.sin(v) * Math.sin(u)); Pq.set(L[0] + n.x * L[3] * dd, L[1] + n.y * L[3] * flat * dd, L[2] + n.z * L[3] * dd);
            m2.subVectors(Pq, C).normalize().add(n).normalize();
            t1.crossVectors(n, YUP); if (t1.lengthSq() < 1e-3) t1.set(1, 0, 0); t1.normalize(); t2.crossVectors(n, t1).normalize();
            const ro = rnd() * TAU, ca = Math.cos(ro), sa = Math.sin(ro), e1 = t1.clone().multiplyScalar(ca).addScaledVector(t2, sa), e2 = t2.clone().multiplyScalar(ca).addScaledVector(t1, -sa), b = cP.length / 3;
            const tint = Math.pow(rr(.85, 1.1) * (.55 + .45 * (m2.y * .5 + .5)) * (.75 + .25 * dd), 1.4) * (dark || 1);
            for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { cP.push(Pq.x + (e1.x * sx + e2.x * sy) * s / 2, Pq.y + (e1.y * sx + e2.y * sy) * s / 2, Pq.z + (e1.z * sx + e2.z * sy) * s / 2); cN.push(m2.x, m2.y, m2.z); cU.push((half + sx * .5 + .5) * .5, sy * .5 + .5); cC.push(tint * rr(.9, 1.05), tint, tint * rr(.85, 1)); }
            cI.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
          }
        });
      };
      const N = near ? 1 : .4, SZ = near ? 1.1 : 1.7;
      let top;
      if (kind === 0) { // a post oak: a short trunk forking low into wide limbs, under a broad, rounded crown
        const H = .72, lx = rr(-.08, .08), lz = rr(-.08, .08), pts = [];
        for (let j = 0; j <= 4; j++) { const f = j / 4; pts.push(V3(lx * f + Math.sin(f * 3) * .03, -.05 + f * H, lz * f + Math.cos(f * 2.5) * .03)); }
        tube(pts, f => lerp(.085, .05, f) * (1 + .7 * Math.exp(-f * 9)));
        const fork = pts[4], lobes = [], a0 = rnd() * TAU;
        for (let b = 0; b <= 5; b++) {
          const lead = b === 5, ba = a0 + b / 5 * TAU + rr(-.4, .4), sp = lead ? rr(0, .15) : rr(.45, .72), up = lead ? rr(.75, .9) : rr(.3, .62);
          const e = V3(fork.x + Math.cos(ba) * sp, fork.y + up, fork.z + Math.sin(ba) * sp), p0 = pts[3].clone().lerp(fork, rr(.4, 1));
          if (near || lead || b < 3) tube([p0, V3(lerp(p0.x, e.x, .45), lerp(p0.y, e.y, .6) + .06, lerp(p0.z, e.z, .45)), e], f => lerp(lead ? .05 : .04, .012, f));
          lobes.push([e.x, e.y + .1, e.z, lead ? rr(.5, .6) : rr(.42, .55)]);
        }
        crown(lobes, Math.round(30 * N), [.34 * SZ, .5 * SZ], 0, .78); top = 2.3;
      } else if (kind === 1) { // an eastern red cedar: a straight trunk in a dense, dark cone
        tube([V3(0, -.05, 0), V3(.02, 1.2, 0), V3(0, 2.5, .01)], f => lerp(.07, .015, f));
        const lobes = []; for (let i = 0; i < 8; i++) { const y = .42 + i * .29; lobes.push([rr(-.04, .04), y, rr(-.04, .04), .95 * Math.pow(Math.max(0, 1 - (y - .35) / 2.55), .85) + .1]); }
        crown(lobes, Math.round(30 * N), [.3 * SZ, .46 * SZ], 1, .55, .7); top = 2.8;
      } else { // a taller round tree (a hackberry or an elm): a longer trunk, limbs reaching up, an oval crown
        const H = 1.0, pts = []; for (let j = 0; j <= 4; j++) { const f = j / 4; pts.push(V3(Math.sin(f * 2.4) * .04, -.05 + f * H, Math.cos(f * 2) * .03)); }
        tube(pts, f => lerp(.075, .045, f) * (1 + .6 * Math.exp(-f * 9)));
        const fork = pts[4], lobes = [], a0 = rnd() * TAU;
        for (let b = 0; b < 4; b++) {
          const ba = a0 + b / 4 * TAU + rr(-.3, .3), e = V3(fork.x + Math.cos(ba) * rr(.3, .5), fork.y + rr(.5, .8), fork.z + Math.sin(ba) * rr(.3, .5));
          if (near || b < 2) tube([pts[3].clone().lerp(fork, .7), V3(lerp(fork.x, e.x, .4), lerp(fork.y, e.y, .55), lerp(fork.z, e.z, .4)), e], f => lerp(.035, .01, f));
          lobes.push([e.x, e.y + .15, e.z, rr(.48, .6)]);
        }
        lobes.push([fork.x, fork.y + 1.05, fork.z, .55]);
        crown(lobes, Math.round(30 * N), [.34 * SZ, .5 * SZ], 0, .95); top = 2.75;
      }
      const mk = (Pa, Na, Ua, Ia, Ca) => { const g = own(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(Pa, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(Na, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(Ua, 2)); if (Ca) g.setAttribute('color', new THREE.Float32BufferAttribute(Ca, 3)); g.setIndex(Ia); return g; };
      return {trunk: mk(tP, tN, tU, tI), leaves: mk(cP, cN, cU, cI, cC), top, cards: cP.length / 12};
    }
    // the wind sways each tree from its root up, and the sun glows through the leaves when you look toward it
    const treeU = {uSunC: {value: P.lc}, uSunD: {value: LIGHT}};
    function sway(m, name, top) {
      m.onBeforeCompile = sh => {
        Object.assign(sh.uniforms, AIRU, treeU, {uTop: {value: top}});
        sh.vertexShader = AIR + 'uniform float uTop; varying vec3 vTw; varying float vTh;\n' + sh.vertexShader
          .replace('#include <begin_vertex>', '#include <begin_vertex>\n float th = clamp(position.y / uTop, 0., 1.); vTh = th;\n#ifdef USE_INSTANCING\n' +
            ' { vec2 rt = vec2(instanceMatrix[3].x, instanceMatrix[3].z); vec2 w = windAt(rt) * .55 + pushAt(rt) * .15; float s2 = max(dot(instanceMatrix[0].xyz, instanceMatrix[0].xyz), 1e-4);\n' +
            '   vec2 wo = vec2(dot(instanceMatrix[0].xz, w), dot(instanceMatrix[2].xz, w)) / s2;\n' +
            '   transformed.xz += wo * th * th * 1.4 + vec2(sin(uT * 2.1 + position.y * 3. + position.x * 5. + rt.x), cos(uT * 1.7 + position.z * 4. + rt.y)) * .011 * th * (.4 + uWind.z); }\n#endif')
          .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vec4 tw = vec4(transformed, 1.);\n#ifdef USE_INSTANCING\n tw = instanceMatrix * tw;\n#endif\n vTw = (modelMatrix * tw).xyz;');
        sh.fragmentShader = 'uniform vec3 uSunC, uSunD, uCam; varying vec3 vTw; varying float vTh;\n' + sh.fragmentShader
          .replace('#include <map_fragment>', '#include <map_fragment>' + (name === 'leaf' ? '\n diffuseColor.rgb /= max(texelColor.a, .3);' : ''))
          .replace('#include <alphatest_fragment>', '#include <alphatest_fragment>' + (name === 'leaf' ? A2C : ''))
          .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n float bl = pow(max(dot(normalize(vTw - uCam), normalize(uSunD)), 0.), 4.);\n totalEmissiveRadiance += diffuseColor.rgb * uSunC * bl * .35 * vTh;');
        sh.uniforms.uCam = AIRU.uCam;
      };
      m.customProgramCacheKey = () => 'ranch-tree-' + name;
      return m;
    }
    const barkM = own(new THREE.MeshLambertMaterial({map: barkTex, color: LINV(Array.isArray(P.bark) ? P.bark : [1, 1, 1])}));
    const leafDepth = own(new THREE.MeshDepthMaterial({depthPacking: THREE.RGBADepthPacking, map: leafTex, alphaTest: .45}));
    // the painted trees, each with its kind, size, turn and color (the color is the painting's, once it has loaded)
    const TREES = T.trees.map(([mx, my, r], i) => {
      const w = toW(mx, my), h = Math.sin(i * 12.9898 + mx * .0789) * 43758.5453 % 1, k = Math.abs(h);
      // a tree never stands in the pond: not where the trace has the pond, nor where the painting shows water (wet)
      const wet = !!pond && ((w.x - pond.x) / pond.rx) ** 2 + ((w.z - pond.z) / pond.ry) ** 2 < .95;
      return {x: w.x, z: w.z, r: r * MPP * .95, wet, seed: Math.abs(Math.sin(i * 7.31 + my) * 9973.1 % 1), kind: k < .55 ? 0 : k < .78 ? 2 : 1, hs: .9 + .25 * Math.abs(Math.sin(i * 3.7)), col: new THREE.Color(1, 1, 1), s: 0, v: 0, on: false, delay: 0};
    });
    const counts = [0, 0, 0]; TREES.forEach(t => counts[t.kind]++);
    const TK = [0, 1, 2].map(kind => [true, false].map(near => {
      const md = treeModel(kind, near), n = Math.max(1, counts[kind]);
      const trunk = new THREE.InstancedMesh(md.trunk, sway(barkM.clone(), 'bark', md.top), n), leafM = own(new THREE.MeshLambertMaterial({map: leafTex, alphaTest: .45, side: THREE.DoubleSide, vertexColors: true, color: LINV(Array.isArray(P.leaf) ? P.leaf : [1, 1, 1])}));
      if (GL2) leafM.alphaToCoverage = true;
      const leaves = new THREE.InstancedMesh(md.leaves, sway(leafM, 'leaf', md.top), n);
      leaves.setColorAt(0, new THREE.Color(1, 1, 1));
      for (const m of [trunk, leaves]) { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.count = 0; m.receiveShadow = true; m.castShadow = near; scene.add(m); }
      leaves.customDepthMaterial = leafDepth;
      return {trunk, leaves, n: 0, cards: md.cards};
    }));
    const trees = {
      list: TREES,
      begin() { for (const k of TK) for (const l of k) l.n = 0; },
      // a tree at k of its full size (it pops up out of the ground), drawn in full when the camera is within 45 m of it
      put(t, k, cam) {
        const L = TK[t.kind][Math.hypot(t.x - cam.x, t.z - cam.z) < 38 ? 0 : 1], i = L.n++;
        E.set(0, t.seed * TAU, 0); Q.setFromEuler(E); S3.set(t.r * k + 1e-4, t.r * t.hs * k + 1e-4, t.r * k + 1e-4); P3.set(t.x, 0, t.z); M4.compose(P3, Q, S3);
        L.trunk.setMatrixAt(i, M4); L.leaves.setMatrixAt(i, M4); L.leaves.setColorAt(i, t.col);
      },
      end() { for (const k of TK) for (const l of k) { l.trunk.count = l.leaves.count = l.n; l.trunk.instanceMatrix.needsUpdate = l.leaves.instanceMatrix.needsUpdate = true; if (l.leaves.instanceColor) l.leaves.instanceColor.needsUpdate = true; } },
      get drawn() { let n = 0; for (const k of TK) for (const l of k) n += l.n; return n; },
    };

    // ---------- what people built: corrugated metal, painted siding, weathered boards ----------
    // world-sized texture coordinates for a box, so a pattern keeps its size on every face (s metres to the texture)
    function worldUV(geo, s) {
      const p = geo.attributes.position, nr = geo.attributes.normal, uv = geo.attributes.uv;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ax = Math.abs(nr.getX(i)), ay = Math.abs(nr.getY(i)); uv.setXY(i, (ax > .5 ? z : x) / s, (ay > .5 ? z : y) / s); }
      uv.needsUpdate = true; return geo;
    }
    const metalC = (() => { // corrugated sheet metal: ridges down the slope, a few rust streaks and dirt
      const S = 256, c = cvs(S, S), g = c.getContext('2d');
      for (let x = 0; x < S; x++) { const v = .5 + .5 * Math.sin(x / S * TAU * 4), l = 150 + 70 * v; g.fillStyle = `rgb(${l},${l},${l})`; g.fillRect(x, 0, 1, S); }
      for (let i = 0; i < 18; i++) { const x = rnd() * S, w = rr(2, 9), y = rr(-40, S * .6), L = rr(40, 200), q = g.createLinearGradient(0, y, 0, y + L); q.addColorStop(0, 'rgba(150,80,40,.45)'); q.addColorStop(1, 'rgba(150,80,40,0)'); g.fillStyle = q; g.fillRect(x, y, w, L); }
      for (let i = 0; i < 40; i++) wrapDot(g, S, rnd() * S, rnd() * S, rr(10, 40), rnd() < .5 ? 'rgba(90,80,70,.18)' : 'rgba(130,90,60,.15)');
      return c;
    })();
    const metalTex = tx(metalC);
    const boardTex = (() => { // weathered boards and battens
      const S = 256, c = cvs(S, S), g = c.getContext('2d'); g.fillStyle = '#9a9086'; g.fillRect(0, 0, S, S);
      for (let b = 0; b < 4; b++) { const x0 = b * 64, v = rr(-18, 18); g.fillStyle = `rgb(${150 + v},${140 + v},${128 + v})`; g.fillRect(x0 + 2, 0, 60, S); for (let i = 0; i < 40; i++) { g.strokeStyle = rnd() < .5 ? 'rgba(60,50,40,.25)' : 'rgba(220,210,196,.18)'; g.lineWidth = rr(.5, 1.5); const x = x0 + rr(4, 60); g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + rr(-3, 3), S * .3, x + rr(-3, 3), S * .7, x + rr(-2, 2), S); g.stroke(); } if (rnd() < .6) { g.fillStyle = 'rgba(50,38,28,.5)'; g.beginPath(); g.ellipse(x0 + rr(15, 50), rr(20, 236), 4, 6, 0, 0, TAU); g.fill(); } g.fillStyle = 'rgba(30,24,18,.7)'; g.fillRect(x0, 0, 3, S); g.fillStyle = 'rgba(200,190,176,.5)'; g.fillRect(x0 + 3, 0, 2, S); }
      return tx(c);
    })();
    const sidingTex = (() => { // painted lap siding
      const S = 256, c = cvs(S, S), g = c.getContext('2d'); g.fillStyle = '#e8e2d4'; g.fillRect(0, 0, S, S);
      for (let y = 0; y < S; y += 32) { const q = g.createLinearGradient(0, y, 0, y + 32); q.addColorStop(0, 'rgba(60,50,40,.45)'); q.addColorStop(.12, 'rgba(60,50,40,.05)'); q.addColorStop(1, 'rgba(255,255,255,.08)'); g.fillStyle = q; g.fillRect(0, y, S, 32); }
      for (let i = 0; i < 40; i++) wrapDot(g, S, rnd() * S, rnd() * S, rr(8, 30), 'rgba(120,110,90,.12)');
      return tx(c);
    })();
    const hayC = (() => { // straw, the strands running one way
      const S = 256, c = cvs(S, S), g = c.getContext('2d'); g.fillStyle = '#b8995a'; g.fillRect(0, 0, S, S);
      for (let i = 0; i < 2600; i++) { const x = rnd() * S, y = rnd() * S, L = rr(10, 40), a = rr(-.25, .25); g.strokeStyle = ['#e3cb8e', '#9c7c45', '#c9ad6c', '#7d6538'][(rnd() * 4) | 0]; g.lineWidth = rr(.6, 1.8); for (const ox of [-S, 0, S]) { g.beginPath(); g.moveTo(x + ox, y); g.lineTo(x + ox + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke(); } }
      return c;
    })();
    const hayTex = tx(hayC);
    const hayEnd = (() => { // the end of a round bale: rolled up in a spiral
      const S = 256, c = cvs(S, S), g = c.getContext('2d'); g.fillStyle = '#a88a50'; g.fillRect(0, 0, S, S); g.drawImage(hayC, 0, 0);
      for (let r = 6; r < 128; r += 5) { g.strokeStyle = `rgba(${rnd() < .5 ? '90,70,36' : '230,206,150'},${rr(.25, .5)})`; g.lineWidth = rr(1.5, 3); g.beginPath(); g.arc(128, 128, r, 0, TAU); g.stroke(); }
      const t = tx(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
    })();
    const MAT = {};
    const std = (name, o) => MAT[name] || (MAT[name] = own(new THREE.MeshStandardMaterial(o)));
    const tinted = (t, hex, rep) => { const c = t.clone(); c.needsUpdate = true; if (rep) c.repeat.set(rep[0], rep[1]); own(c); return c; };
    const roofM = hex => std('roof' + hex, {map: metalTex, color: new THREE.Color(hex).convertSRGBToLinear().lerp(LIN('#9aa0a4'), .25), roughness: .42, metalness: .55, envMapIntensity: 1});
    const glassM = () => std('glass', {color: LIN('#1c2630'), roughness: .05, metalness: .1, envMapIntensity: 1.6});
    const trimM = () => std('trim', {color: LIN('#ece8de'), roughness: .7});
    const concreteM = () => std('concrete', {color: LIN('#6a6760'), map: gravelTex, roughness: .95});
    const woodM = () => std('wood', {map: boardTex, color: LIN('#8a7a68'), roughness: .9});
    const steelM = () => std('steel', {color: LIN('#a4abae'), roughness: .38, metalness: .8, envMapIntensity: 1});
    function building([name, mx, my, w, d, h, roofHex, kind], i) {
      const W = w * MPP * .9, D = d * MPP * .82, g = new THREE.Group(), wallH = h * .55, ridge = h - wallH, ov = .35;
      const metalWalls = kind === 'barn' || name === 'Workshop' || (kind === 'shed' && i % 2 === 1);
      const wallM = kind === 'house' ? std('siding', {map: sidingTex, color: LIN(i ? '#d9cdb8' : '#cfd6d2'), roughness: .8})
        : metalWalls ? std('metalwall', {map: metalTex, color: LIN('#9a9690'), roughness: .5, metalness: .45, envMapIntensity: .8})
          : kind === 'coop' ? std('coopwall', {map: boardTex, color: LIN('#b0786a'), roughness: .9}) : std('boards', {map: boardTex, color: LIN('#a8968a'), roughness: .92});
      const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x || 0, y || 0, z || 0); g.add(o); return o; };
      if (kind === 'house' || kind === 'barn') add(worldUV(new THREE.BoxGeometry(W + .4, .22, D + .4), 2.5), concreteM(), 0, .11, 0);
      if (kind !== 'haybarn') add(worldUV(new THREE.BoxGeometry(W, wallH, D), 1.2), wallM, 0, wallH / 2, 0);
      // the roof: two sheets of metal on a ridge, overhanging the walls, and the gables under them
      const along = Math.max(W, D), across = Math.min(W, D), roof = new THREE.Group(), half = across / 2 + ov, slope = Math.atan2(ridge, across / 2), L = half / Math.cos(slope);
      for (const s of [0, 1]) {
        const geo = worldUV(new THREE.BoxGeometry(along + ov * 2, .05, L), 1.2); geo.translate(0, 0, L / 2);
        const sheet = new THREE.Mesh(geo, roofM(roofHex)); sheet.rotation.x = slope; const holder = new THREE.Group(); holder.add(sheet); holder.rotation.y = s * PI; holder.position.y = wallH + ridge + .03; roof.add(holder);
      }
      { const cap = new THREE.Mesh(new THREE.BoxGeometry(along + ov * 2 + .02, .09, .32), roofM(roofHex)); cap.position.y = wallH + ridge + .06; roof.add(cap); }
      const tri = new THREE.Shape(); tri.moveTo(-across / 2, 0); tri.lineTo(across / 2, 0); tri.lineTo(0, ridge); tri.lineTo(-across / 2, 0);
      const gable = new THREE.ExtrudeGeometry(tri, {depth: along, bevelEnabled: false}); gable.translate(0, wallH, -along / 2); gable.rotateY(PI / 2);
      if (kind !== 'haybarn') { const gm = new THREE.Mesh(worldUV(gable, 1.2), wallM); roof.add(gm); }
      if (D > W) roof.rotation.y = PI / 2;
      g.add(roof);
      if (kind === 'haybarn') { // open sides: posts holding up the roof, and round bales stacked under it
        const pm = std('post', {map: boardTex, color: LIN('#6e5e50'), roughness: .9});
        for (const sx of [-1, 1]) for (let k = 0; k <= 3; k++) add(new THREE.BoxGeometry(.2, wallH, .2), pm, sx * (W / 2 - .1), wallH / 2, -D / 2 + .1 + k * (D - .2) / 3);
        const bm = [std('baleside', {map: hayTex, roughness: .95}), std('baleend', {map: hayEnd, roughness: .95}), std('baleend', {})];
        for (let k = 0; k < 7; k++) { const b = add(new THREE.CylinderGeometry(.8, .8, 1.3, 24), bm, -W * .3 + (k % 4) * 1.4 + (k > 3 ? .7 : 0), .8 + (k > 3 ? 1.35 : 0), -D * .1); b.rotation.x = PI / 2; }
      }
      // a door on the south side, facing the road (a big sliding one on the barn), and windows on the house
      const front = D / 2 + .02;
      if (kind === 'barn') { add(new THREE.BoxGeometry(W * .38, wallH * .86, .06), std('barndoor', {map: metalTex, color: LIN('#7a5a46'), roughness: .55, metalness: .35}), 0, wallH * .43, front); add(new THREE.BoxGeometry(W * .5, .12, .12), steelM(), 0, wallH * .9, front + .04); }
      else if (kind !== 'haybarn') {
        const dw = kind === 'coop' ? .7 : 1, dh = Math.min(2.1, wallH * .8);
        add(new THREE.BoxGeometry(dw + .16, dh + .1, .05), trimM(), 0, (dh + .1) / 2, front);
        add(new THREE.BoxGeometry(dw, dh, .07), kind === 'house' ? std('housedoor', {color: LIN('#5a3c2c'), roughness: .6}) : woodM(), 0, dh / 2, front + .01);
        if (kind === 'coop') { const ramp = add(new THREE.BoxGeometry(.5, .04, 1.2), woodM(), W * .25, .25, front + .5); ramp.rotation.x = .45; }
      }
      if (kind === 'house') {
        const win = (x, z, ry) => { const f = new THREE.Group(); f.position.set(x, wallH * .55, z); f.rotation.y = ry; g.add(f); f.add(new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.2, .06), trimM())); const gl = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.0, .07), glassM()); f.add(gl); f.add(new THREE.Mesh(new THREE.BoxGeometry(.05, 1.0, .08), trimM())); };
        for (const s of [-1, 1]) win(s * W * .28, front, 0);
        win(0, -D / 2 - .02, PI); win(W / 2 + .02, 0, PI / 2); win(-W / 2 - .02, 0, -PI / 2);
      }
      shadows(g);
      const pos = toW(mx, my + d * 0.18); g.position.set(pos.x, 0, pos.z);
      return {group: g, x: pos.x, z: pos.z, r: Math.max(W, D) * .55};
    }

    // ---------- fences ----------
    // barbed wire on cedar posts, board fences, and the pens of steel pipe; in stretches of about 40 m, each its own piece
    const cedarM = std('cedar', {map: barkTex, color: LIN('#a08a78'), roughness: 1});
    const wireM = own(new THREE.LineBasicMaterial({color: new THREE.Color(.03, .028, .026)}));
    function fence(f) {
      const pts = f.pts.map(([x, y]) => toW(x, y)), gap = f.kind === 'wire' ? 3.5 : f.kind === 'pen' ? 2.4 : 2.6, posts = [];
      for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], L = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.round(L / gap)); for (let k = 0; k < n; k++) posts.push({x: lerp(a.x, b.x, k / n), z: lerp(a.z, b.z, k / n)}); }
      posts.push({x: pts[pts.length - 1].x, z: pts[pts.length - 1].z});
      const out = [];
      for (let s = 0; s < posts.length - 1; s += 12) {
        const run = posts.slice(s, s + 13), g = new THREE.Group(), cx = run.reduce((a, p) => a + p.x, 0) / run.length, cz = run.reduce((a, p) => a + p.z, 0) / run.length;
        g.position.set(cx, 0, cz);
        if (f.kind === 'wire') {
          const geo = new THREE.CylinderGeometry(.05, .065, 1.4, 6); geo.translate(0, .7, 0);
          const pm = new THREE.InstancedMesh(geo, cedarM, run.length); run.forEach((p, i) => { E.set(rr(-.05, .05), rnd() * TAU, rr(-.05, .05)); Q.setFromEuler(E); M4.compose(P3.set(p.x - cx, -.05, p.z - cz), Q, S3.set(1, rr(.92, 1.05), 1)); pm.setMatrixAt(i, M4); }); g.add(pm);
          const wires = [];
          for (let i = 0; i < run.length - 1; i++) { const a = run[i], b = run[i + 1]; for (const y of [.45, .75, 1.02, 1.28]) for (let k = 0; k < 3; k++) { const u0 = k / 3, u1 = (k + 1) / 3, sag = u => Math.sin(u * PI) * .05; wires.push(lerp(a.x, b.x, u0) - cx, y - sag(u0), lerp(a.z, b.z, u0) - cz, lerp(a.x, b.x, u1) - cx, y - sag(u1), lerp(a.z, b.z, u1) - cz); } }
          const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wires, 3)); g.add(new THREE.LineSegments(wg, wireM));
        } else {
          const pen = f.kind === 'pen', H = pen ? 1.7 : 1.3, pgeo = pen ? new THREE.CylinderGeometry(.045, .045, H, 8) : new THREE.BoxGeometry(.14, H, .14); pgeo.translate(0, H / 2, 0);
          const mat = pen ? steelM() : woodM(), pm = new THREE.InstancedMesh(pgeo, mat, run.length);
          run.forEach((p, i) => { M4.makeTranslation(p.x - cx, 0, p.z - cz); pm.setMatrixAt(i, M4); }); g.add(pm);
          const rails = pen ? [.35, .65, .95, 1.25, 1.55] : [.4, .8, 1.15], rgeo = pen ? new THREE.CylinderGeometry(.024, .024, 1, 6).rotateX(PI / 2) : new THREE.BoxGeometry(.03, .15, 1);
          const rm = new THREE.InstancedMesh(rgeo, mat, Math.max(1, (run.length - 1) * rails.length)); let ri = 0;
          for (let i = 0; i < run.length - 1; i++) { const a = run[i], b = run[i + 1], L = Math.hypot(b.x - a.x, b.z - a.z); for (const y of rails) { E.set(0, Math.atan2(b.x - a.x, b.z - a.z), 0); Q.setFromEuler(E); P3.set((a.x + b.x) / 2 - cx, y, (a.z + b.z) / 2 - cz); S3.set(1, 1, L); M4.compose(P3, Q, S3); rm.setMatrixAt(ri++, M4); } }
          rm.count = ri; g.add(rm);
        }
        shadows(g); out.push({group: g, x: cx, z: cz});
      }
      return out;
    }

    // ---------- the railroad: steel rails on wooden ties, on a bed of gravel ----------
    function railroad() {
      const out = [], tieGeo = new THREE.BoxGeometry(2.6, .16, .24), railGeo = new THREE.BoxGeometry(.08, .15, 1);
      const tieM = std('tie', {map: boardTex, color: LIN('#5a4a3e'), roughness: .95}), railM = std('rail', {color: LIN('#7a6e66'), roughness: .35, metalness: .85, envMapIntensity: 1});
      const bedM = std('bed', {map: gravelTex, color: LIN('#c8c0b4'), roughness: 1});
      for (let i = 0; i < RAIL.length - 1; i++) {
        const a = RAIL[i], b = RAIL[i + 1], L = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.round(L / 36)), ang = Math.atan2(b.x - a.x, b.z - a.z);
        for (let k = 0; k < n; k++) {
          const u0 = k / n, u1 = (k + 1) / n, cx = lerp(a.x, b.x, (u0 + u1) / 2), cz = lerp(a.z, b.z, (u0 + u1) / 2), len = L / n, g = new THREE.Group();
          g.position.set(cx, 0, cz); g.rotation.y = ang;
          const sh = new THREE.Shape(); sh.moveTo(-2.3, 0); sh.lineTo(2.3, 0); sh.lineTo(1.55, .38); sh.lineTo(-1.55, .38); sh.lineTo(-2.3, 0);
          const bed = new THREE.ExtrudeGeometry(sh, {depth: len + .05, bevelEnabled: false}); bed.translate(0, -.02, -len / 2);
          g.add(new THREE.Mesh(worldUV(bed, 2.5), bedM));
          const nt = Math.round(len / .6), ties = new THREE.InstancedMesh(tieGeo, tieM, nt);
          for (let t = 0; t < nt; t++) { M4.makeTranslation(rr(-.04, .04), .42, -len / 2 + (t + .5) * len / nt); ties.setMatrixAt(t, M4); } g.add(ties);
          for (const s of [-1, 1]) { const r = new THREE.Mesh(railGeo, railM); r.scale.z = len + .02; r.position.set(s * .72, .575, 0); g.add(r); }
          shadows(g); out.push({group: g, x: cx, z: cz});
        }
      }
      return out;
    }

    // ---------- the day's work: the hay ring, the stock tanks and the salt ----------
    // the hay ring: a galvanized ring feeder with a round bale stood on end in it, and loose straw all round
    const strawGeo = new THREE.BoxGeometry(.006, .004, .22), strawM = std('straw', {roughness: .9, envMapIntensity: .4});
    function straw(n, r0, r1, sx, sz) {
      const im = new THREE.InstancedMesh(strawGeo, strawM, n), c = new THREE.Color();
      for (let i = 0; i < n; i++) { const a = rnd() * TAU, d = r0 + Math.pow(rnd(), 1.6) * (r1 - r0); E.set(rr(-.15, .15), rnd() * TAU, rr(-.15, .15)); Q.setFromEuler(E); M4.compose(P3.set(Math.sin(a) * d * (sx || 1), .006 + rnd() * .012, Math.cos(a) * d * (sz || 1)), Q, S3.set(1, 1, rr(.6, 1.5))); im.setMatrixAt(i, M4); im.setColorAt(i, c.copy(LIN(['#e3cb8e', '#c9ad6c', '#b0935a'][(rnd() * 3) | 0]))); }
      im.receiveShadow = true; return im;
    }
    function hayRing() {
      const g = new THREE.Group(), steel = std('galv', {color: LIN('#b2b8b8'), roughness: .45, metalness: .75, envMapIntensity: 1});
      for (const y of [.5, 1.12]) { const r = new THREE.Mesh(new THREE.TorusGeometry(1.25, .035, 8, 40), steel); r.rotation.x = PI / 2; r.position.y = y; g.add(r); }
      for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, b = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, 1.15, 6), steel); b.position.set(Math.cos(a) * 1.25, .6, Math.sin(a) * 1.25); b.rotation.z = (i % 2 ? .38 : -.38) * Math.cos(a + PI / 2); b.rotation.x = (i % 2 ? .38 : -.38) * Math.sin(a + PI / 2); g.add(b); }
      for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + .3, p = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1.15, 6), steel); p.position.set(Math.cos(a) * 1.25, .57, Math.sin(a) * 1.25); g.add(p); }
      const bale = new THREE.Mesh(new THREE.CylinderGeometry(.82, .85, 1.3, 32), [std('baleside2', {map: tinted(hayTex, 0, [3, 1]), roughness: .95}), std('baleend', {map: hayEnd, roughness: .95}), std('baleend', {})]);
      bale.position.y = .65; bale.visible = false; g.add(bale);
      g.add(straw(900, .9, 3.2));
      shadows(g); return {group: g, bale};
    }
    // a round galvanized stock tank, its water lifting as it fills
    const ribTex = (() => { const S = 128, c = cvs(S, S), g2 = c.getContext('2d'); for (let y = 0; y < S; y++) { const v = 170 + 50 * Math.sin(y / S * TAU * 6); g2.fillStyle = `rgb(${v},${v},${v})`; g2.fillRect(0, y, S, 1); } for (let i = 0; i < 60; i++) wrapDot(g2, S, rnd() * S, rnd() * S, rr(6, 20), 'rgba(120,120,110,.2)'); return tx(c); })();
    const waterM = std('water', {color: LIN('#2b3a38'), roughness: .04, metalness: 0, transparent: true, opacity: .88, envMapIntensity: 1.3});
    function trough() {
      const g = new THREE.Group(), tankM = std('tank', {map: ribTex, color: LIN('#c4cbcc'), roughness: .38, metalness: .8, side: THREE.DoubleSide, envMapIntensity: 1});
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(.95, .95, .62, 40, 1, true), tankM); tank.position.y = .31; g.add(tank);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(.95, .03, 8, 48), tankM); rim.rotation.x = PI / 2; rim.position.y = .62; g.add(rim);
      const floor = new THREE.Mesh(new THREE.CircleGeometry(.94, 32), std('tankfloor', {color: LIN('#5e6866'), roughness: .6, metalness: .5})); floor.rotation.x = -PI / 2; floor.position.y = .05; g.add(floor);
      const water = new THREE.Mesh(new THREE.CircleGeometry(.93, 32), waterM); water.rotation.x = -PI / 2; water.position.y = .12; g.add(water);
      shadows(g); water.castShadow = false; return {group: g, water};
    }
    function salt() {
      const g = new THREE.Group(), post = new THREE.Mesh(new THREE.CylinderGeometry(.16, .18, .5, 10), cedarM); post.position.y = .25; g.add(post);
      const blk = new THREE.Mesh(new THREE.BoxGeometry(.28, .24, .28), std('salt', {color: LIN('#ead8d2'), roughness: .85})); blk.position.y = .62; g.add(blk);
      shadows(g); return {group: g, block: blk};
    }

    // ---------- the chickens: soft cartoons, like the cattle ----------
    const soft = hex => std('chick' + hex, {color: LIN(hex), roughness: .72, envMapIntensity: .5});
    function chicken(hen) {
      const g = new THREE.Group(), b = new THREE.Group(); g.add(b); b.position.y = .22;
      const body = hen ? '#a8643a' : '#f4efe4', ball = (x, y, z) => { const s = new THREE.SphereGeometry(1, 18, 14); s.scale(x, y, z); return s; };
      const P_ = (geo, c, p) => { const m = new THREE.Mesh(geo, soft(c)); b.add(m); if (p) m.position.set(p[0], p[1], p[2]); return m; };
      P_(ball(.11, .1, .15), body); P_(ball(.05, .12, .08), hen ? '#7a4426' : '#e8e0d0', [0, .07, -.13]).rotation.x = .5;
      for (const s of [-1, 1]) P_(ball(.025, .06, .1), hen ? '#8a4e2c' : '#ebe4d6', [s * .1, .01, -.01]);
      const head = new THREE.Group(); head.position.set(0, .13, .11); b.add(head);
      head.add(new THREE.Mesh(ball(.05, .055, .055), soft(body)));
      const comb = new THREE.Mesh(ball(.012, .03, .035), soft('#d0281e')); comb.position.set(0, .055, .005); head.add(comb);
      const wattle = new THREE.Mesh(ball(.01, .02, .012), soft('#d0281e')); wattle.position.set(0, -.04, .04); head.add(wattle);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(.014, .04, 8), soft('#e6b23a')); beak.rotation.x = PI / 2; beak.position.set(0, -.005, .06); head.add(beak);
      for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.009, 8, 6), std('eye', {color: LIN('#101010'), roughness: .15})); e.position.set(s * .036, .012, .035); head.add(e); }
      const legs = [-1, 1].map(s => { const l = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, .13, 6), soft('#e0a43a')); l.position.set(.035 * s, -.16, 0); b.add(l); return l; });
      shadows(g);
      return {root: g, body: b, head, legs};
    }

    // ---------- the painting's colors, once its pieces have loaded ----------
    // images: the six pieces, across then down. A page opened straight from a file can't read its own pictures back; then
    // the land keeps what the trace says.
    // a square of a map piece (in its own pixels), blended with itself shifted by half so it repeats without a seam
    function patch(img, sx, sy, S) {
      const N = 256, a = cvs(N, N), ga = a.getContext('2d'); ga.drawImage(img, sx, sy, S, S, 0, 0, N, N);
      const b = cvs(N, N), gb = b.getContext('2d'); for (const ox of [-N / 2, N / 2]) for (const oy of [-N / 2, N / 2]) gb.drawImage(a, ox, oy);
      const A = ga.getImageData(0, 0, N, N), B = gb.getImageData(0, 0, N, N).data, o = A.data, sum = [0, 0, 0];
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const e = Math.min(x, N - 1 - x, y, N - 1 - y) / (N * .3), w = e >= 1 ? 1 : e * e * (3 - 2 * e), i = (y * N + x) * 4;
        for (let k = 0; k < 3; k++) { o[i + k] = o[i + k] * w + B[i + k] * (1 - w); sum[k] += Math.pow(o[i + k] / 255, 2.2); }
      }
      ga.putImageData(A, 0, 0);
      return {tex: tx(a, true), mean: new THREE.Vector3(sum[0], sum[1], sum[2]).divideScalar(N * N)};
    }
    function setPaint(images) {
      try {
        const c = cvs(GW, GH), g = c.getContext('2d');
        for (let i = 0; i < 6; i++) if (images[i]) g.drawImage(images[i], (i % 2) * GW / 2, ((i / 2) | 0) * GH / 3, GW / 2, GH / 3);
        paintPx = g.getImageData(0, 0, GW, GH).data;
      } catch (e) { return false; }
      paintG.putImageData(new ImageData(new Uint8ClampedArray(paintPx), GW, GH), 0, 0); paint.needsUpdate = true; grassU.uPaintOK.value = 1;
      // the painting's own grass (an open field past the railroad, top right) and dirt (the farmyard, with hoof marks)
      try {
        const g = patch(images[1], 752, 32, 192), d = patch(images[4], 704, 1216, 256);
        groundU.uGrassD.value = g.tex; groundU.uGrassM.value.copy(g.mean); groundU.uDirtD.value = d.tex; groundU.uDirtM.value.copy(d.mean); groundU.uDetail.value = 1;
      } catch (e) { /* keep the painting plain */ }
      classify();
      // each tree takes the green under it, a little brighter, so it stands out from the painted ground
      const col = new THREE.Color();
      for (const t of TREES) {
        const mx = cl(Math.round((t.x / MW + .5) * GW), 0, GW - 1), my = cl(Math.round((t.z / MH + .5) * GH), 0, GH - 1);
        if (maskData[(my * GW + mx) * 4 + 2] > 100) t.wet = true;
        const x = cl(Math.round((t.x / MW + .5) * GW), 0, GW - 1), y = cl(Math.round((t.z / MH + .5) * GH), 0, GH - 1), k = (y * GW + x) * 4;
        col.setRGB(paintPx[k] / 255, paintPx[k + 1] / 255, paintPx[k + 2] / 255).convertSRGBToLinear();
        const l = Math.max(.01, (col.r + col.g + col.b) / 3);
        t.col.setRGB(cl(col.r / l * .32 + .68, .6, 1.3), cl(col.g / l * .32 + .68, .6, 1.3), cl(col.b / l * .32 + .68, .5, 1.3)).multiplyScalar(cl(.75 + l * 3, .8, 1.25));
      }
      return true;
    }

    // ---------- each frame ----------
    // focus: where you are looking (x, z), d: how far off the camera is, follow: the animal you are following (or null)
    const _f = V3();
    let shadowS = 0;
    function update(dt, t, camera, focus, d, follow) {
      K.update(dt, t, camera.position);
      // the sun's light follows where you look, its shadow covering about what you can see (snapped to its pixels, so the
      // shadows don't shimmer as you move)
      const S = cl(d * .85, 9, 70); if (Math.abs(S - shadowS) > shadowS * .1) { shadowS = S; Object.assign(key.shadow.camera, {left: -S, right: S, top: S, bottom: -S}); key.shadow.camera.updateProjectionMatrix(); }
      const px = 2 * shadowS / key.shadow.mapSize.x, fx = Math.round(focus.x / px) * px, fz = Math.round(focus.z / px) * px;
      key.target.position.set(fx, 0, fz); key.position.set(fx, 0, fz).addScaledVector(LIGHT, 220);
      const dx = camera.position.x - fx, dz = camera.position.z - fz, c = Math.cos(.9), s = Math.sin(.9); fill.target.position.set(fx, 0, fz); fill.position.set(fx + dx * c - dz * s, 30, fz + dx * s + dz * c);
      // the grass grows in round where you look, as you come down to it
      const grow = 1 - sm(16, 32, d); grassU.uGrow.value = grow; grassU.uFocus.value.set(focus.x, focus.z);
      for (const R of grassRings) { R.mesh.visible = grow > .01 && !R.off; R.u.uCentre.value.set(Math.round(focus.x / R.s) * R.s, Math.round(focus.z / R.s) * R.s); }
      groundU.uNear.value = 1 - sm(90, 260, d);
      fog.near = 70 + d * 1.6; fog.far = 480 + d * 4.5;
      // the animal you are following pushes the grass aside
      if (follow) { const p = follow.root.position, h = follow.root.rotation.y, sc = follow.root.scale.x, fx2 = Math.sin(h), fz2 = Math.cos(h), down = /lie|sleep|lying/.test(follow.state) ? 1 : 0; AIRU.uBodyA.value.set(p.x + fx2 * .75 * sc, p.z + fz2 * .75 * sc, (down ? .85 : .5) * sc, down ? 1.3 : .9); AIRU.uBodyB.value.set(p.x - fx2 * .85 * sc, p.z - fz2 * .85 * sc); }
      else AIRU.uBodyA.value.w = 0;
    }
    function render(camera, dt, focusDist) {
      if (cinema) { cinema.set({focus: Math.max(.5, focusDist), aperture: P.aperture * cl(12 / focusDist, .1, .8)}); cinema.render(scene, camera, dt); }
      else { renderer.setRenderTarget(null); renderer.render(scene, camera); }
    }
    // what the shiny things reflect: this sky and a ring of trees, drawn once
    {
      const ring = new THREE.Group(), md = treeModel(0, false), lm = new THREE.MeshBasicMaterial({map: leafTex, alphaTest: .45, side: THREE.DoubleSide, color: UNF('#4a6a36')});
      for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, m = new THREE.Mesh(md.leaves, lm); m.position.set(Math.sin(a) * 120, -4, Math.cos(a) * 120); m.scale.setScalar(rr(12, 18)); ring.add(m); }
      K.env(scene, [ring], '#6c7048'); lm.dispose();
    }

    return {
      kit: K, key, cinema, toW, groundTile, beyond, trees, building, fence, railroad, hayRing, trough, salt, chicken, setPaint, update, render, mask, paint,
      dust: UNF(P.dust),
      stats: () => ({tufts: grassRings.map(r => r.tufts), cards: TK.map(k => k.map(l => l.cards)), trees: trees.drawn}),
      // for a phone that can't keep up: the film camera at three quarters of the screen's resolution, and no far ring of grass
      lighter() { if (cinema) cinema.set({scale: .75}); grassRings[2].mesh.visible = false; grassRings[2].off = true; },
      get mapDetail() { return groundU.uDetail.value > 0; },
      get grassGrows() { return grassU.uGrow.value; }, get painted() { return grassU.uPaintOK.value > 0; }, 
      dispose() { K.dispose(); if (cinema) cinema.dispose(); },
    };
  }
  root.makeRanchLand = makeRanchLand;
})(typeof window !== 'undefined' ? window : globalThis);
